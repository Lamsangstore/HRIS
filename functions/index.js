// ============================================================================
// Cloud Functions — ยิง LINE แทนเบราว์เซอร์พนักงาน
// ============================================================================
// ทำไมต้องมีไฟล์นี้: เดิมเบราว์เซอร์พนักงานยิง LINE เองผ่าน CORS proxy ฟรี
// (corsproxy.io) ซึ่งพังไปเมื่อเขาเลิกรองรับ URL แบบไม่มี API key
// → ทุกการแจ้งเตือนตายพร้อมกันด้วย 403 "keyless_legacy_url"
//
// ที่แย่กว่าคือแบบเดิม token ต้องอยู่ในเครื่องพนักงาน (อ่านจาก Firestore)
// และถูกส่งผ่านเซิร์ฟเวอร์ของคนอื่นทุกครั้งที่ส่งข้อความ
// ตอนนี้ token อยู่ใน Secret Manager ฝั่งเซิร์ฟเวอร์ เบราว์เซอร์ไม่เห็นแล้ว
//
// deploy:  firebase deploy --only functions --project hris-21093
// ตั้ง token: firebase functions:secrets:set LINE_TOKEN --project hris-21093
// ============================================================================
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const LINE_TOKEN = defineSecret('LINE_TOKEN');
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

// ต้องตรงกับ APP_ID ใน app.html
const APP_ID = 'bizhris-phichit';

initializeApp();
const db = getFirestore();

/** artifacts/{APP_ID}/public/data/{name} */
const col = name =>
    db.collection('artifacts').doc(APP_ID)
      .collection('public').doc('data')
      .collection(name);

// ผู้เรียกต้องเป็นพนักงานจริง (มี user doc และยังไม่ลาออก)
// แค่ "ล็อกอินแล้ว" ไม่พอ — Email/Password provider เปิดอยู่ คนนอกสมัครเองได้
// (เหตุผลเดียวกับ isStaff() ใน firestore.rules)
async function assertStaff(uid) {
    const snap = await col('users').doc(uid).get();
    if (!snap.exists || snap.data().status === 'resigned') {
        throw new HttpsError('permission-denied', 'ไม่ใช่พนักงานที่ยังทำงานอยู่');
    }
}

// ปลายทางต้องเป็น LINE ID ของพนักงานในระบบ
// ไม่งั้นใครที่ล็อกอินได้ก็ยิงข้อความในนาม LINE OA ของบริษัทไปหาใครก็ได้
// แอดมินเท่านั้น — ฟังก์ชันรีเซ็ตรหัสผ่านตั้งรหัสของคนอื่นได้
// ถ้าปล่อยให้พนักงานทั่วไปเรียกได้ ก็แปลว่าใครก็ยึดบัญชีใครก็ได้
async function assertAdmin(uid) {
    const snap = await col('users').doc(uid).get();
    const me = snap.exists ? snap.data() : null;
    if (!me || me.status === 'resigned' || me.role !== 'admin') {
        throw new HttpsError('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้น');
    }
}

// รหัสชั่วคราวหลังแอดมินรีเซ็ต — ค่าคงที่ตัวเดียวทั้งบริษัท (ตามที่ตกลงไว้)
// แอดมินจะได้บอกพนักงานทางโทรศัพท์ได้โดยไม่ต้องอ่านรหัสสุ่มทีละตัว
//
// ที่แลกไป: ใครก็ตามที่รู้ค่านี้ (= พนักงานทุกคนที่เคยถูกรีเซ็ต) ถ้าชิงล็อกอิน
// ก่อนเจ้าตัวในช่วงระหว่าง "แอดมินกดรีเซ็ต" ถึง "พนักงานล็อกอิน" ก็เข้าบัญชีเขาได้
// สิ่งที่ปิดช่องนี้ให้แคบที่สุดคือ mustChangePassword — พอเจ้าตัวล็อกอินแล้ว
// รหัสนี้ใช้ไม่ได้อีก จึงควรรีเซ็ตตอนที่พนักงานพร้อมล็อกอินทันที ไม่ใช่รีเซ็ตทิ้งไว้ล่วงหน้า
//
// ถ้าเปลี่ยนค่านี้ ต้องแก้ RESET_PASSWORD ใน app.html ด้วย (ฝั่งนั้นกันไม่ให้
// พนักงานตั้งรหัสใหม่เป็นตัวเดิม ซึ่งจะทำให้การบังคับเปลี่ยนไร้ความหมาย)
const RESET_PASSWORD = 'Lamsang2024';

