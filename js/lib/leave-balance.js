// โควตาการลา: สิทธิ์ / ใช้ไป / คงเหลือ — ทุกหน้าที่แสดงโควตาต้องคิดผ่านไฟล์นี้
//
// เคยพัง 2 เรื่อง (หน้า "ประวัติการลา (ทีม)" การ์ดโควตาไม่ตรงกับรายการใบลาข้างล่าง):
//
// 1) "ใช้ไป" อ่านจาก leave_balances.usedHours ซึ่งเป็นตัวนับที่ +/- เอาตอนอนุมัติ/ยกเลิก
//    แต่รายการอ่านจาก leave_requests ตัวนับพลาดครั้งเดียว (อนุมัติแล้วอัปเดตตัวนับ
//    ไม่สำเร็จ, ยกเลิกลาคลอดแล้วไม่คืนสิทธิ์, สองคนกดอนุมัติพร้อมกัน ฯลฯ) ก็เพี้ยนตลอดไป
//    — ใบลากิจที่อนุมัติแล้ว 1 วัน แต่การ์ดบอก "ใช้ 0 วัน"
//    → "ใช้ไป" คิดจากใบลาที่อนุมัติแล้วเสมอ ตัวนับใน Firestore เป็นแค่สำเนา
//      (เขียนทับด้วย usedHoursDoc ทุกครั้งที่อนุมัติ/ยกเลิก)
//
// 2) ชม./วัน ของพนักงานเปลี่ยนกลางปี (เช่น 7 → 8 เพราะ admin เอาเวลาพักออก)
//    ใบลาเต็มวันที่ลาตอน 7 ชม./วัน เก็บไว้ 7 ชม. พอหารด้วย 8 เลยขึ้น "7 ชม." แทน "1 วัน"
//    ลาเต็มวัน 2 ครั้งกลายเป็น "ใช้ 1 วัน 7 ชม."
//    → นับใบลาเป็น "วัน" ด้วย ชม./วัน ของตอนที่ลา (leaveDays) แล้วค่อยแปลงกลับเป็น
//      ชั่วโมงตามตารางปัจจุบัน ส่วนโควตา (totalHours) ต้องปรับตามเมื่อ ชม./วัน เปลี่ยน
//      (rescaleQuotaDoc) เพื่อให้จำนวน "วัน" เท่าเดิม
//
// ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด (ยกเว้นอ่านวันหยุดผ่าน countLeaveWorkDays)
// ไม่แตะ Firestore ไม่แตะ DOM — ดู tests/leave-balance.test.mjs

import { getLeaveTypeInfo } from './leave-types.js?v=20261127a';
import { getDayWorkHours, countLeaveWorkDays } from './leave-hours.js?v=20261127a';

/** ประเภทลาที่มีโควตา (อื่นๆ ไม่นับ) */
export const QUOTA_TYPES = ['sick', 'personal', 'vacation', 'maternity', 'ordain', 'military'];

const round2 = x => Math.round(x * 100) / 100;

/** ชม./วัน ของตาราง — ไม่มีตาราง = 8 (ตรงกับ splitDaysHours) */
export function hoursPerDayOf(schedule) {
    return schedule ? getDayWorkHours(schedule) : 8;
}

/**
 * ใบลานี้คิดเป็นกี่ "วัน"
 *  - ใบที่บันทึก hoursPerDay ไว้ (ยื่น/อนุมัติหลังแก้บั๊กนี้) → ชม. ÷ ชม./วัน ของตอนนั้น
 *  - ใบเต็มวันรุ่นเก่า → นับวันทำงานในช่วงที่ลา (ไม่ต้องรู้ว่าตอนนั้นวันละกี่ ชม.)
 *  - ใบรายชั่วโมงรุ่นเก่า → ชม. ÷ ชม./วัน ปัจจุบัน (ไม่มีข้อมูลตอนนั้นให้ใช้)
 */
