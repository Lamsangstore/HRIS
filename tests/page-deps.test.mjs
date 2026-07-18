// หน้าที่แยกไฟล์ออกไปต้องไม่เรียกอะไรที่ไม่มีใครนิยามให้
//
// เคยพัง: ย้าย branch-locations ออกมาแล้วมันเรียก loadBranchLocations() ซึ่งเป็น
// ฟังก์ชันใน scope ของ app.html ไม่ได้อยู่บน window — หน้าพังทันทีด้วย
// "loadBranchLocations is not defined" ทั้งที่ syntax ผ่านและเทสต์อื่นผ่านหมด
// เพราะ node --check ไม่ได้ resolve ตัวแปร และไม่มีใครเปิดหน้านั้นดู
//
// เทสต์นี้จับเฉพาะ "เรียกฟังก์ชันที่ไม่มีใครนิยาม" ซึ่งเป็นรูปแบบที่พังจริง
// ไม่ได้ทำ static analysis เต็มรูปแบบ — ตัวแปรที่อ้างแบบอื่นยังหลุดได้อยู่
import { src, pageFiles, makeChecker } from './extract.mjs';

const check = makeChecker();

// ของที่เบราว์เซอร์/JS มีให้อยู่แล้ว
const BUILTINS = new Set([
    'console','document','window','navigator','location','fetch','alert','confirm','prompt',
    'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame',
    'Math','JSON','Object','Array','String','Number','Boolean','Date','Set','Map','Promise',
    'RegExp','Error','Symbol','Proxy','Reflect','BigInt','Intl','URL','URLSearchParams',
    'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
    'FileReader','Blob','FormData','Image','Event','CustomEvent','AbortController',
    'localStorage','sessionStorage','indexedDB','structuredClone','queueMicrotask',
    'import','export','return','if','for','while','switch','catch','typeof','function',
    'await','new','delete','void','in','of','do','else','try','finally','throw','yield','async',
]);

// ตัดคอมเมนต์ทิ้งก่อนสแกน — ไม่งั้น "// Check duplicate (...)" หรือ
// "<!-- Detail (read-only) -->" จะถูกนับว่าเป็นการเรียกฟังก์ชัน
// false positive ทำให้คนเลิกเชื่อเทสต์ ซึ่งอันตรายกว่าไม่มีเทสต์
function stripComments(s) {
    return s
        .replace(/\\u[0-9a-fA-F]{4}/g, ' ')        // ี ฯลฯ — ไม่ใช่ชื่อตัวแปร
        .replace(/<style[\s\S]*?<\/style>/gi, ' ') // CSS ใน template — @media(), rgba() ไม่ใช่ JS
        .replace(/<!--[\s\S]*?-->/g, ' ')   // คอมเมนต์ HTML ใน template
        .replace(/\/\*[\s\S]*?\*\//g, ' ')  // /* ... */
        .replace(/(^|[^:])\/\/.*$/gm, '$1');// // ... (กัน https:// ด้วย)
}

for (const f of pageFiles) {
    f.src = stripComments(f.src);
    // ชื่อที่ไฟล์นี้นิยามเอง
    const local = new Set();
    const declRe = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:function|\()|:\s*(?:async\s*)?(?:function|\())|window\.([A-Za-z_$][\w$]*)\s*=)/g;
    for (const m of f.src.matchAll(declRe)) {
        for (const g of [m[1], m[2], m[3], m[4]]) if (g) local.add(g);
    }
    // ประกาศหลายตัวในบรรทัดเดียว: let a = [], b = null, c = 0
    // regex ด้านบนจับได้แค่ตัวแรก ตัวที่เหลือเลยดูเหมือนไม่มีใครนิยาม
    for (const m of f.src.matchAll(/(?:const|let|var)\s+([^;=\n]+(?:=[^;\n]*,[^;\n]*)+);/g)) {
        for (const part of m[1].split(',')) {
            const n = part.split('=')[0].trim();
            if (/^[A-Za-z_$][\w$]*$/.test(n)) local.add(n);
        }
    }

    // ของที่ import เข้ามาเป็นโมดูล — นับว่านิยามแล้ว
    for (const m of f.src.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
        m[1].split(',').forEach(a => {
            const n = a.split(/\sas\s/).pop().trim();
            if (/^[A-Za-z_$][\w$]*$/.test(n)) local.add(n);
        });
    }

    // destructuring — ที่ใช้เยอะสุดคือ const { collection, getDocs } = await import(...)
    for (const m of f.src.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g)) {
        m[1].split(',').forEach(a => {
            const n = a.split(':').pop().trim().split(/\s|=/)[0];
            if (/^[A-Za-z_$][\w$]*$/.test(n)) local.add(n);
        });
    }
    // พารามิเตอร์ของ init และ arrow ต่างๆ — ดึงหยาบๆ จากในวงเล็บ
    for (const m of f.src.matchAll(/\(([^()]{0,120})\)\s*=>|function\s*\w*\s*\(([^()]{0,120})\)/g)) {
        (m[1] || m[2] || '').split(',').forEach(a => {
            const n = a.trim().split(/[=:\s]/)[0].replace(/[{}[\].]/g, '');
            if (/^[A-Za-z_$][\w$]*$/.test(n)) local.add(n);
        });
    }

    // ชื่อที่ถูก "เรียกแบบฟังก์ชัน"
    // ห้ามมีช่องว่างก่อน ( และห้ามมี : นำหน้า — กัน "LINE ID (" ที่เป็นข้อความ
    // และ ".pr-line-cb:not(...)" ที่เป็น CSS selector
    const used = new Set();
    for (const m of f.src.matchAll(/(?<![.:\w$'"`])([A-Za-z_$][\w$]*)\(/g)) used.add(m[1]);

    // ...และค่าคงที่ที่ถูกใช้เป็นตัวแปรเฉยๆ (ALL_CAPS)
    // เคยพัง: review-admin ใช้ REVIEW_DIMENSIONS ซึ่งอยู่ใน scope ของ app.html
    // โมดูลมองไม่เห็น หน้าพังทันที แต่เทสต์เงียบเพราะดูแค่ชื่อที่ตามด้วย "("
    // จำกัดที่ SCREAMING_SNAKE (ต้องมี _) เพื่อไม่ให้ไปจับคำอย่าง "GPS" หรือ "PDF"
    // ที่อยู่ในข้อความบนหน้าจอ — ค่าคงที่ร่วมในโปรเจกต์นี้ตั้งชื่อแบบนี้ทั้งหมด
    for (const m of f.src.matchAll(/(?<![.\w$'"`])([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) used.add(m[1]);

    // ตัวไหนที่ไม่ได้นิยามเอง ไม่ใช่ builtin → ต้องมีคนตั้งเป็น window.<name> ใน app.html
    const unresolved = [...used]
        .filter(n => !local.has(n) && !BUILTINS.has(n))
        .filter(n => !new RegExp(`window\\.${n}\\s*=`).test(src))
        .filter(n => !new RegExp(`window\\.${n}\\s*=`).test(f.src));

    check(`${f.name}: ทุกฟังก์ชันที่เรียกมีคนนิยามให้`, unresolved, []);
}

check.done('Dependency ของหน้าที่แยกไฟล์');
