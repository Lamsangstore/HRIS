// เช็คเชิงโครงสร้าง — จับความผิดพลาดที่เคยหลุดมาแล้ว
// รันเร็ว ไม่ต้องต่อ Firebase
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { src, makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const check = makeChecker();

// ── 1. ห้ามมี secret ฝังในโค้ด ────────────────────────────────────────────────
// เคยมี LINE channel access token hardcode อยู่ในไฟล์นี้ และ repo เป็น public
check('ไม่มี LINE channel access token ฝังในโค้ด',
      /const\s+LINE_TOKEN\s*=\s*['"][A-Za-z0-9+/=]{40,}/.test(src), false);
check('ไม่มี Bearer token ยาวๆ เขียนตรงๆ',
      /Bearer\s+[A-Za-z0-9+/=]{40,}/.test(src), false);

// ── 2. ทุกหน้าของ admin/manager ต้องมี role guard ─────────────────────────────
// router อ่านหน้าจาก location.hash ตรงๆ ไม่เช็ค role
// => เมนูซ่อนไม่พอ พิมพ์ #executive บน URL ก็เข้าได้ ต้องมี guard ใน init
// เคยพัง: ot-approve กับ executive ไม่มี guard พนักงานเข้าไปกดอนุมัติ OT ให้ตัวเองได้
const GUARDED_PAGES = [
    'ot-approve', 'executive', 'add-employee', 'payroll', 'payslip-admin',
    'leave-admin', 'shift-admin', 'branch-locations', 'time-import', 'holidays',
];
for (const page of GUARDED_PAGES) {
    // หา key ของหน้า → หา init ที่อยู่ถัดจากนั้น (ข้าม template html ที่ยาวมาก)
    // → guard ต้องอยู่ต้นๆ ของ init ไม่ใช่หลังจากอ่านข้อมูลไปแล้ว
    const keys = [`PAGES['${page}']`, `'${page}': {`, `"${page}": {`];
    const at = keys.map(k => src.indexOf(k)).filter(i => i >= 0).sort((a, b) => a - b)[0];
    if (at == null) { check(`หาหน้า ${page} ไม่เจอ (เปลี่ยนชื่อ?)`, 'not-found', 'found'); continue; }

    const initAt = src.slice(at).search(/\binit(?:\s*:\s*(?:async\s*)?\(|\s*\(user)/);
    if (initAt < 0) { check(`หา init ของหน้า ${page} ไม่เจอ`, 'not-found', 'found'); continue; }

    const head = src.slice(at + initAt, at + initAt + 700);   // ต้นๆ ของ init เท่านั้น
    const hasGuard = /profile\.role\s*!==?\s*['"](admin|manager)['"]/.test(head)
                  && /navigateTo\(['"]home['"]\)/.test(head);
    check(`หน้า ${page} มี role guard ต้น init`, hasGuard, true);
}

// ── 3. โค้ดฝั่งพนักงานต้อง query แคบ ไม่ใช่ดึงทั้ง collection ──────────────────
// rules ไม่ใช่ตัวกรอง — อ่านทั้ง collection แล้วมีสักแถวที่ไม่มีสิทธิ์ = ถูกปฏิเสธทั้งคำขอ
check('หน้า time ไม่ดึง time_logs ทั้ง collection',
      /onSnapshot\(collection\(db, 'artifacts', appId, 'public', 'data', 'time_logs'\)/.test(src), false);
check('หน้า my-review ไม่ดึง reviews ทั้ง collection',
      /const snap = await getDocs\(col\('reviews'\)\);\s*\n\s*const myReviews/.test(src), false);

// ── 4. directory ต้องไม่มีข้อมูลอ่อนไหว ───────────────────────────────────────
// directory เปิดให้พนักงานทุกคนอ่าน (ใช้หา lineId หัวหน้าตอนส่งแจ้งเตือน)
// ถ้ามีใครเผลอใส่เงินเดือน/เลขบัตร ปชช. ลงไป = รั่วให้ทั้งบริษัทอ่าน
{
    const s = src.indexOf('const directoryDocFrom');
    check('มีตัวสร้าง directory doc อยู่', s >= 0, true);
    if (s >= 0) {
        const body = src.slice(s, src.indexOf('});', s));
        const LEAKY = ['baseSalary', 'salary', 'idCard', 'bankAccount', 'bankName',
                       'dob', 'address', 'phone', 'taxCustomAmount', 'otherDeducts', 'commRate'];
        check('directory ไม่มีข้อมูลอ่อนไหว', LEAKY.filter(f => body.includes(f)), []);
    }
    // แจ้งเตือนต้องอ่านจาก directory ไม่ใช่ users
    check('ตัวหาหัวหน้าส่ง LINE อ่านจาก directory',
          /getManagerLineTargets[\s\S]{0,400}'directory'/.test(src), true);
}

// ── 5. ห้ามกลับไปอ่าน users ทั้ง collection จากฝั่งพนักงาน ─────────────────────
// เคยพัง: notifyManagers* อ่าน users ทั้งก้อนเพื่อหา lineId หัวหน้า
// ทำให้ต้องเปิด users ให้พนักงานอ่าน = เงินเดือน/เลขบัตรทุกคนหลุด
check('ไม่มีการอ่าน users ทั้ง collection ด้วย APP_ID (โค้ด global ที่พนักงานเรียกได้)',
      /getDocs\(collection\(db, 'artifacts', APP_ID, 'public', 'data', 'users'\)\)/.test(src), false);

// ── 6. import ในหน้า html ต้องชี้ไปไฟล์ที่มีอยู่จริง ───────────────────────────
// ไม่มี build step — พิมพ์ path ผิด = หน้าขาวทั้งแอป และ node --check จับไม่ได้
// เพราะมันเช็คแค่ syntax ไม่ได้ resolve import
{
    const paths = [...src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map(m => m[1]);
    check('มี import ไฟล์ในเครื่องอยู่จริง', paths.length > 0, true);
    const missing = paths.filter(p => !existsSync(join(ROOT, p)));
    check('ทุก import path ชี้ไปไฟล์ที่มีอยู่', missing, []);
}

// ── 7. โควตาวันลาต้องมาจากที่เดียว ────────────────────────────────────────────
// เคยพัง: การ์ดโควตาอ่านจาก myBalance (สิทธิ์จริงของพนักงานคนนี้) แต่ปุ่มเลือกประเภทลา
// ใน modal อ่าน LEAVE_TYPES.maxDays (ค่า default ในโค้ด) พอ admin แก้สิทธิ์ให้ใคร
// เป็นพิเศษ สองที่ขึ้นไม่ตรงกัน (การ์ดบอกสิทธิ์ 15 วัน modal บอก 10 วัน/ปี)
check('หน้าลามีตัวคำนวณโควตากลาง myQuotaFor', /function myQuotaFor\(/.test(src), true);

// LEAVE_TYPES.maxDays เป็นแค่ค่า default ของบริษัท ไม่ใช่สิทธิ์จริงของพนักงานคนไหน
// สิทธิ์จริงอยู่ที่ leave_balances/{uid}.<type>.totalHours ซึ่ง admin แก้รายคนได้
// => ทุกที่ที่เอา maxDays มาใช้ ต้องเช็ค totalHours ก่อนเสมอ
// ต้องมองทั้งก่อนและหลัง เพราะมีสองรูปแบบที่ถูกต้อง:
//   อ่าน  → `b.totalHours != null ? b.totalHours : (maxDays * hpd)`  (totalHours อยู่ก่อน)
//   สร้าง → `setDoc(..., { totalHours: defaultTotal })`              (totalHours อยู่หลัง)
{
    const uses = [...src.matchAll(/maxDays\s*\*\s*hpd/g)];
    check('มีการใช้ maxDays เป็นค่า default อยู่', uses.length > 0, true);
    const noCheck = uses
        .filter(m => !src.slice(Math.max(0, m.index - 160), m.index + 160).includes('totalHours'))
        .map(m => src.slice(m.index - 60, m.index + 20).trim().split('\n').pop());
    check('ทุกจุดที่ใช้ maxDays อ้างอิงสิทธิ์จริง (totalHours) ด้วย', noCheck, []);
}

// เคสที่พังจริง: ปุ่มเลือกประเภทลาแสดง "10 วัน/ปี" จากค่า default
// ทั้งที่พนักงานคนนั้นมีสิทธิ์จริง 15 วัน — การ์ดกับ modal เลยขึ้นไม่ตรงกัน
check('ปุ่มเลือกประเภทลาไม่แสดงสิทธิ์จากค่า default ตรงๆ',
      /\$\{t\.maxDays\}\s*วัน\/ปี/.test(src), false);

// ── 8. ไฟล์ rules ต้องมีอยู่และปิดท้ายด้วย deny-all ────────────────────────────
const RULES = join(ROOT, 'firestore.rules');
check('มีไฟล์ firestore.rules อยู่ใน repo', existsSync(RULES), true);
if (existsSync(RULES)) {
    const rules = readFileSync(RULES, 'utf8');
    check('rules ปิดท้ายด้วย deny-all', /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/.test(rules), true);
    check('rules ไม่เปิดให้ใครก็ได้ที่ล็อกอินอ่าน users',
          /match \/users\/\{uid\}[\s\S]{0,200}allow read: if isStaff\(\);/.test(rules), false);
}

check.done('โครงสร้าง & ความปลอดภัย');
