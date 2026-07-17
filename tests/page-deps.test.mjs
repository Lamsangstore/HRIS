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

for (const f of pageFiles) {
    // ชื่อที่ไฟล์นี้นิยามเอง
    const local = new Set();
    const declRe = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:function|\()|:\s*(?:async\s*)?(?:function|\())|window\.([A-Za-z_$][\w$]*)\s*=)/g;
    for (const m of f.src.matchAll(declRe)) {
        for (const g of [m[1], m[2], m[3], m[4]]) if (g) local.add(g);
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

    // ชื่อที่ถูก "เรียกแบบฟังก์ชัน" ในไฟล์นี้
    const called = new Set();
    for (const m of f.src.matchAll(/(?<![.\w$'"`])([A-Za-z_$][\w$]*)\s*\(/g)) called.add(m[1]);

    // ตัวไหนที่ไม่ได้นิยามเอง ไม่ใช่ builtin → ต้องมีคนตั้งเป็น window.<name> ใน app.html
    const unresolved = [...called]
        .filter(n => !local.has(n) && !BUILTINS.has(n))
        .filter(n => !new RegExp(`window\\.${n}\\s*=`).test(src))
        .filter(n => !new RegExp(`window\\.${n}\\s*=`).test(f.src));

    check(`${f.name}: ทุกฟังก์ชันที่เรียกมีคนนิยามให้`, unresolved, []);
}

check.done('Dependency ของหน้าที่แยกไฟล์');