export function leaveDays(req, schedule) {
    const h = Number(req?.totalHours) || 0;
    if (!(h > 0)) return 0;
    if (req.hoursPerDay > 0) return h / req.hoursPerDay;
    if (req.isHourly === false && req.startDate && req.endDate && schedule) {
        const n = countLeaveWorkDays(req.startDate, req.endDate, schedule);
        if (n > 0) return n;
    }
    return h / hoursPerDayOf(schedule);
}

/** ระยะเวลาของใบลา เป็นชั่วโมงตามตารางปัจจุบัน — ใช้แสดงผลคู่กับ hoursToDisplay */
export function leaveHoursNow(req, schedule) {
    return round2(leaveDays(req, schedule) * hoursPerDayOf(schedule));
}

/**
 * ชั่วโมงที่ใช้ไปแยกตามประเภท (ตามตารางปัจจุบัน) จากใบลาที่ "อนุมัติแล้ว" เท่านั้น
 * requests ต้องเป็นของพนักงานคนเดียวกับ schedule
 */
export function usedHoursByType(requests, schedule) {
    const days = {};
    for (const r of requests || []) {
        if (r.status !== 'approved' || !r.type) continue;
        days[r.type] = (days[r.type] || 0) + leaveDays(r, schedule);
    }
    const hpd = hoursPerDayOf(schedule);
    const out = {};
    for (const [t, d] of Object.entries(days)) out[t] = round2(d * hpd);
    return out;
}

/**
 * สิทธิ์ / ใช้ไป / คงเหลือ (ชั่วโมง) ของประเภทลาหนึ่ง
 * balance = เอกสาร leave_balances/{uid} (ใช้แค่ totalHours)
 * usedMap = ผลของ usedHoursByType — ส่ง null ถ้าโหลดใบลาไม่สำเร็จ จะใช้ตัวนับใน
 *           Firestore แทน (ดีกว่าโชว์ว่ายังไม่ได้ใช้เลย แล้วพนักงานยื่นลาเกินสิทธิ์)
 */
export function quotaFor(tid, balance, usedMap, schedule) {
    const b = (balance || {})[tid] || {};
    const max  = b.totalHours != null ? b.totalHours : round2(getLeaveTypeInfo(tid).maxDays * hoursPerDayOf(schedule));
    const used = usedMap ? (usedMap[tid] || 0) : (b.usedHours || 0);
    return { max, used, rem: Math.max(0, round2(max - used)) };
}

/**
 * ตัวนับ usedHours สำหรับเขียนลง leave_balances ด้วย setDoc(..., { merge: true })
 * เขียนทับทุกประเภท (รวมที่ใช้ 0) จะได้ไม่มีค่าค้างจากของเดิม
 */
export function usedHoursDoc(requests, schedule) {
    const used = usedHoursByType(requests, schedule);
    return Object.fromEntries(QUOTA_TYPES.map(t => [t, { usedHours: used[t] || 0 }]));
}

/**
 * ชม./วัน เปลี่ยน → ปรับ totalHours ให้จำนวน "วัน" เท่าเดิม
 * (สิทธิ์ลากิจ 3 วัน ตอน 7 ชม./วัน = 21 ชม. → พอเป็น 8 ชม./วัน ต้องเป็น 24 ชม.
 *  ถ้าไม่ปรับจะเหลือ "2 วัน 5 ชม.")
 * คืน null ถ้าไม่ต้องปรับ ไม่งั้นคืนเอกสารสำหรับ setDoc(..., { merge: true })
 */
export function rescaleQuotaDoc(balance, oldHpd, newHpd) {
    if (!(oldHpd > 0) || !(newHpd > 0) || Math.abs(oldHpd - newHpd) < 0.001) return null;
    const out = {};
    for (const t of QUOTA_TYPES) {
        const total = balance?.[t]?.totalHours;
        if (total == null) continue;
        out[t] = { totalHours: round2(total / oldHpd * newHpd) };
    }
    return Object.keys(out).length ? out : null;
}
