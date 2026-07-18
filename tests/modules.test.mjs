// ตรวจว่า import ทุกอันชี้ไปของที่มีจริง และ cache-busting version ตรงกันหมด
//
// เคยพัง 2 แบบ:
// 1) app.html import REVIEW_DEFAULT_CRITERIA จาก lib ที่ยังไม่มี export นั้น
//    → "does not provide an export named ..." แล้วหน้าขาวทั้งแอป
// 2) เบราว์เซอร์ cache ไฟล์ .js เก่าไว้ พอ app.html ใหม่ไปเรียกโมดูลเวอร์ชันเก่า
//    → พังแบบเดียวกัน ทั้งที่ไฟล์บนเซิร์ฟเวอร์ถูกต้อง
//
// node --check จับไม่ได้ทั้งคู่ เพราะมันเช็คแค่ syntax ไม่ได้ resolve import
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { src, pageFiles, makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = makeChecker();

const files = [
    { name: 'app.html', dir: ROOT, src },
    ...pageFiles.map(f => ({ name: f.name, dir: join(ROOT, 'js', 'pages'), src: readFileSync(join(ROOT, f.name), 'utf8') })),
    ...['holidays', 'leave-hours', 'leave-types', 'review-dimensions', 'status-map']
        .filter(n => existsSync(join(ROOT, 'js', 'lib', `${n}.js`)))
        .map(n => ({ name: `js/lib/${n}.js`, dir: join(ROOT, 'js', 'lib'),
                     src: readFileSync(join(ROOT, 'js', 'lib', `${n}.js`), 'utf8') })),
];

// ── 1. ทุกชื่อที่ import ต้องมี export จริงในไฟล์ปลายทาง ──────────────────────
const badImports = [];
for (const f of files) {
    for (const m of f.src.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
        const spec = m[2];
        if (!spec.startsWith('.')) continue;               // ข้าม CDN
        const path = resolve(f.dir, spec.split('?')[0]);   // ตัด ?v= ออกก่อนหาไฟล์
        if (!existsSync(path)) { badImports.push(`${f.name} → ไม่มีไฟล์ ${spec}`); continue; }
        const target = readFileSync(path, 'utf8');
        for (const raw of m[1].split(',')) {
            const name = raw.split(/\sas\s/)[0].trim();
            if (!name) continue;
            const hasExport = new RegExp(`export\\s+(const|let|var|function|class)\\s+${name}\\b`).test(target)
                           || new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(target);
            if (!hasExport) badImports.push(`${f.name} import "${name}" แต่ ${spec} ไม่ได้ export`);
        }
    }
}
check('ทุก import มี export รองรับจริง', badImports, []);

// ── 2. cache-busting version ต้องมีและตรงกันทุกที่ ────────────────────────────
const declared = src.match(/const ASSET_V = '([^']+)'/)?.[1];
check('app.html ประกาศ ASSET_V ไว้', !!declared, true);

if (declared) {
    const versions = new Set();
    const missing = [];
    for (const f of files) {
        for (const m of f.src.matchAll(/from\s*['"](\.[^'"]+\.js)(\?v=([^'"]+))?['"]/g)) {
            if (!m[2]) missing.push(`${f.name} → ${m[1]} (ไม่มี ?v=)`);
            else versions.add(m[3]);
        }
    }
    check('ทุก static import มี ?v= ต่อท้าย', missing, []);
    check('เวอร์ชันตรงกันทุกไฟล์', [...versions], [declared]);
}

check.done('Module & cache');
