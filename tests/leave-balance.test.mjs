// โควตาการลา: สิทธิ์ / ใช้ไป / คงเหลือ (js/lib/leave-balance.js)
//
// บั๊กที่เคยเกิด (หน้า "ประวัติการลา (ทีม)" การ์ดไม่ตรงกับรายการใบลา):
// 1) การ์ดอ่านตัวนับ usedHours ใน Firestore ซึ่งพลาดไปแล้ว — ลากิจอนุมัติแล้ว 1 วัน
//    แต่การ์ดบอก "ใช้ 0 วัน"
// 2) ชม./วัน เปลี่ยนจาก 7 → 8 — ลาเต็มวัน 2 ครั้งขึ้นเป็น "ใช้ 1 วัน 7 ชม."
//    สิทธิ์ลากิจ 3 วันขึ้นเป็น "2 วัน 5 ชม." และใบเต็มวันขึ้นเป็น "7 ชม."
import {
    QUOTA_TYPES, leaveDays, leaveHoursNow, usedHoursByType, quotaFor, usedHoursDoc, rescaleQuotaDoc,
} from '../js/lib/leave-balance.js';
import { balanceToDisplay, hoursToDisplay, requestHours, countLeaveWorkDays } from '../js/lib/leave-hours.js';
import { makeChecker } from './extract.mjs';

globalThis._publicHolidays = [];

const check = makeChecker();
const S8 = { workDays: [1,2,3,4,5], workStart: '09:00', workEnd: '17:00', breakStart: '12:00', breakMinutes: 0 };  // 8 ชม./วัน
const S7 = { ...S8, breakMinutes: 60 };                                                                              // 7 ชม./วัน

// ── 1. ใช้ไป = ใบที่อนุมัติแล้ว ไม่ใช่ตัวนับใน Firestore ───────────────────────
{
    const S = { workDays: [1,2,3,4,5], workStart: '08:00', workEnd: '17:00', breakStart: '12:00', breakMinutes: 60 };
    const reqs = [
        { type: 'personal', status: 'approved', isHourly: false, startDate: '2026-11-19', endDate: '2026-11-19', totalHours: 8 },
        { type: 'vacation', status: 'approved', isHourly: true,  startDate: '2026-07-17', endDate: '2026-07-17', startTime: '08:00', endTime: '12:00', totalHours: 4 },
        { type: 'vacation', status: 'rejected', isHourly: false, startDate: '2026-08-03', endDate: '2026-08-03', totalHours: 8 },
        { type: 'sick',     status: 'pending',  isHourly: false, startDate: '2026-12-01', endDate: '2026-12-01', totalHours: 8 },
        { type: 'sick',     status: 'cancelled',isHourly: false, startDate: '2026-12-02', endDate: '2026-12-02', totalHours: 8 },
    ];
    const bal = { personal: { totalHours: 48, usedHours: 0 }, vacation: { totalHours: 128, usedHours: 4 } };  // ตัวนับลากิจพลาด
    const used = usedHoursByType(reqs, S);
    const q = quotaFor('personal', bal, used, S);
    check('ลากิจอนุมัติแล้ว 1 วัน แม้ตัวนับใน Firestore เป็น 0 → ใช้ 1 วัน', balanceToDisplay(q.used, S), '1 วัน 0 ชม.');
    check('ลากิจ 6 วัน ใช้ 1 → เหลือ 5 วัน', balanceToDisplay(q.rem, S), '5 วัน 0 ชม.');
    check('ไม่นับใบที่ไม่อนุมัติ/รออนุมัติ/ยกเลิก', [used.vacation, used.sick], [4, undefined]);
    check('ยังโหลดใบลาไม่ได้ (usedMap = null) → ใช้ตัวนับใน Firestore ไปก่อน',
          quotaFor('vacation', bal, null, S).used, 4);
    check('admin ยังไม่ตั้งสิทธิ์ → ค่า default ของบริษัท × ชม./วัน', quotaFor('sick', {}, {}, S).max, 240);
}

