// วันหยุดตามประเพณี — ตัวอ่านค่าจากแคชกลาง
//
// state ยังอยู่ที่ window._publicHolidays เหมือนเดิม ไม่ย้ายมาไว้ในโมดูล
// เพราะมีโค้ดในหน้าอื่นอ่าน/เขียนตรงๆ อยู่หลายจุด (หน้าแรก, หน้าจัดการวันหยุด, OT)
// ถ้าย้าย state มาที่นี่ต้องไปแก้ทุกจุดพร้อมกัน = เสี่ยงเกินความจำเป็นสำหรับรอบนี้
//
// โหลดค่าเข้าแคชด้วย loadPublicHolidays() ใน app.html

/** @param {string} dateStr รูปแบบ 'YYYY-MM-DD' */
export function isPublicHoliday(dateStr) {
    return (globalThis._publicHolidays || []).some(h => h.date === dateStr);
}

/** @returns {string|null} ชื่อวันหยุด หรือ null ถ้าวันนั้นไม่ใช่วันหยุด */
export function getHolidayName(dateStr) {
    const h = (globalThis._publicHolidays || []).find(h => h.date === dateStr);
    return h ? h.name : null;
}