async function assertKnownRecipient(lineId) {
    for (const name of ['directory', 'users']) {
        const hit = await col(name).where('lineId', '==', lineId).limit(1).get();
        if (!hit.empty) return;
    }
    throw new HttpsError('permission-denied', 'ปลายทางไม่ใช่ LINE ID ของพนักงานในระบบ');
}

export const sendLine = onCall(
    { region: 'asia-southeast1', secrets: [LINE_TOKEN], maxInstances: 10 },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'ต้องล็อกอินก่อน');

        const to = typeof req.data?.to === 'string' ? req.data.to.trim() : '';
        const messages = req.data?.messages;
        if (!to) throw new HttpsError('invalid-argument', 'ไม่มี LINE User ID');
        // LINE รับได้สูงสุด 5 ข้อความต่อครั้ง
        if (!Array.isArray(messages) || messages.length < 1 || messages.length > 5) {
            throw new HttpsError('invalid-argument', 'messages ต้องเป็น array 1–5 รายการ');
        }

        await assertStaff(req.auth.uid);
        await assertKnownRecipient(to);

        const res = await fetch(LINE_PUSH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_TOKEN.value(),
            },
            body: JSON.stringify({ to, messages }),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            // ส่งข้อความจาก LINE กลับไปให้หน้าเว็บแสดง — ไม่งั้นแอดมินเห็นแค่ "internal"
            // แล้วไล่เหตุไม่ได้ (token หมดอายุ / ผู้ใช้บล็อก OA / โควตาหมด ต่างกันคนละเรื่อง)
            throw new HttpsError('internal', `LINE API error ${res.status}: ${text.slice(0, 200)}`);
        }
        return { ok: true };
    },
);

// ============================================================================
// รีเซ็ตรหัสผ่านพนักงาน (แอดมินเท่านั้น)
// ============================================================================
// พนักงานลืมรหัสแล้วแอดมินช่วยไม่ได้ เพราะ Firebase client SDK ตั้งรหัสได้แต่
// ของ "ตัวเอง" เท่านั้น — ต้องใช้ Admin SDK ฝั่งเซิร์ฟเวอร์ถึงจะตั้งให้คนอื่นได้
//
// ทำสามอย่างในคราวเดียว ขาดอันไหนก็ยังมีช่องโหว่:
//   1. ตั้งรหัสชั่วคราวแบบสุ่ม (ไม่ใช่ 123456 ที่ทุกคนเดาได้)
//   2. เตะ session เดิมทิ้ง — ไม่งั้นเครื่องที่ค้างล็อกอินไว้ยังใช้ต่อได้
//   3. ตั้ง mustChangePassword → app.html บังคับตั้งรหัสใหม่ทันทีที่ล็อกอิน
//      รหัสชั่วคราวจึงใช้ได้ครั้งเดียว และแอดมินไม่รู้รหัสจริงของพนักงาน
export const resetEmployeePassword = onCall(
    { region: 'asia-southeast1', maxInstances: 5 },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'ต้องล็อกอินก่อน');
        await assertAdmin(req.auth.uid);

        const uid = typeof req.data?.uid === 'string' ? req.data.uid.trim() : '';
        if (!uid) throw new HttpsError('invalid-argument', 'ไม่มี uid ของพนักงาน');

        // รีเซ็ตของตัวเองจะเตะ session ตัวเองทิ้งกลางคัน และไม่มีประโยชน์ —
        // คนที่ล็อกอินอยู่เปลี่ยนรหัสเองได้จากหน้าโปรไฟล์
        if (uid === req.auth.uid) {
            throw new HttpsError('invalid-argument', 'เปลี่ยนรหัสของตัวเองที่หน้าโปรไฟล์');
        }

        // ต้องเป็นพนักงานใน HRIS นี้ ไม่ใช่ uid อะไรก็ได้ใน Firebase project
        // ไม่ใช้ code 'not-found' ที่นี่ — callable ที่ยังไม่ได้ deploy ก็คืน
        // functions/not-found เหมือนกัน หน้าเว็บจะแยกสองเรื่องนี้ไม่ออก
        const snap = await col('users').doc(uid).get();
        if (!snap.exists) throw new HttpsError('failed-precondition', 'ไม่พบพนักงานคนนี้ในระบบ');

        const tempPassword = RESET_PASSWORD;
        try {
            await getAuth().updateUser(uid, { password: tempPassword });
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                throw new HttpsError('failed-precondition', 'พนักงานคนนี้ยังไม่มีบัญชีล็อกอิน (หรือถูกลบไปแล้ว)');
            }
            throw new HttpsError('internal', e.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
        }

        // เครื่องที่ยังค้างล็อกอินอยู่ต้องหลุด ไม่งั้นการรีเซ็ตแทบไม่มีความหมาย
        // (ID token ตัวปัจจุบันมีอายุได้อีกไม่เกิน 1 ชม. แล้ว refresh ไม่ผ่าน)
        await getAuth().revokeRefreshTokens(uid);

        await col('users').doc(uid).update({
            mustChangePassword: true,
            passwordResetAt: new Date().toISOString(),
            passwordResetBy: req.auth.uid,
        });

        return { ok: true, tempPassword, email: snap.data().email || '' };
    },
);

