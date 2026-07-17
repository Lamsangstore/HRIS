// ดึงโค้ดจริงจาก app.html มาทดสอบ — ไม่ copy โค้ดมาวางซ้ำ
// ถ้า copy มาวาง เทสต์จะผ่านทั้งที่ของจริงพัง เพราะทดสอบคนละตัวกัน
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const APP_PATH = join(HERE, '..', 'app.html');
export const src = readFileSync(APP_PATH, 'utf8');

/** ดึงโค้ดระหว่าง marker สองตัว (ใช้คอมเมนต์ในไฟล์เป็นหมุด) */
export function slice(startMarker, endMarker) {
    const s = src.indexOf(startMarker);
    if (s < 0) throw new Error(`หา marker ไม่เจอ: "${startMarker}" — โครงโค้ดใน app.html เปลี่ยนไป`);
    const e = src.indexOf(endMarker, s);
    if (e < 0) throw new Error(`หา marker ปิดไม่เจอ: "${endMarker}"`);
    return src.slice(s, e);
}

/** ดึง top-level function declaration ตามชื่อ (นับวงเล็บปีกกา) */
export function grabFn(name) {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) throw new Error(`หาฟังก์ชันไม่เจอ: ${name}`);
    let depth = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
        if (src[k] === '{') depth++;
        else if (src[k] === '}') { depth--; if (!depth) return src.slice(i, k + 1); }
    }
    throw new Error(`วงเล็บไม่ครบใน: ${name}`);
}

/** ประกอบหลายฟังก์ชันเป็นโมดูลเดียวแล้วคืนค่าที่ export ออกมา */
export function loadFns(names, extraGlobals = {}) {
    const code = names.map(grabFn).join('\n');
    const argNames = Object.keys(extraGlobals);
    const body = `${code}\n return { ${names.join(', ')} };`;
    return new Function(...argNames, body)(...argNames.map(k => extraGlobals[k]));
}

/** ตัวช่วยเช็คแบบสั้น */
export function makeChecker() {
    const state = { failed: 0, total: 0 };
    const check = (name, got, want) => {
        state.total++;
        const ok = JSON.stringify(got) === JSON.stringify(want);
        if (!ok) state.failed++;
        console.log(`${ok ? '✅' : '❌'} ${name}`);
        if (!ok) console.log(`     ได้:     ${JSON.stringify(got)}\n     ควรได้: ${JSON.stringify(want)}`);
    };
    check.done = (label) => {
        console.log(state.failed
            ? `\n${label}: ไม่ผ่าน ${state.failed}/${state.total}`
            : `\n${label}: ผ่านทั้งหมด ${state.total} เคส`);
        if (state.failed) process.exitCode = 1;
    };
    return check;
}
