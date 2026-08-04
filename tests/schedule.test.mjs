// ตารางงาน — โดยเฉพาะเวลาพัก 0 นาที (ไม่พัก)
//
// เคยพัง: saveSchedule ใช้ `Number(value) || 60` ซึ่ง 0 เป็น falsy
// → ตั้งพัก 0 นาที (ไม่พัก) กลายเป็น 60 บันทึกแล้วเปิดกลับมาก็ยัง 60
// รูปแบบ `x || default` แบบนี้มีทั่วโปรเจกต์ จึงคุ้มที่จะมีเทสต์ดักไว้
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getBreakWindow, getDayWorkHours } from '../js/lib/leave-hours.js';
import { makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = makeChecker();

// ── ฝั่งบันทึก: ดึงนิพจน์ breakMinutes จริงจากไฟล์มารันบน DOM (ไม่ copy มาเขียนเอง) ──
{
    const src = readFileSync(join(ROOT, 'js/pages/leave-admin.js'), 'utf8');
    const i = src.indexOf('breakMinutes: (() => {');
    const j = src.indexOf('})(),', i) + 4;
    if (i < 0 || j < 4) throw new Error('หานิพจน์ breakMinutes ใน leave-admin.js ไม่เจอ — โครงโค้ดเปลี่ยน');
    const expr = src.slice(i + 'breakMinutes: '.length, j).replace(/,$/, '');

    const dom = new JSDOM(`<input id="sched-break">`);
    const parse = (val) => {
        dom.window.document.getElementById('sched-break').value = val;
        return new Function('document', `return (${expr});`)(dom.window.document);
    };

    check('พิมพ์ 0 → เก็บ 0 (ไม่ใช่ 60)', parse('0'), 0);   // เคสที่รายงานมา
    check('ช่องว่าง → ใช้ค่าตั้งต้น 60', parse(''), 60);
    check('พิมพ์ 60 → 60', parse('60'), 60);
    check('พิมพ์ 30 → 30', parse('30'), 30);
    check('ค่าติดลบ → 0', parse('-5'), 0);
    check('ทศนิยม → ปัดลง', parse('45.7'), 45);
}

// ── ฝั่งคำนวณ: พัก 0 นาที ต้องแปลว่าไม่มีพัก และไม่หักชั่วโมง ──
check('breakMinutes 0 → ไม่มีช่วงพัก', getBreakWindow({ breakMinutes: 0 }), null);
check('พัก 0 → ทำงานเต็ม 9 ชม. (08:00–17:00 ไม่หักพัก)',
      getDayWorkHours({ workStart: '08:00', workEnd: '17:00', breakMinutes: 0 }), 9);
check('พัก 60 → 8 ชม. ตามปกติ',
      getDayWorkHours({ workStart: '08:00', workEnd: '17:00', breakMinutes: 60 }), 8);

check.done('ตารางงาน / เวลาพัก');
