// หน้า "ปฏิทินทีม" (หัวหน้า)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// วันหยุดตามประเพณี import จาก module ตรงๆ (ไม่ได้อยู่บน window)
// ตัวช่วยเรื่องวันที่ (todayTH/parseDateTH/dateToTHStr/newDateTH) ยังเป็น global

import { isPublicHoliday, getHolidayName } from '../lib/holidays.js?v=20260717a';
export default {
    title: 'ปฏิทินทีม',
    html: `
<style>
.tc-cell { min-height: 92px; border-radius: 0.75rem; padding: 6px; background: #fff; border: 1px solid #f4f4f5; }
.tc-cell.tc-today { border-color: #eab308; border-width: 2px; }
.tc-cell.tc-hol { background: #fef2f2; }
.tc-cell.tc-empty { background: transparent; border: none; }
.tc-chip { display:flex; align-items:center; gap:3px; font-size:9px; font-weight:800; padding:1px 5px; border-radius:6px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
@media (max-width: 640px) { .tc-cell { min-height: 64px; padding: 3px; } .tc-chip { font-size:8px; } }
</style>
<div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-lg sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ปฏิทินทีม</h2>
      <p class="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">ภาพรวมการลาและวันหยุดของทั้งทีมในแต่ละเดือน</p>
    </div>
    <div class="flex items-center gap-2">
      <select id="tc-branch" onchange="tcRender()" class="border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
        <option value="">ทุกสาขา</option>
      </select>
      <button onclick="tcPrev()" class="w-9 h-9 rounded-full bg-zinc-100 hover:bg-yellow-400 flex items-center justify-center"><i class="fa-solid fa-chevron-left text-sm"></i></button>
      <h3 class="font-black text-zinc-800 w-36 text-center text-sm" id="tc-month-title">-</h3>
      <button onclick="tcNext()" class="w-9 h-9 rounded-full bg-zinc-100 hover:bg-yellow-400 flex items-center justify-center"><i class="fa-solid fa-chevron-right text-sm"></i></button>
    </div>
  </div>

  <div class="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6">
    <div class="grid grid-cols-7 text-center text-[10px] font-black text-zinc-400 uppercase mb-2">
      <div>อา</div><div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div>ส</div>
    </div>
    <div id="tc-grid" class="grid grid-cols-7 gap-1.5">
      <div class="col-span-7 text-center py-16 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>
    </div>
    <div class="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-x-4 gap-y-2 justify-center text-[11px] font-bold text-zinc-500">
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-red-400"></div> ลาป่วย</div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-blue-400"></div> ลากิจ</div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-green-400"></div> ลาพักร้อน</div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-zinc-400"></div> ลาอื่นๆ</div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-amber-300"></div> รออนุมัติ</div>
      <div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded bg-red-100 border border-red-200"></div> วันหยุดนักขัตฤกษ์</div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') { navigateTo('home'); return; }
        const { collection, getDocs, query, where }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        const now = newDateTH();
        let tcYear = now.getFullYear(), tcMonth = now.getMonth();

        // โหลดพนักงาน + คำขอลา (pending + approved)
        const [empSnap, lvSnap] = await Promise.all([
            getDocs(col('users')),
            getDocs(col('leave_requests')),
        ]);
        const employees = empSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(e => e.name && e.status !== 'resigned');
        const empMap = Object.fromEntries(employees.map(e => [e.uid, e]));
        const leaves = lvSnap.docs.map(d => d.data()).filter(l => l.status === 'approved' || l.status === 'pending');

        // populate branch filter
        const branches = [...new Set(employees.map(e=>e.branch).filter(Boolean))].sort();
        const brSel = document.getElementById('tc-branch');
        if (brSel) branches.forEach(b => {
            const o = document.createElement('option'); o.value = b; o.textContent = b; brSel.appendChild(o);
        });

        const typeColor = {
            sick: 'bg-red-100 text-red-700', personal: 'bg-blue-100 text-blue-700',
            vacation: 'bg-green-100 text-green-700', maternity: 'bg-pink-100 text-pink-700',
            ordain: 'bg-orange-100 text-orange-700', military: 'bg-slate-100 text-slate-600',
        };

        window.tcRender = () => {
            const grid = document.getElementById('tc-grid');
            const title = document.getElementById('tc-month-title');
            if (!grid) return;
            const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
            if (title) title.textContent = months[tcMonth] + ' ' + (tcYear + 543);

            const br = document.getElementById('tc-branch')?.value || '';
            const uidsInBranch = br ? new Set(employees.filter(e=>e.branch===br).map(e=>e.uid)) : null;

            // index: date → [{name, type, status}]
            const dayMap = {};
            leaves.forEach(l => {
                if (!l.uid || !l.startDate || !l.endDate) return;
                if (uidsInBranch && !uidsInBranch.has(l.uid)) return;
                let d = parseDateTH(l.startDate);
                const end = parseDateTH(l.endDate);
                while (d <= end) {
                    const ds = dateToTHStr(d);
                    if (!dayMap[ds]) dayMap[ds] = [];
                    const emp = empMap[l.uid];
                    const nick = emp?.nickname || (l.employeeName||'').split(' ')[0];
                    dayMap[ds].push({ name: nick, type: l.type, status: l.status });
                    const nx = new Date(d); nx.setDate(nx.getDate()+1); d = nx;
                }
            });

            const firstDay = new Date(tcYear, tcMonth, 1).getDay();
            const daysInMonth = new Date(tcYear, tcMonth + 1, 0).getDate();
            const todayStr = todayTH();
            let html = '';
            for (let i = 0; i < firstDay; i++) html += '<div class="tc-cell tc-empty"></div>';
            for (let d = 1; d <= daysInMonth; d++) {
                const ds = `${tcYear}-${String(tcMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isHol = isPublicHoliday(ds);
                const holName = isHol ? (getHolidayName(ds)||'หยุด') : '';
                const items = dayMap[ds] || [];
                let cls = 'tc-cell';
                if (ds === todayStr) cls += ' tc-today';
                if (isHol) cls += ' tc-hol';
                const maxShow = 4;
                const chips = items.slice(0, maxShow).map(it => {
                    const c = it.status === 'pending' ? 'bg-amber-100 text-amber-700' : (typeColor[it.type] || 'bg-zinc-100 text-zinc-600');
                    const mark = it.status === 'pending' ? '?' : '';
                    return `<div class="tc-chip ${c}" title="${it.name}">${it.name}${mark}</div>`;
                }).join('');
                const more = items.length > maxShow ? `<div class="tc-chip bg-zinc-100 text-zinc-500">+${items.length-maxShow} คน</div>` : '';
                html += `<div class="${cls}">
                    <div class="flex justify-between items-start">
                        <span class="text-xs font-black ${isHol?'text-red-600':'text-zinc-700'}">${d}</span>
                        ${isHol ? `<span class="text-[8px] font-bold text-red-400 text-right leading-tight max-w-[70%] truncate" title="${holName}">${holName}</span>` : ''}
                    </div>
                    ${chips}${more}
                </div>`;
            }
            grid.innerHTML = html;
        };

        window.tcPrev = () => { tcMonth--; if (tcMonth < 0) { tcMonth = 11; tcYear--; } tcRender(); };
        window.tcNext = () => { tcMonth++; if (tcMonth > 11) { tcMonth = 0; tcYear++; } tcRender(); };

        tcRender();

        return () => { ['tcRender','tcPrev','tcNext'].forEach(k => delete window[k]); };
    }
};