// ============================================================================
// แก้อีเมลพนักงาน (แอดมินเท่านั้น)
// ============================================================================
// เคยมีเคสจริง: แอดมินแก้อีเมลในหน้า HRIS แล้ว Firestore เปลี่ยน แต่ Firebase Auth
// ไม่เปลี่ยน → พนักงานยังต้องล็อกอินด้วยอีเมลเก่าที่ไม่มีใครรู้แล้ว ส่วนหน้าจอโชว์
// อีเมลใหม่ ไล่เหตุไม่ถูกเลย
//
// รากของปัญหาคืออีเมลถูกเก็บสองที่ และหน้าเว็บเขียนได้แค่ที่เดียว
// ต่อจากนี้ "แหล่งจริง" คือ Firebase Auth — ฟอร์มแก้ไขพนักงานไม่เขียน email
// ลง Firestore อีกแล้ว มีแต่ทางนี้ทางเดียวที่เปลี่ยนได้ และเปลี่ยนพร้อมกันทั้งสองที่
export const updateEmployeeEmail = onCall(
    { region: 'asia-southeast1', maxInstances: 5 },
    async (req) => {
        if (!req.auth) throw new HttpsError('unauthenticated', 'ต้องล็อกอินก่อน');
        await assertAdmin(req.auth.uid);

        const uid = typeof req.data?.uid === 'string' ? req.data.uid.trim() : '';
        // Firebase Auth เก็บอีเมลเป็นตัวพิมพ์เล็กอยู่แล้ว — lowercase ตั้งแต่ตรงนี้
        // ไม่งั้น Firestore จะเก็บ "Somchai@..." ส่วน Auth เก็บ "somchai@..." แล้วดูเหมือนไม่ตรงกันอีก
        const email = typeof req.data?.email === 'string' ? req.data.email.trim().toLowerCase() : '';
        if (!uid) throw new HttpsError('invalid-argument', 'ไม่มี uid ของพนักงาน');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new HttpsError('invalid-argument', 'รูปแบบอีเมลไม่ถูกต้อง');
        }

        const snap = await col('users').doc(uid).get();
        if (!snap.exists) throw new HttpsError('failed-precondition', 'ไม่พบพนักงานคนนี้ในระบบ');

        // อีเมลที่ Auth ถืออยู่จริง — อาจไม่ตรงกับที่ Firestore เก็บ (เคสที่ว่า)
        // ส่งกลับไปให้แอดมินเห็นว่าของเดิมคืออะไร จะได้รู้ว่าเคยหลุดสองทางไหม
        let previousEmail = '';
        try {
            previousEmail = (await getAuth().getUser(uid)).email || '';
        } catch (e) {
            if (e.code === 'auth/user-not-found') {
                throw new HttpsError('failed-precondition', 'พนักงานคนนี้ยังไม่มีบัญชีล็อกอิน (หรือถูกลบไปแล้ว)');
            }
            throw new HttpsError('internal', e.message || 'อ่านบัญชีล็อกอินไม่สำเร็จ');
        }

        try {
            await getAuth().updateUser(uid, { email });
        } catch (e) {
            if (e.code === 'auth/email-already-exists') {
                throw new HttpsError('already-exists', 'อีเมลนี้ถูกใช้กับบัญชีอื่นแล้ว');
            }
            if (e.code === 'auth/invalid-email') {
                throw new HttpsError('invalid-argument', 'รูปแบบอีเมลไม่ถูกต้อง');
            }
            throw new HttpsError('internal', e.message || 'เปลี่ยนอีเมลไม่สำเร็จ');
        }

        // Auth สำเร็จแล้วค่อยเขียน Firestore — ลำดับนี้สำคัญ
        // ถ้าเขียน Firestore ก่อนแล้ว Auth พัง จะได้สองที่ไม่ตรงกันแบบเดิมอีก
        await col('users').doc(uid).update({
            email,
            emailChangedAt: new Date().toISOString(),
            emailChangedBy: req.auth.uid,
        });

        return { ok: true, email, previousEmail };
    },
);
