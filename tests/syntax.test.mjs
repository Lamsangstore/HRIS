// ตรวจว่า <script> ทุกก้อนใน .html ยัง parse ผ่าน
// app.html ยาวหมื่นกว่าบรรทัดและไม่มี build step — พิมพ์ผิดทีเดียวหน้าขาวทั้งแอป
// เทสต์นี้จับได้ก่อนถึงมือผู้ใช้
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['app.html', 'index.html', 'profile.html', 'time.html', 'ot-manual.html', 'add-employee.html'];
const tmp = mkdtempSync(join(tmpdir(), 'hris-syntax-'));
const check = makeChecker();

for (const file of FILES) {
    let src;
    try { src = readFileSync(join(ROOT, file), 'utf8'); }
    catch { continue; }  // ไฟล์ถูกลบไปแล้วก็ข้าม

    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0, bad = [];
    while ((m = re.exec(src))) {
        const path = join(tmp, `${file}.${i++}.mjs`);
        writeFileSync(path, m[1]);
        try { execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' }); }
        catch (e) { bad.push(String(e.stderr).split('\n').slice(0, 3).join(' ')); }
    }
    check(`${file}: <script> ทั้ง ${i} ก้อน parse ผ่าน`, bad, []);
}

check.done('Syntax');
