// บังคับให้ bump ASSET_V เมื่อไฟล์ใน js/ เปลี่ยน
//
// เทสต์ modules.test.mjs เช็คแค่ว่าเวอร์ชัน "ตรงกันทุกไฟล์" ซึ่งถ้าลืม bump เลย
// ก็ยังตรงกันหมด → ผ่าน → deploy → เบราว์เซอร์พนักงานใช้ไฟล์เก่าจาก cache
// = อาการเดียวกับที่เคยทำให้แอปขาวทั้งระบบ
//
// เทสต์นี้เก็บ hash ของไฟล์ใน js/ คู่กับเวอร์ชันที่ประกาศไว้
// ถ้าไฟล์เปลี่ยนแต่เวอร์ชันเท่าเดิม → fail พร้อมบอกให้ bump
// อัปเดตค่าที่บันทึกด้วย: node tests/asset-version.test.mjs --update
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { src, makeChecker } from './extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCK = join(ROOT, 'tests', 'asset-version.lock.json');

// hash เนื้อไฟล์ทั้งหมดใน js/ โดยตัด ?v=... ออกก่อน
// (ไม่งั้น bump แล้ว hash เปลี่ยนตามเอง เทสต์จะไร้ความหมาย)
function hashJs() {
    const files = [];
    const walk = dir => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.js')) files.push(p);
        }
    };
    walk(join(ROOT, 'js'));
    files.sort();
    const h = createHash('sha256');
    for (const f of files) {
        h.update(f.replace(ROOT, ''));
        h.update(readFileSync(f, 'utf8').replace(/\?v=[\w.-]+/g, ''));
    }
    return h.digest('hex').slice(0, 16);
}

const version = src.match(/const ASSET_V = '([^']+)'/)?.[1];
const hash = hashJs();

if (process.argv.includes('--update')) {
    writeFileSync(LOCK, JSON.stringify({ version, hash }, null, 2) + '\n');
    console.log(`บันทึกแล้ว: ${version} → ${hash}`);
    process.exit(0);
}

const check = makeChecker();
check('app.html ประกาศ ASSET_V', !!version, true);
check('มีไฟล์ asset-version.lock.json', existsSync(LOCK), true);

if (version && existsSync(LOCK)) {
    const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
    if (lock.hash === hash) {
        check('ไฟล์ใน js/ ไม่เปลี่ยน → เวอร์ชันต้องเท่าเดิม', version, lock.version);
    } else {
        // ไฟล์เปลี่ยนแล้ว — เวอร์ชันต้องไม่ใช่ตัวเดิม
        const bumped = version !== lock.version;
        if (!bumped) {
            console.log(`\n   ไฟล์ใน js/ เปลี่ยนแล้วแต่ ASSET_V ยังเป็น '${version}'`);
            console.log(`   → แก้ ASSET_V ใน app.html แล้วรัน:`);
            console.log(`     grep -rl '${version}' app.html js/ | xargs sed -i '' 's/${version}/<เวอร์ชันใหม่>/g'`);
            console.log(`     node tests/asset-version.test.mjs --update\n`);
        }
        check('js/ เปลี่ยนแล้ว → ต้อง bump ASSET_V (ไม่งั้นเบราว์เซอร์ใช้ไฟล์เก่า)', bumped, true);
    }
}

check.done('Asset version');
