// หน้า "ประวัติการลา (ทีม)" (หัวหน้า)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ประเภทลา + ตัวคำนวณชั่วโมง import จาก module / ที่เหลือเป็น global บน window

import { LEAVE_TYPES, getLeaveTypeInfo, colorVariants } from '../lib/leave-types.js';
import { hoursToDisplay, balanceToDisplay, getDayWorkHours } from '../lib/leave-hours.js';
import { STATUS_MAP } from '../lib/status-map.js';

export default {
    title: 'ประวัติการลา (ทีม)',
    html: `
<div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-lg sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ประวัติการลาของทีม</h2>
      <p class="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">ตรวจสอบประวัติการลาของพนักงานทุกคน</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
    <div>
      <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">พนักงาน</label>
      <select id="sl-emp" class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <option value="">— ทุกคน —</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">สาขา</label>
      <select id="sl-branch" class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <option value="">— ทุกสาขา —</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ประเภท</label>
      <select id="sl-type" class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <option value="">— ทุกประเภท —</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">สถานะ</label>
      <select id="sl-status" class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <option value="">— ทุกสถานะ —</option>
        <option value="pending">รอการอนุมัติ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="rejected">ไม่อนุมัติ</option>
        <option value="cancelled">ยกเลิก</option>
      </select>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ตั้งแต่</label>
        <input type="date" id="sl-from" class="w-full border-2 border-zinc-200 rounded-xl px-2 py-2 text-xs font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <div>
        <label class="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ถึง</label>
        <input type="date" id="sl-to" class="w-full border-2 border-zinc-200 rounded-xl px-2 py-2 text-xs font-medium focus:border-yellow-500 focus:outline-none">
      </div>
    </div>
    <div class="sm:col-span-2 lg:col-span-5 flex flex-wrap gap-2 justify-end">
      <button onclick="slSetRange('year')" class="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg">ปีนี้</button>
      <button onclick="slSetRange('quarter')" class="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg">3 เดือนล่าสุด</button>
      <button onclick="slSetRange('month')" class="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg">เดือนนี้</button>
      <button onclick="slClearRange()" class="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg">ทั้งหมด</button>
      <button onclick="slApply()" class="text-xs font-black bg-zinc-900 hover:bg-zinc-800 text-yellow-400 px-4 py-1.5 rounded-lg">
        <i class="fa-solid fa-magnifying-glass mr-1"></i> ค้นหา
      </button>
      <button onclick="slExport()" class="text-xs font-black bg-yellow-500 hover:bg-yellow-400 text-zinc-900 px-4 py-1.5 rounded-lg">
        <i class="fa-solid fa-file-arrow-down mr-1"></i> Export CSV
      </button>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
    <div class="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
      <p class="text-2xl font-black text-zinc-800" id="sl-stat-total">-</p>
      <p class="text-[10px] text-zinc-400 font-bold uppercase mt-1">คำขอทั้งหมด</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
      <p class="text-2xl font-black text-yellow-600" id="sl-stat-pending">-</p>
      <p class="text-[10px] text-zinc-400 font-bold uppercase mt-1">รออนุมัติ</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
      <p class="text-2xl font-black text-green-600" id="sl-stat-approved">-</p>
      <p class="text-[10px] text-zinc-400 font-bold uppercase mt-1">อนุมัติแล้ว</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-4 text-center">
      <p class="text-2xl font-black text-yellow-700" id="sl-stat-hours">-</p>
      <p class="text-[10px] text-zinc-400 font-bold uppercase mt-1">ชั่วโมงลา (อนุมัติ)</p>
    </div>
  </div>

  <!-- Per-employee leave balance (shows only when employee is selected) -->
  <div id="sl-balance" class="hidden mb-6"></div>

  <!-- Results -->
  <div id="sl-list" class="space-y-3">
    <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i><p class="font-bold text-sm">กำลังโหลด...</p></div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') { navigateTo('home'); return; }
        const { collection, doc, getDoc, getDocs, query, orderBy }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        // load employees + schedules
        const [empSnap, schedSnap] = await Promise.all([ getDocs(col('users')), getDocs(col('work_schedules')) ]);
        const employees = empSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(e => e.name);
        employees.sort((a,b)=>a.name.localeCompare(b.name,'th'));
        const empMap = Object.fromEntries(employees.map(e => [e.uid, e]));
        const schedMap = {};
        schedSnap.forEach(d => schedMap[d.id] = d.data());

        // populate selects
        const empSel = document.getElementById('sl-emp');
        if (empSel) employees.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.uid;
            opt.textContent = `${e.name}${e.employeeCode?` (${e.employeeCode})`:''}`;
            empSel.appendChild(opt);
        });
        const branches = [...new Set(employees.map(e=>e.branch).filter(Boolean))].sort();
        const brSel = document.getElementById('sl-branch');
        if (brSel) branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b; opt.textContent = b;
            brSel.appendChild(opt);
        });
        const tSel = document.getElementById('sl-type');
        if (tSel) LEAVE_TYPES.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id; opt.textContent = t.label;
            tSel.appendChild(opt);
        });

        // โหลด leave requests ทั้งหมด
        let allReqs = [];
        try {
            const snap = await getDocs(query(col('leave_requests'), orderBy('createdAt','desc')));
            allReqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error('load leaves:', e);
            showToast('โหลดข้อมูลไม่ได้: '+e.message, 'error');
        }

        window.slSetRange = (mode) => {
            const now = newDateTH();
            let from, to;
            if (mode === 'year') {
                from = `${now.getFullYear()}-01-01`;
                to   = `${now.getFullYear()}-12-31`;
            } else if (mode === 'quarter') {
                const d = new Date(now); d.setMonth(d.getMonth() - 2);
                from = dateToTHStr(new Date(d.getFullYear(), d.getMonth(), 1));
                to   = dateToTHStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            } else {
                from = dateToTHStr(new Date(now.getFullYear(), now.getMonth(), 1));
                to   = dateToTHStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            }
            const fEl = document.getElementById('sl-from'); if (fEl) fEl.value = from;
            const tEl = document.getElementById('sl-to');   if (tEl) tEl.value = to;
        };
        window.slClearRange = () => {
            const fEl = document.getElementById('sl-from'); if (fEl) fEl.value = '';
            const tEl = document.getElementById('sl-to');   if (tEl) tEl.value = '';
        };
        // default = year
        slSetRange('year');

        let filtered = [];
        const balanceCache = {};

        async function getEmpBalance(uid) {
            if (balanceCache[uid]) return balanceCache[uid];
            try {
                const snap = await getDoc(doc(db,'artifacts',APP_ID,'public','data','leave_balances',uid));
                balanceCache[uid] = snap.exists() ? snap.data() : {};
            } catch { balanceCache[uid] = {}; }
            return balanceCache[uid];
        }

        async function renderBalance(uid) {
            const box = document.getElementById('sl-balance');
            if (!box) return;
            if (!uid) { box.classList.add('hidden'); box.innerHTML = ''; return; }
            const emp = empMap[uid];
            if (!emp) { box.classList.add('hidden'); return; }
            box.classList.remove('hidden');
            box.innerHTML = `<div class="bg-white rounded-2xl border border-zinc-200 p-5">
                <div class="flex items-center gap-2 mb-3 text-zinc-400 text-xs">
                    <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดโควต้าของ ${emp.name}...
                </div>
            </div>`;

            const bal = await getEmpBalance(uid);
            const sched = schedMap[uid] || null;
            const hpd = sched ? getDayWorkHours(sched) : 8;
            const trackable = ['sick','personal','vacation','maternity','ordain','military'];

            const cards = trackable.map(tid => {
                const t   = getLeaveTypeInfo(tid);
                const cv  = colorVariants(t.color);
                const b   = bal[tid] || {};
                const totalH = b.totalHours != null ? b.totalHours : Math.round(t.maxDays * hpd * 100) / 100;
                const usedH  = b.usedHours  || 0;
                const remH   = Math.max(0, totalH - usedH);
                const pct    = totalH > 0 ? Math.min(100, Math.round(usedH/totalH*100)) : 0;
                const barColor = pct >= 100 ? 'bg-red-400' : pct > 80 ? 'bg-orange-400' : 'bg-green-400';
                return `<div class="border border-zinc-200 rounded-xl p-3.5">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg ${cv.badge}">
                            <i class="fa-solid ${t.icon} text-xs"></i>
                        </span>
                        <span class="font-black text-xs text-zinc-700">${t.label}</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-zinc-400 font-bold mb-1">
                        <span>คงเหลือ</span>
                        <span class="text-zinc-700">${balanceToDisplay(remH, sched)}</span>
                    </div>
                    <div class="w-full bg-zinc-100 rounded-full h-1.5 mb-1.5">
                        <div class="h-1.5 rounded-full ${barColor} transition-all" style="width:${pct}%"></div>
                    </div>
                    <div class="flex justify-between text-[10px] text-zinc-400 font-medium">
                        <span>ใช้ ${balanceToDisplay(usedH, sched)}</span>
                        <span>จาก ${balanceToDisplay(totalH, sched)}</span>
                    </div>
                </div>`;
            }).join('');

            const avatar = emp.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=f4f4f5&color=27272a&bold=true`;
            box.innerHTML = `<div class="bg-white rounded-2xl border border-zinc-200 p-5">
                <div class="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-100">
                    <img src="${avatar}" onerror="handleImgError(this)" data-name="${emp.name}" class="w-10 h-10 rounded-2xl object-cover border border-zinc-200">
                    <div class="min-w-0 flex-1">
                        <p class="font-black text-zinc-800 text-sm truncate">${emp.name}</p>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">${emp.employeeCode || ''} · ${emp.branch || ''}</p>
                    </div>
                    <span class="text-[10px] font-black text-zinc-400 uppercase tracking-widest"><i class="fa-solid fa-calendar-check mr-1 text-yellow-500"></i> โควต้าวันลาคงเหลือ</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">${cards}</div>
            </div>`;
        }

        window.slApply = () => {
            const uid    = document.getElementById('sl-emp')?.value;
            const br     = document.getElementById('sl-branch')?.value;
            const type   = document.getElementById('sl-type')?.value;
            const status = document.getElementById('sl-status')?.value;
            const from   = document.getElementById('sl-from')?.value;
            const to     = document.getElementById('sl-to')?.value;

            filtered = allReqs.filter(r => {
                if (uid && r.uid !== uid) return false;
                if (br && r.branch !== br) return false;
                if (type && r.type !== type) return false;
                if (status && r.status !== status) return false;
                // ช่วงวันที่ — ทับซ้อนกับ [from..to]
                if (from && r.endDate   && r.endDate   < from) return false;
                if (to   && r.startDate && r.startDate > to)   return false;
                return true;
            });

            renderBalance(uid);
            renderStats(filtered);
            renderList(filtered);
        };

        function fmtDate(ds) {
            if (!ds) return '-';
            const d = ds.length === 10 ? new Date(ds+'T12:00:00+07:00') : new Date(ds);
            return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
        }

        function renderStats(list) {
            const setT = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
            setT('sl-stat-total', list.length);
            setT('sl-stat-pending', list.filter(r=>r.status==='pending').length);
            setT('sl-stat-approved', list.filter(r=>r.status==='approved').length);
            const totalHrs = list.filter(r=>r.status==='approved').reduce((s,r)=>s+(r.totalHours||0),0);
            setT('sl-stat-hours', totalHrs.toFixed(1));
        }

        function renderList(list) {
            const el = document.getElementById('sl-list');
            if (!el) return;
            if (!list.length) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300 bg-white rounded-2xl border border-zinc-200">
                    <i class="fa-regular fa-folder-open text-5xl mb-3"></i>
                    <p class="font-bold text-sm">ไม่พบประวัติการลา</p>
                </div>`; return;
            }
            el.innerHTML = list.map(r => {
                const t  = getLeaveTypeInfo(r.type);
                const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                const cv = colorVariants(t.color);
                const dateRange = r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`;
                const timeRange = r.isHourly ? ` เวลา ${r.startTime}–${r.endTime}` : ' (เต็มวัน)';
                const sched = schedMap[r.uid] || null;
                const hrsDisplay = hoursToDisplay(r.totalHours, sched);
                const avatar = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.employeeName||'?')}&background=f4f4f5&color=27272a&bold=true`;
                return `
                <div class="bg-white rounded-2xl border border-zinc-200 p-4 lg:p-5">
                  <div class="flex flex-col lg:flex-row gap-3">
                    <div class="flex items-center gap-3 lg:w-56 shrink-0">
                      <img src="${avatar}" onerror="handleImgError(this)" data-name="${r.employeeName||''}" class="w-10 h-10 rounded-2xl object-cover border border-zinc-200">
                      <div class="min-w-0">
                        <p class="font-black text-zinc-800 text-sm truncate">${r.employeeName||'-'}</p>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">${r.employeeCode||''}</p>
                        <p class="text-[10px] text-zinc-400">${r.branch||''}</p>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex flex-wrap items-center gap-2 mb-1.5">
                        <span class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${cv.badge}">
                          <i class="fa-solid ${t.icon}"></i> ${t.label}
                        </span>
                        <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${st.badge}">
                          <i class="fa-solid ${st.icon} mr-1"></i>${st.label}
                        </span>
                        <span class="ml-auto font-black text-zinc-800 text-sm">${hrsDisplay}</span>
                      </div>
                      <p class="text-sm font-bold text-zinc-600">${dateRange}${timeRange}</p>
                      <p class="text-xs text-zinc-400 mt-1 line-clamp-2">${r.reason||''}</p>
                      ${r.attachment ? `<a href="${r.attachment}" target="_blank" class="text-xs text-yellow-600 hover:text-yellow-700 font-bold mt-1 inline-flex items-center gap-1"><i class="fa-solid fa-paperclip"></i> ดูเอกสารแนบ</a>` : ''}
                      ${r.approverNote ? `<p class="text-xs text-zinc-500 mt-1 bg-zinc-50 px-3 py-1.5 rounded-lg border"><i class="fa-solid fa-comment mr-1 text-zinc-400"></i>${r.approverNote}</p>` : ''}
                    </div>
                    <div class="shrink-0 text-right text-xs lg:w-40">
                      ${(r.status==='approved'||r.status==='rejected') ? `
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">${r.status==='approved'?'อนุมัติโดย':'ดำเนินการโดย'}</p>
                        <p class="font-bold text-zinc-600 text-xs">${r.approvedBy||'-'}</p>
                        <p class="text-[10px] text-zinc-400">${r.approvedAt?fmtDate(r.approvedAt):''}</p>
                      ` : r.status==='cancelled' ? `
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">ยกเลิกโดย</p>
                        <p class="font-bold text-zinc-600 text-xs">${r.cancelledBy||r.employeeName||'-'}</p>
                        <p class="text-[10px] text-zinc-400">${r.cancelledAt?fmtDate(r.cancelledAt):''}</p>
                      ` : `
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">ขอเมื่อ</p>
                        <p class="font-bold text-zinc-600 text-xs">${r.createdAt?fmtDate(r.createdAt):'-'}</p>
                      `}
                    </div>
                  </div>
                </div>`;
            }).join('');
        }

        window.slExport = () => {
            if (!filtered.length) { showToast('ไม่มีข้อมูลให้ Export', 'error'); return; }
            const header = ['EmployeeCode','Name','Branch','Type','StartDate','EndDate','Hours','Status','Reason','ApprovedBy','ApprovedAt'];
            const lines = [header.join(',')];
            const esc = s => `"${String(s||'').replace(/"/g,'""')}"`;
            filtered.forEach(r => {
                lines.push([
                    r.employeeCode||'',
                    esc(r.employeeName),
                    esc(r.branch),
                    esc(r.typeName||r.type),
                    r.startDate||'',
                    r.endDate||'',
                    r.totalHours||0,
                    r.status||'',
                    esc(r.reason),
                    esc(r.approvedBy),
                    r.approvedAt||''
                ].join(','));
            });
            const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `leaves_${(document.getElementById('sl-from').value||'all')}_${(document.getElementById('sl-to').value||'all')}.csv`;
            a.click(); URL.revokeObjectURL(url);
        };

        // โหลดครั้งแรก
        slApply();

        return () => {
            ['slSetRange','slClearRange','slApply','slExport'].forEach(k => delete window[k]);
        };
    }
};
