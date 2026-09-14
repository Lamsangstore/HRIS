// วันทำงานประจำสัปดาห์ของพนักงาน ณ วันที่ใดวันหนึ่ง
//
// เคยพัง: work_schedules เก็บ workDays ไว้ชุดเดียว พอ admin เปลี่ยนวันหยุด
// จาก พฤ. เป็น อ. ทุกหน้าที่ย้อนดูอดีต (ลงเวลา, ปฏิทิน, OT, เงินเดือน, ชั่วโมงลา)
// ใช้วันทำงานชุดใหม่กับทุกวันที่ผ่านมา → พฤ. เก่ากลายเป็น "ขาดงาน"
// และ อ. เก่ากลายเป็น "วันโอที" ทั้งหมด
//
// จึงเก็บประวัติไว้ใน work_schedules/{uid}.workDaysHistory:
//   [ { from: '',           workDays: [0,1,2,3,5,6] },   // '' = ตั้งแต่เริ่มงาน
//     { from: '2026-09-01', workDays: [0,1,3,4,5,6] } ]
// ส่วน workDays ยังเก็บชุดที่ใช้ "วันนี้" ไว้ด้วย เพื่อให้ข้อมูลเก่าอ่านได้เหมือนเดิม
//
// ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด — ดู tests/work-days.test.mjs

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

/** ประวัติที่เรียงตามวันที่มีผลแล้ว (schedule เก่าที่ไม่มีประวัติ → ช่วงเดียวตั้งแต่เริ่มงาน) */
export function workDaysHistoryOf(schedule) {
    const hist = schedule && Array.isArray(schedule.workDaysHistory) ? schedule.workDaysHistory : [];
    const clean = hist
        .filter(h => h && Array.isArray(h.workDays))
        .map(h => ({ from: h.from || '', workDays: [...h.workDays] }))
        .sort((a, b) => a.from.localeCompare(b.from));
    if (!clean.length) {
        return [{ from: '', workDays: [...((schedule && schedule.workDays) || DEFAULT_WORK_DAYS)] }];
    }
    clean[0].from = '';   // ช่วงแรกสุดครอบคลุมทุกวันก่อนหน้าเสมอ ไม่ปล่อยให้มีช่วงที่ไม่รู้วันทำงาน
    return clean;
}

/** วันทำงาน (0=อา. … 6=ส.) ที่ใช้ในวันที่ ds ('YYYY-MM-DD') */
export function workDaysOn(schedule, ds) {
    const hist = workDaysHistoryOf(schedule);
    let cur = hist[0].workDays;
    for (const h of hist) {
        if (h.from <= ds) cur = h.workDays;
        else break;
    }
    return cur;
}

/** Set ของวันทำงานในวันที่ ds — ใช้แทน new Set(schedule.workDays) ทุกที่ที่ดูวันในอดีต */
export function workDaySetOn(schedule, ds) {
    return new Set(workDaysOn(schedule, ds));
}

/**
 * จัดประวัติที่ admin แก้ให้พร้อมบันทึก: เรียงวันที่, ช่วงแรกเป็น '', ตัดช่วงที่
 * วันทำงานเหมือนช่วงก่อนหน้า (ไม่ได้เปลี่ยนจริง) คืน null ถ้ามีวันที่ซ้ำหรือว่าง
 */
export function normalizeWorkDaysHistory(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    const [first, ...rest] = rows;
    if (rest.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.from || ''))) return null;
    const froms = rest.map(r => r.from);
    if (new Set(froms).size !== froms.length) return null;
    const sorted = [{ from: '', workDays: first.workDays }, ...[...rest].sort((a, b) => a.from.localeCompare(b.from))]
        .map(r => ({ from: r.from, workDays: [...new Set(r.workDays)].sort((a, b) => a - b) }));
    const out = [];
    for (const r of sorted) {
        const prev = out[out.length - 1];
        if (prev && prev.workDays.join(',') === r.workDays.join(',')) continue;
        out.push(r);
    }
    return out;
}
