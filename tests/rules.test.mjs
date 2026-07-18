// ทดสอบ firestore.rules ด้วย emulator — รันด้วย `npm run test:rules`
//
// ต้องทดสอบด้วยสิทธิ์ "พนักงานธรรมดา" เท่านั้นถึงจะเจอช่องโหว่จริง
// ตอนทดสอบด้วยบัญชี admin ทุกอย่างผ่านหมดเพราะ isManager() คืน true
// — เกือบสรุปว่า rules ปลอดภัยแล้วทั้งที่ยังโหว่อยู่
//
// ต้องมี Java: brew install openjdk
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'bizhris-phichit';
const P = (...seg) => ['artifacts', APP, 'public', 'data', ...seg].join('/');

const env = await initializeTestEnvironment({
    projectId: 'hris-rules-test',
    firestore: { rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
});

const EMP = 'emp_uid', MGR = 'mgr_uid', ADMIN = 'admin_uid', OTHER = 'other_uid';

// เตรียมข้อมูลโดยข้าม rules
await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, P('users', EMP)),   { uid: EMP,   role: 'employee', status: 'active', name: 'พนักงาน', baseSalary: 15000, mustChangePassword: true });
    await setDoc(doc(db, P('users', MGR)),   { uid: MGR,   role: 'manager',  status: 'active', name: 'หัวหน้า' });
    await setDoc(doc(db, P('users', ADMIN)), { uid: ADMIN, role: 'admin',    status: 'active', name: 'แอดมิน' });
    await setDoc(doc(db, P('users', OTHER)), { uid: OTHER, role: 'employee', status: 'active', name: 'คนอื่น', baseSalary: 99000 });
    await setDoc(doc(db, P('leave_balances', EMP)), { vacation: { totalHours: 120, usedHours: 8 }, sick: { totalHours: 240, usedHours: 0 } });
    await setDoc(doc(db, P('payroll_records', 'r1')), { uid: OTHER, netPay: 99999 });
});

const asEmp   = env.authenticatedContext(EMP).firestore();
const asOther = env.authenticatedContext(OTHER).firestore();
const asMgr   = env.authenticatedContext(MGR).firestore();
const outsider = env.authenticatedContext('stranger_who_signed_up').firestore();

const check = makeChecker();
const ok   = async (name, p) => { try { await assertSucceeds(p); check(name, 'อนุญาต', 'อนุญาต'); } catch { check(name, 'ถูกปฏิเสธ', 'อนุญาต'); } };
const deny = async (name, p) => { try { await assertFails(p);    check(name, 'ถูกบล็อก', 'ถูกบล็อก'); } catch { check(name, '🔴 ผ่านได้', 'ถูกบล็อก'); } };

// ── โควตาวันลา: ช่องโหว่ที่เจอตอน code review ────────────────────────────────
await deny('พนักงานแก้โควตา (totalHours) ตัวเองไม่ได้',
    updateDoc(doc(asEmp, P('leave_balances', EMP)), { 'vacation.totalHours': 99999 }));
await deny('พนักงานเขียนทับทั้ง doc เพื่อเปลี่ยนโควตาไม่ได้',
    setDoc(doc(asEmp, P('leave_balances', EMP)), { vacation: { totalHours: 99999, usedHours: 0 } }));
await ok('พนักงานคืน usedHours ตอนยกเลิกใบลาได้ (โค้ดจริงต้องใช้)',
    updateDoc(doc(asEmp, P('leave_balances', EMP)), { 'vacation.usedHours': 0 }));
await deny('พนักงานแก้โควตาคนอื่นไม่ได้',
    updateDoc(doc(asOther, P('leave_balances', EMP)), { 'vacation.usedHours': 0 }));
await ok('หัวหน้าแก้โควตาได้ (ตอนอนุมัติลา)',
    updateDoc(doc(asMgr, P('leave_balances', EMP)), { 'vacation.totalHours': 128 }));

// ── บังคับเปลี่ยนรหัสครั้งแรก ────────────────────────────────────────────────
await deny('พนักงานปลด mustChangePassword เฉยๆ ไม่ได้',
    updateDoc(doc(asEmp, P('users', EMP)), { mustChangePassword: false }));
await ok('ปลดได้เมื่อเขียนคู่กับ passwordChangedAt (หลังเปลี่ยนรหัสจริง)',
    updateDoc(doc(asEmp, P('users', EMP)), { mustChangePassword: false, passwordChangedAt: '2026-07-18T00:00:00Z' }));

// ── ข้อมูลส่วนตัว/เงินเดือน ──────────────────────────────────────────────────
await deny('พนักงานอ่านโปรไฟล์คนอื่น (มีเงินเดือน) ไม่ได้', getDoc(doc(asEmp, P('users', OTHER))));
await ok('พนักงานอ่านโปรไฟล์ตัวเองได้', getDoc(doc(asEmp, P('users', EMP))));
await deny('พนักงานแก้เงินเดือนตัวเองไม่ได้', updateDoc(doc(asEmp, P('users', EMP)), { baseSalary: 999999 }));
await deny('พนักงานเลื่อนตัวเองเป็น admin ไม่ได้', updateDoc(doc(asEmp, P('users', EMP)), { role: 'admin' }));
await ok('พนักงานแก้เบอร์โทรตัวเองได้', updateDoc(doc(asEmp, P('users', EMP)), { phone: '0812345678' }));
await deny('พนักงานอ่านสลิปเงินเดือนคนอื่นไม่ได้', getDoc(doc(asEmp, P('payroll_records', 'r1'))));

// ── คนนอกที่สมัครบัญชีเองเข้ามา ──────────────────────────────────────────────
await deny('คนนอก (ไม่มี user doc) อ่านโปรไฟล์พนักงานไม่ได้', getDoc(doc(outsider, P('users', EMP))));
await deny('คนนอกอ่านเงินเดือนไม่ได้', getDoc(doc(outsider, P('payroll_records', 'r1'))));
await deny('คนนอกอ่าน LINE token ไม่ได้', getDoc(doc(outsider, P('app_config', 'line'))));

check.done('Firestore rules');
await env.cleanup();
process.exit(process.exitCode || 0);
