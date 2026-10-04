// หน้า "แอปของร้าน" — ทางเข้าแอปทั้งหมดของร้าน (เดิมคือ App Hub ที่ app.lamsangstore.com)
//
// ร้านสั่ง 1 ต.ค. 2569: เอา App Hub เข้ามาเป็นส่วนหนึ่งของ HRIS
// รายชื่อแอปไม่ได้เก็บใน Firestore ของ HRIS — เก็บที่หลังบ้านเว็บร้าน (lamsangstore.com/admin/apps)
// ที่เดียว แล้วหน้านี้ดึงมาโชว์ ยืนยันตัวด้วย idToken ของคนที่ล็อกอิน HRIS อยู่
// เว็บร้านกรองให้แล้วว่าแต่ละคนเห็นแอปไหน (admin → ทุกแอป · manager → ผู้จัดการขึ้นไป · อื่น ๆ → พนักงาน)

const LAUNCHER_URL = 'https://lamsangstore.com/api/hub/v1/launcher';

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// สีพื้นของไอคอนตัวอักษร — คงที่ต่อชื่อ (สูตรเดียวกับหน้าหลังบ้านเว็บร้าน)
function hue(name) {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
}

function iconHtml(app) {
    const letter = esc(String(app.name || '?').charAt(0).toUpperCase());
    const h = hue(app.name);
    // ตัวอักษรรองไว้ข้างใต้เสมอ — รูปโหลดไม่ขึ้น (ที่ฝากรูปลบทิ้ง) ก็ยังเห็นไอคอน
    const img = app.iconUrl && /^https?:\/\//.test(app.iconUrl)
        ? `<img src="${esc(app.iconUrl)}" alt="" class="absolute inset-0 w-12 h-12 rounded-xl object-cover" onerror="this.remove()">`
        : '';
    return `<span class="app-ico relative w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
        style="--h:${h}">${letter}${img}</span>`;
}

function isOther(c) {
    return /^(others?|อื่น ๆ|อื่นๆ)$/i.test(c);
}

function render(apps) {
    const groups = new Map();
    for (const a of apps) {
        const c = (a.category || '').trim() || 'อื่น ๆ';
        if (!groups.has(c)) groups.set(c, []);
        groups.get(c).push(a);
    }
    const ordered = [...groups].sort(([a], [b]) => Number(isOther(a)) - Number(isOther(b)));
    return ordered.map(([cat, list]) => `
        <section class="mb-8">
          <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">${esc(cat)}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            ${list.map(a => {
                const safe = /^https?:\/\//.test(a.link) ? a.link : '#';
                return `
              <a href="${esc(safe)}" target="_blank" rel="noopener"
                 class="group flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-3.5 hover:border-brand-400 hover:shadow-md transition-all min-w-0">
                ${iconHtml(a)}
                <span class="min-w-0 flex-1">
                  <span class="block font-black text-slate-800 text-sm truncate">${esc(a.name)}</span>
                  ${a.description ? `<span class="block text-xs text-slate-400 font-medium line-clamp-2">${esc(a.description)}</span>` : ''}
                </span>
                <i class="fa-solid fa-arrow-up-right-from-square text-slate-300 group-hover:text-brand-500 text-xs shrink-0"></i>
              </a>`;
            }).join('')}
          </div>
        </section>`).join('');
}

export default {
    title: 'แอปของร้าน',
    html: `
<style>
.app-ico { background: linear-gradient(135deg, hsl(var(--h) 70% 62%), hsl(var(--h) 66% 42%)); }
</style>
<div class="p-6 lg:p-8 max-w-6xl mx-auto">
  <div class="mb-8">
    <h2 class="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">แอปของร้าน</h2>
    <p class="text-sm text-slate-400 font-medium mt-0.5">ทางเข้าแอปทั้งหมดของร้าน — แอปของร้านใช้อีเมลและรหัสผ่านเดียวกับ HRIS</p>
  </div>
  <div id="apps-body">
    <div class="p-10 text-center text-slate-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>
  </div>
</div>`,

    init: async (user, profile) => {
        const body = document.getElementById('apps-body');
        const showError = (msg) => {
            if (!body) return;
            body.innerHTML = `
              <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <i class="fa-solid fa-triangle-exclamation text-brand-500 text-2xl mb-3"></i>
                <p class="text-sm font-bold text-slate-700">${esc(msg)}</p>
                <button id="apps-retry" class="mt-4 bg-panel-900 hover:bg-panel-800 text-brand-400 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest">ลองใหม่</button>
              </div>`;
            document.getElementById('apps-retry')?.addEventListener('click', load);
        };

        async function load() {
            if (body) body.innerHTML = '<div class="p-10 text-center text-slate-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>';
            let res;
            try {
                const token = await user.getIdToken();
                res = await fetch(LAUNCHER_URL, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
            } catch (e) {
                console.warn('apps:', e);
                showError('เชื่อมต่อเว็บร้านไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
                return;
            }
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                showError(json.error || 'โหลดรายชื่อแอปไม่สำเร็จ');
                return;
            }
            const apps = Array.isArray(json.apps) ? json.apps : [];
            if (!body) return;
            body.innerHTML = apps.length
                ? render(apps) + (profile?.role === 'admin'
                    ? `<p class="text-xs text-slate-400 font-medium mt-2"><i class="fa-solid fa-pen mr-1"></i>
                         เพิ่ม/แก้รายชื่อแอปได้ที่ <a href="https://lamsangstore.com/admin/apps" target="_blank" rel="noopener" class="underline hover:text-brand-600">หลังบ้านเว็บร้าน → แอปของร้าน</a></p>`
                    : '')
                : '<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm font-bold text-slate-400">ยังไม่มีแอปที่คุณใช้ได้</div>';
        }

        await load();
    },
};