// ── 2. ชม./วัน เปลี่ยน 7 → 8 กลางปี ───────────────────────────────────────────
{
    // ใบเต็มวันที่ลาตอนวันละ 7 ชม. (ยังไม่มี hoursPerDay) + ใบเต็มวันหลังเปลี่ยนเป็น 8 ชม.
    const old  = { type: 'personal', status: 'approved', isHourly: false, startDate: '2026-06-17', endDate: '2026-06-17', startTime: '09:00', endTime: '17:00', totalHours: 7 };
    const late = { type: 'personal', status: 'approved', isHourly: false, startDate: '2026-11-27', endDate: '2026-11-27', startTime: '09:00', endTime: '17:00', totalHours: 8 };
    const hrly = { type: 'vacation', status: 'approved', isHourly: true,  startDate: '2026-08-04', endDate: '2026-08-04', startTime: '12:00', endTime: '15:00', totalHours: 3 };

    check('ใบเต็มวันที่ลาตอน 7 ชม./วัน ยังเป็น 1 วัน', leaveDays(old, S8), 1);
    check('…แสดงเป็น "1 วัน" ไม่ใช่ "7 ชม."', hoursToDisplay(leaveHoursNow(old, S8), S8), '1 วัน');
    check('ใบรายชั่วโมงรุ่นเก่าแสดงชั่วโมงจริง', hoursToDisplay(leaveHoursNow(hrly, S8), S8), '3 ชม.');

    const used = usedHoursByType([old, late, hrly], S8);
    check('ลาเต็มวัน 2 ครั้ง → ใช้ 2 วัน (ไม่ใช่ 1 วัน 7 ชม.)', balanceToDisplay(used.personal, S8), '2 วัน 0 ชม.');

    // สิทธิ์ลากิจ 3 วัน ตั้งไว้ตอน 7 ชม./วัน = 21 ชม. → เปลี่ยนตารางเป็น 8 ชม./วัน
    const bal = { personal: { totalHours: 21, usedHours: 15 }, maternity: { totalHours: 686 } };
    const re = rescaleQuotaDoc(bal, 7, 8);
    check('เปลี่ยน ชม./วัน → ปรับโควตาให้วันเท่าเดิม', re, { personal: { totalHours: 24 }, maternity: { totalHours: 784 } });
    const after = { personal: { ...bal.personal, ...re.personal } };
    const q = quotaFor('personal', after, used, S8);
    check('สิทธิ์ 3 วัน ใช้ 2 → เหลือ 1 วัน',
          [balanceToDisplay(q.max, S8), balanceToDisplay(q.used, S8), balanceToDisplay(q.rem, S8)],
          ['3 วัน 0 ชม.', '2 วัน 0 ชม.', '1 วัน 0 ชม.']);
    check('ชม./วัน เท่าเดิม → ไม่ต้องปรับ', rescaleQuotaDoc(bal, 8, 8), null);
    check('ยังไม่มีโควตาตั้งไว้ → ไม่ต้องปรับ', rescaleQuotaDoc({}, 7, 8), null);

    // ใบที่บันทึก hoursPerDay ไว้: ครึ่งวันตอน 8 ชม. ยังเป็นครึ่งวันหลังตารางเปลี่ยนเป็น 7
    const half = { type: 'sick', status: 'approved', isHourly: true, startDate: '2026-12-01', endDate: '2026-12-01', startTime: '09:00', endTime: '13:00', totalHours: 4, hoursPerDay: 8 };
    check('ใบที่มี hoursPerDay ใช้ ชม./วัน ของตอนนั้น', leaveDays(half, S7), 0.5);
}

// ── 3. ใบเต็มวัน: นับวันทำงาน + ใช้เวลาเข้า–ออกงานจริง ────────────────────────
{
    const S = { workDays: [1,2,3,4,5], workStart: '08:30', workEnd: '17:30', breakStart: '12:00', breakMinutes: 60 };
    check('ศ.–จ. = 2 วันทำงาน', countLeaveWorkDays('2026-07-17', '2026-07-20', S), 2);
    // หน้ายื่นลาเคยปัด 17:30 → 17:00 ใบเต็มวันเลยได้ 7.5 ชม. ทั้งที่ ชม./วัน = 8
    const r = { isHourly: false, startDate: '2026-07-17', endDate: '2026-07-17', startTime: '08:00', endTime: '17:00' };
    check('ใบเต็มวันไม่ใช้เวลาที่ถูกปัดในใบ → 8 ชม. เต็มวัน', requestHours(r, S), 8);
    check('ใบรายชั่วโมงยังใช้เวลาในใบ',
          requestHours({ isHourly: true, startDate: '2026-07-17', endDate: '2026-07-17', startTime: '08:30', endTime: '12:00' }, S), 3.5);
    check('ใบเต็มวันรุ่นเก่าที่ถูกปัดเหลือ 7.5 ชม. ยังนับเป็น 1 วัน',
          hoursToDisplay(leaveHoursNow({ ...r, status: 'approved', totalHours: 7.5 }, S), S), '1 วัน');
}

// ── 4. ตัวนับใน Firestore เขียนทับทุกประเภท ──────────────────────────────────
{
    const S = { workDays: [1,2,3,4,5], workStart: '08:00', workEnd: '17:00', breakMinutes: 60 };
    const doc = usedHoursDoc([{ type: 'maternity', status: 'approved', isHourly: false, startDate: '2026-07-20', endDate: '2026-07-21', totalHours: 16 }], S);
    check('เขียนครบทุกประเภท ประเภทที่ไม่ได้ใช้เป็น 0', Object.keys(doc), QUOTA_TYPES);
    check('ลาคลอด 2 วัน = 16 ชม.', [doc.maternity.usedHours, doc.sick.usedHours], [16, 0]);
}

check.done('โควตาการลา');
