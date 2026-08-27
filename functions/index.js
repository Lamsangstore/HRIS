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
