// คำนวณชั่วโมงลาและการแสดงผลวัน/ชั่วโมง
//
// ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด (ยกเว้นการอ่านวันหยุดผ่าน isPublicHoliday)
// ไม่แตะ Firestore ไม่แตะ DOM => ทดสอบได้ตรงๆ ดู tests/leave-hours.test.mjs
//
// รูปแบบ schedule ที่ทุกฟังก์ชันรับ (มาจาก Firestore: work_schedules/{uid}):
//   { workDays:[1..5], workStart:'08:00', workEnd:'17:00',
//     breakStart:'12:00', breakMinutes:60, holidays:['YYYY-MM-DD', ...] }
// ทุก field มีค่าตั้งต้นให้ — schedule เก่าที่ยังไม่มี breakStart จะถือว่าพัก 12:00

import { isPublicHoliday } from './holidays.js';

/** 'HH:MM' → นาทีนับจากเที่ยงคืน */
export function hhmmToMins(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
}

/** ช่วงพักของวัน (นาทีจากเที่ยงคืน) — null ถ้าไม่มีพัก */
export function getBreakWindow(schedule) {
    const mins = schedule.breakMinutes ?? 60;
    if (!(mins > 0)) return null;
    const start = hhmmToMins(schedule.breakStart || '12:00');
    return { start, end: start + mins };
}

/** นาทีที่ช่วง [s,e] คาบเกี่ยวกับเวลาพัก */
export function breakOverlapMins(s, e, brk) {
    if (!brk) return 0;
    return Math.max(0, Math.min(e, brk.end) - Math.max(s, brk.start));
}

/**
 * คำนวณชั่วโมงลาตาม schedule จริงของพนักงาน
 *
 * หักเวลาพักเฉพาะส่วนที่ช่วงลาคาบเกี่ยวเวลาพักจริงเท่านั้น
 * ห้ามกลับไปเฉลี่ยพักตามสัดส่วนทั้งวัน — เคยทำแบบนั้นแล้วลาเช้า 08:00–12:00
 * ได้ 3.56 ชม. ทั้งที่ไม่ได้คาบพักเที่ยงเลย และค่าผิดถูกบันทึกลงฐานข้อมูล
 * พร้อมตัดโควตาไปด้วย
 */
export function calcLeaveHours(startDate, startTime, endDate, endTime, schedule) {
    const workDaySet   = new Set(schedule.workDays || [1, 2, 3, 4, 5]);
    const personalHols = new Set(schedule.holidays || []);
    const dayStartM = hhmmToMins(schedule.workStart || '08:00');
    const dayEndM   = hhmmToMins(schedule.workEnd   || '17:00');
    const brk = getBreakWindow(schedule);

    let total = 0;
    let cur = new Date(startDate + 'T12:00:00+07:00');
    const endDay = new Date(endDate + 'T12:00:00+07:00');

    while (cur <= endDay) {
        const yr = cur.getFullYear();
        const mo = String(cur.getMonth() + 1).padStart(2, '0');
        const dy = String(cur.getDate()).padStart(2, '0');
        const ds = yr + '-' + mo + '-' + dy;

        if (workDaySet.has(cur.getDay()) && !personalHols.has(ds) && !isPublicHoliday(ds)) {
            const isFirstDay = ds === startDate;
            const isLastDay  = ds === endDate;
            const useStartM  = isFirstDay && startTime ? hhmmToMins(startTime) : dayStartM;
            const useEndM    = isLastDay  && endTime   ? hhmmToMins(endTime)   : dayEndM;

            const s = Math.max(useStartM, dayStartM);
            const e = Math.min(useEndM,   dayEndM);

            if (e > s) {
                total += (e - s) - breakOverlapMins(s, e, brk);
            }
        }
        cur.setDate(cur.getDate() + 1);
    }
    return Math.round(total / 60 * 100) / 100; // ปัดเป็น 2 ทศนิยม
}

/** ชั่วโมงทำงานต่อวันตาม schedule (hpd) */
export function getDayWorkHours(schedule) {
    const ws = schedule.workStart || '08:00';
    const we = schedule.workEnd   || '17:00';
    const [sh, sm] = ws.split(':').map(Number);
    const [eh, em] = we.split(':').map(Number);
    const totalMins = (eh * 60 + em) - (sh * 60 + sm);
    const breakMins = schedule.breakMinutes ?? 60;
    const workMins  = totalMins - breakMins;
    return Math.max(0.5, workMins / 60);
}

/**
 * ชั่วโมง OT จริง: (ออก - เข้า - พักของพนักงาน) ปัดขึ้นชั่วโมงเต็ม
 * ถ้าไม่มีบันทึกเวลา → ใช้ hpd ตาม schedule
 */
export function calcAutoOTHours(inTime, outTime, schedule) {
    const breakMins = schedule.breakMinutes ?? 60;
    if (inTime && outTime) {
        const [ih, im] = inTime.split(':').map(Number);
        const [oh, om] = outTime.split(':').map(Number);
        let actualMins = (oh * 60 + om) - (ih * 60 + im);
        if (actualMins < 0) actualMins += 24 * 60; // ข้ามคืน
        const workMins = Math.max(0, actualMins - breakMins);
        return Math.ceil(workMins / 60);
    }
    return getDayWorkHours(schedule);
}

/** แยกชั่วโมง → { days, hours, neg } ตาม ชม./วัน ของ schedule */
export function splitDaysHours(h, schedule) {
    const hpd = schedule ? Math.max(0.5, getDayWorkHours(schedule)) : 8;
    const neg = h < 0;
    const abs = Math.abs(h);
    let days  = Math.floor(abs / hpd);
    let hours = Math.round((abs - days * hpd) * 10) / 10;
    if (hours >= hpd) { days += 1; hours = 0; } // ปัดเศษแล้วครบวันพอดี
    return { days, hours, neg };
}

/**
 * แสดงระยะเวลาของใบลาแต่ละใบ — ตัดหน่วยที่เป็น 0 ออก เช่น "4 ชม." / "1 วัน"
 * ใช้กับ "ใบลานี้ยาวเท่าไหร่" ไม่ใช่โควตา (ใบลาครึ่งวันควรอ่านว่า "4 ชม."
 * ไม่ใช่ "0 วัน 4 ชม.")
 */
export function hoursToDisplay(h, schedule) {
    if (h == null || h === '') return '-';
    if (h === 0) return '0 ชม.';
    const { days, hours, neg } = splitDaysHours(h, schedule);
    const sign = neg ? '-' : '';
    if (days > 0 && hours > 0) return `${sign}${days} วัน ${hours} ชม.`;
    if (days > 0)              return `${sign}${days} วัน`;
    return `${sign}${hours} ชม.`;
}

/**
 * แสดงโควต้า/วันลาคงเหลือ — บอกครบทั้งสองหน่วยเสมอ เช่น "16 วัน 0 ชม."
 * ใช้ "ติดลบ" แทนเครื่องหมาย - เพราะ "-0 วัน 4 ชม." อ่านแล้วสับสน
 */
export function balanceToDisplay(h, schedule) {
    if (h == null || h === '') return '-';
    const { days, hours, neg } = splitDaysHours(h, schedule);
    return `${neg ? 'ติดลบ ' : ''}${days} วัน ${hours} ชม.`;
}
