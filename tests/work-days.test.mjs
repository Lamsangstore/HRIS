// วันทำงานตามช่วงเวลา — เปลี่ยนวันหยุดแล้วต้องไม่กระทบวันก่อนเปลี่ยน
//
// เคยพัง: เปลี่ยนวันหยุดจาก พฤ. เป็น อ. แล้วทุก พฤ. ในอดีตขึ้น "ขาดงาน"
// และทุก อ. ในอดีตขึ้น "วันโอที" เพราะระบบเก็บ workDays ไว้ชุดเดียว
import { workDaysOn, workDaysHistoryOf, normalizeWorkDaysHistory } from '../js/lib/work-days.js';
import { calcLeaveHours } from '../js/lib/leave-hours.js';
import { allPageSrc, makeChecker } from './extract.mjs';

const check = makeChecker();

const THU_OFF = [0,1,2,3,5,6];
const TUE_OFF = [0,1,3,4,5,6];
const sched = {
    workDays: TUE_OFF,
    workDaysHistory: [
        { from: '', workDays: THU_OFF },
        { from: '2026-09-01', workDays: TUE_OFF },
    ],
    workStart: '08:00', workEnd: '17:00', breakStart: '12:00', breakMinutes: 60,
};

// 2026-08-27 = พฤ., 2026-08-25 = อ., 2026-09-03 = พฤ., 2026-09-08 = อ.
check('พฤ. ก่อนเปลี่ยน = วันหยุด', workDaysOn(sched, '2026-08-27').includes(4), false);
check('อ. ก่อนเปลี่ยน = วันทำงาน', workDaysOn(sched, '2026-08-25').includes(2), true);
check('พฤ. หลังเปลี่ยน = วันทำงาน', workDaysOn(sched, '2026-09-03').includes(4), true);
check('อ. หลังเปลี่ยน = วันหยุด', workDaysOn(sched, '2026-09-08').includes(2), false);
check('วันที่มีผลพอดีใช้ชุดใหม่', workDaysOn(sched, '2026-09-01'), TUE_OFF);

check('schedule เก่าไม่มีประวัติ → ใช้ workDays เดิมทุกวัน',
      workDaysOn({ workDays: [1,2,3] }, '2020-01-01'), [1,2,3]);
check('ไม่มีอะไรเลย → จ.–ศ.', workDaysOn({}, '2026-01-01'), [1,2,3,4,5]);
check('ช่วงแรกสุดครอบคลุมวันก่อนหน้าเสมอ',
      workDaysHistoryOf({ workDaysHistory: [{ from: '2026-05-01', workDays: [1] }] })[0].from, '');

// ชั่วโมงลาข้ามช่วงเปลี่ยน: ลา อ. 25 ส.ค. – พฤ. 3 ก.ย. (10 วันปฏิทิน)
// ก่อน 1 ก.ย. หยุด พฤ. → 25,26,28,29,30,31 = 6 วัน (27 พฤ. หยุด)
// ตั้งแต่ 1 ก.ย. หยุด อ. → 2,3 = 2 วัน (1 อ. หยุด) รวม 8 วัน × 8 ชม.
check('ชั่วโมงลาใช้วันทำงานของแต่ละวัน',
      calcLeaveHours('2026-08-25', '08:00', '2026-09-03', '17:00', sched), 64);

check('จัดประวัติ: เรียงวันที่ + ตัดช่วงที่ไม่ได้เปลี่ยนจริง',
      normalizeWorkDaysHistory([
          { from: 'x', workDays: THU_OFF },
          { from: '2026-10-01', workDays: THU_OFF },
          { from: '2026-09-01', workDays: TUE_OFF },
      ]),
      [{ from: '', workDays: THU_OFF }, { from: '2026-09-01', workDays: TUE_OFF }, { from: '2026-10-01', workDays: THU_OFF }]);
check('วันที่ซ้ำ → null', normalizeWorkDaysHistory([
    { from: '', workDays: [1] }, { from: '2026-09-01', workDays: [2] }, { from: '2026-09-01', workDays: [3] }]), null);
check('ไม่ใส่วันที่ → null', normalizeWorkDaysHistory([{ from: '', workDays: [1] }, { from: '', workDays: [2] }]), null);

// ห้ามกลับไปอ่าน workDays ตรงๆ เพื่อตัดสินวันในอดีต — ต้องผ่าน workDaySetOn/workDaysOn
const direct = [];
for (const { name, src } of allPageSrc) {
    src.split('\n').forEach((line, i) => {
        if (/new Set\([^)]*\.workDays\b/.test(line)) direct.push(`${name}:${i + 1}`);
    });
}
check('ไม่มีหน้าไหนสร้าง Set จาก workDays ตรงๆ', direct, []);

check.done('วันทำงานตามช่วงเวลา');
