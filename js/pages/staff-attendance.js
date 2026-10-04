// หน้า "ประวัติเวลา (ทีม)" (หัวหน้า)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// วันหยุด/ประเภทลา/ระยะทาง import จาก module
// ส่วน officeFor กับ loadBranchLocations ผูกกับแคชพิกัดสาขาใน app.html จึงอยู่บน window

import { isPublicHoliday } from '../lib/holidays.js?v=20261004c';
import { getLeaveTypeInfo } from '../lib/leave-types.js?v=20261004c';
import { distanceMeters } from '../lib/geo.js?v=20261004c';
import { workDaySetOn } from '../lib/work-days.js?v=20261004c';

export default {
    title: 'ประวัติเวลา (ทีม)',
    html: `
<style>
.sa-row:hover { background:var(--ls-bg); }
.sa-chip { font-size:10px; font-weight:800; padding:2px 8px; border-radius:9999px; }
/* ไม่ใช้ grid-cols-3/4 เพราะ app.html บังคับเหลือ 2 คอลัมน์บนมือถือ */
.sa-g3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); }
.sa-g4 { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
.sa-stat { background:var(--ls-bg); border-radius:.6rem; padding:.35rem .25rem; text-align:center; }
.sa-stat b { display:block; font-size:.95rem; font-weight:900; line-height:1.2; }
.sa-stat span { display:block; font-size:9px; font-weight:700; color:var(--ls-faint); }
</style>
<div class="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-lg sm:text-2xl font-black text-slate-800 uppercase tracking-tight">ประวัติการลงเวลาของทีม</h2>
      <p class="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">ตรวจสอบประวัติเข้า-ออกงานของพนักงานทุกคนย้อนหลัง</p>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    <div>
      <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">พนักงาน</label>
      <select id="sa-emp" class="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-brand-500 focus:outline-none">
        <option value="">— ทุกคน —</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">สาขา</label>
      <select id="sa-branch" class="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-brand-500 focus:outline-none">
        <option value="">— ทุกสาขา —</option>
      </select>
    </div>
    <div>
      <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">วันที่เริ่ม</label>
      <input type="date" id="sa-from" class="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-brand-500 focus:outline-none">
    </div>
    <div>
      <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">วันที่สิ้นสุด</label>
      <input type="date" id="sa-to" class="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-brand-500 focus:outline-none">
    </div>
    <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2 justify-end">
      <button onclick="saSetRange('today')" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">วันนี้</button>
      <button onclick="saSetRange('week')" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">7 วันล่าสุด</button>
      <button onclick="saSetRange('month')" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">เดือนนี้</button>
      <button onclick="saSetRange('lastMonth')" class="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">เดือนก่อน</button>
      <button onclick="saLoad()" class="text-xs font-black bg-panel-900 hover:bg-panel-800 text-brand-400 px-4 py-1.5 rounded-lg">
        <i class="fa-solid fa-magnifying-glass mr-1"></i> ค้นหา
      </button>
      <button onclick="saExport()" class="text-xs font-black bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg">
        <i class="fa-solid fa-file-arrow-down mr-1"></i> Export CSV
      </button>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
    <div class="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p class="text-2xl font-black text-slate-800" id="sa-stat-emp">-</p>
      <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">พนักงานที่มีบันทึก</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p class="text-2xl font-black text-green-600" id="sa-stat-days">-</p>
      <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">รวมวันทำงาน</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p class="text-2xl font-black text-brand-600" id="sa-stat-hours">-</p>
      <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">รวมชั่วโมงทำงาน</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 p-4 text-center">
      <p class="text-2xl font-black text-red-500" id="sa-stat-incomplete">-</p>
      <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">ขาดงาน</p>
    </div>
    <div class="bg-white rounded-2xl border border-slate-200 p-4 text-center col-span-2 sm:col-span-1">
      <p class="text-2xl font-black text-orange-500" id="sa-stat-outside">-</p>
      <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">ลงเวลานอกออฟฟิศ</p>
    </div>
  </div>

  <!-- Results -->
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <div class="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2 justify-between items-center bg-slate-50">
      <p class="font-black text-slate-700 text-sm uppercase tracking-widest"><i class="fa-solid fa-list-ul text-brand-500 mr-2"></i> ผลลัพธ์</p>
      <div class="flex items-center gap-3">
        <div class="flex bg-slate-200 p-0.5 rounded-lg">
          <button id="sa-view-daily" onclick="saSetView('daily')" class="text-[11px] font-black px-3 py-1 rounded-md bg-white text-slate-800 shadow-sm">รายวัน</button>
          <button id="sa-view-summary" onclick="saSetView('summary')" class="text-[11px] font-black px-3 py-1 rounded-md text-slate-500">สรุปรายคน</button>
        </div>
        <span class="text-xs font-bold text-slate-500" id="sa-count">-</span>
      </div>
    </div>
    <!-- มือถือ: การ์ดรายการแทนตาราง 8–12 คอลัมน์ที่ต้องเลื่อนข้าง  /  sm ขึ้นไป: ตารางเดิม -->
    <div id="sa-daily-wrap">
      <div id="sa-daily-cards" class="sm:hidden divide-y divide-slate-100">
        <div class="text-center py-16 text-slate-300"><i class="fa-regular fa-clock text-4xl mb-3 block"></i><span class="font-bold text-sm">เลือกช่วงวันที่แล้วกด "ค้นหา"</span></div>
      </div>
      <div class="hidden sm:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-widest">
          <tr>
            <th class="px-4 py-2 text-left font-black">วันที่</th>
            <th class="px-4 py-2 text-left font-black">พนักงาน</th>
            <th class="px-4 py-2 text-left font-black">รหัส</th>
            <th class="px-4 py-2 text-left font-black">สาขา</th>
            <th class="px-4 py-2 text-center font-black">เข้างาน</th>
            <th class="px-4 py-2 text-center font-black">ออกงาน</th>
            <th class="px-4 py-2 text-right font-black">ชั่วโมง</th>
            <th class="px-4 py-2 text-center font-black">สถานะ</th>
          </tr>
        </thead>
        <tbody id="sa-tbody">
          <tr><td colspan="8" class="text-center py-16 text-slate-300"><i class="fa-regular fa-clock text-4xl mb-3 block"></i><span class="font-bold text-sm">เลือกช่วงวันที่แล้วกด "ค้นหา"</span></td></tr>
        </tbody>
      </table>
      </div>
    </div>
    <div class="hidden" id="sa-summary-wrap">
      <div id="sa-summary-cards" class="sm:hidden divide-y divide-slate-100"></div>
      <div class="hidden sm:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-widest">
          <tr>
            <th class="px-4 py-2 text-left font-black">พนักงาน</th>
            <th class="px-4 py-2 text-left font-black">สาขา</th>
            <th class="px-4 py-2 text-center font-black">มาทำงาน</th>
            <th class="px-4 py-2 text-center font-black">สาย<br><span class="text-[9px] font-medium normal-case">(>15น.)</span></th>
            <th class="px-4 py-2 text-center font-black">ออกก่อน</th>
            <th class="px-4 py-2 text-center font-black">ไม่ครบ</th>
            <th class="px-4 py-2 text-center font-black">ขาด</th>
            <th class="px-4 py-2 text-center font-black">ลา</th>
            <th class="px-4 py-2 text-center font-black">OT</th>
            <th class="px-4 py-2 text-center font-black">นอกพื้นที่</th>
            <th class="px-4 py-2 text-right font-black">นาทีสาย<br><span class="text-[9px] font-medium normal-case">(สาย+ออกก่อน)</span></th>
            <th class="px-4 py-2 text-right font-black">รวม ชม.</th>
          </tr>
        </thead>
        <tbody id="sa-summary-tbody"></tbody>
      </table>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') { navigateTo('home'); return; }
        const { collection, getDocs, query, where, orderBy }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        // โหลดพนักงาน + schedule + leave (approved) + กะงาน + พิกัดสาขา
        const [empSnap, schedSnap, leaveSnap, shiftSnap] = await Promise.all([
            getDocs(col('users')),
            getDocs(col('work_schedules')),
            getDocs(query(col('leave_requests'), where('status','==','approved'))),
            getDocs(col('shifts')),
            loadBranchLocations(),
        ]);
        const shiftMap = {};
        shiftSnap.forEach(d => shiftMap[d.id] = d.data());

        // เวลาเข้า-ออก-พัก ที่มีผลจริงของวันนั้น (กะรายวัน > ตารางปกติ)
        function effTimes(sched, dow) {
            const sid = sched && sched.shiftByDay ? sched.shiftByDay[dow] : null;
            const sh = sid ? shiftMap[sid] : null;
            return {
                start: (sh && sh.start) || (sched && sched.workStart) || null,
                end:   (sh && sh.end)   || (sched && sched.workEnd)   || null,
                breakMinutes: sh && sh.breakMinutes != null ? sh.breakMinutes
                    : (sched && sched.breakMinutes != null ? sched.breakMinutes : 60),
                shiftName: sh ? sh.name : null,
            };
        }
        const employees = empSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(e => e.name);
        employees.sort((a,b)=>a.name.localeCompare(b.name,'th'));
        const empMap = Object.fromEntries(employees.map(e => [e.uid, e]));

        const schedMap = {};
        schedSnap.forEach(d => schedMap[d.id] = d.data());
        const allApprovedLeaves = leaveSnap.docs.map(d => d.data());

        // populate selects
        const empSel = document.getElementById('sa-emp');
        if (empSel) {
            employees.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.uid;
                opt.textContent = `${e.name}${e.employeeCode?` (${e.employeeCode})`:''}`;
                empSel.appendChild(opt);
            });
        }
        const branches = [...new Set(employees.map(e=>e.branch).filter(Boolean))].sort();
        const brSel = document.getElementById('sa-branch');
        if (brSel) {
            branches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b; opt.textContent = b;
                brSel.appendChild(opt);
            });
        }

        // default range = this month
        window.saSetRange = (mode) => {
            const now = newDateTH();
            let from, to;
            if (mode === 'today') { from = to = dateToTHStr(now); }
            else if (mode === 'week') {
                const d = new Date(now); d.setDate(d.getDate() - 6);
                from = dateToTHStr(d); to = dateToTHStr(now);
            } else if (mode === 'lastMonth') {
                const y = now.getFullYear(), m = now.getMonth() - 1;
                const first = new Date(y, m, 1);
                const last  = new Date(y, m + 1, 0);
                from = dateToTHStr(first); to = dateToTHStr(last);
            } else { // month
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                from = dateToTHStr(first); to = dateToTHStr(last);
            }
            const fEl = document.getElementById('sa-from'); if (fEl) fEl.value = from;
            const tEl = document.getElementById('sa-to');   if (tEl) tEl.value = to;
        };
        saSetRange('month');

        let lastRows = [];

        window.saLoad = async () => {
            const from = document.getElementById('sa-from')?.value;
            const to   = document.getElementById('sa-to')?.value;
            const uid  = document.getElementById('sa-emp')?.value;
            const br   = document.getElementById('sa-branch')?.value;
            if (!from || !to) { showToast('กรุณาเลือกช่วงวันที่', 'error'); return; }
            if (from > to)    { showToast('วันที่เริ่มต้องไม่หลังวันที่สิ้นสุด', 'error'); return; }

            const tbody = document.getElementById('sa-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-slate-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></td></tr>`;
            setCardsMsg(`<i class="fa-solid fa-spinner fa-spin text-3xl"></i>`);

            try {
                // query ตาม date range อย่างเดียว (เลี่ยง composite index)
                // แล้ว filter uid/branch ฝั่ง client
                const qRef = query(col('time_logs'),
                    where('localDate','>=',from),
                    where('localDate','<=',to));
                const logSnap = await getDocs(qRef);
                let logs = logSnap.docs.map(d => d.data());

                if (uid) logs = logs.filter(l => l.uid === uid);
                if (br) {
                    logs = logs.filter(l => {
                        const emp = empMap[l.uid];
                        return emp && emp.branch === br;
                    });
                }

                // group logs by uid+localDate
                const groups = {};
                logs.forEach(l => {
                    if (!l.uid || !l.localDate) return;
                    const k = l.uid + '|' + l.localDate;
                    if (!groups[k]) groups[k] = { ins: [], outs: [], branch: l.branch || '' };
                    if (l.type === 'clock_in')  groups[k].ins.push(l);
                    if (l.type === 'clock_out') groups[k].outs.push(l);
                });

                // ขอบเขตพนักงาน (ตาม filter)
                let empsInScope = employees;
                if (uid) empsInScope = empsInScope.filter(e => e.uid === uid);
                if (br)  empsInScope = empsInScope.filter(e => e.branch === br);
                empsInScope = empsInScope.filter(e => e.status !== 'resigned');

                // สร้าง list วันในช่วง
                const days = [];
                {
                    let d = parseDateTH(from);
                    const endD = parseDateTH(to);
                    const todayStr = todayTH();
                    while (d <= endD) {
                        const ds = dateToTHStr(d);
                        if (ds <= todayStr) days.push(ds); // ไม่ generate วันอนาคต
                        const nx = new Date(d); nx.setDate(nx.getDate()+1); d = nx;
                    }
                }

                // index วันลา: uid → date → leave
                const leaveByUid = {};
                allApprovedLeaves.forEach(l => {
                    if (!l.uid || !l.startDate || !l.endDate) return;
                    if (l.endDate < from || l.startDate > to) return;
                    if (!leaveByUid[l.uid]) leaveByUid[l.uid] = {};
                    let d = parseDateTH(l.startDate);
                    const e = parseDateTH(l.endDate);
                    while (d <= e) {
                        leaveByUid[l.uid][dateToTHStr(d)] = l;
                        const nx = new Date(d); nx.setDate(nx.getDate()+1); d = nx;
                    }
                });

                const DOW_TH = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];
                const rows = [];
                empsInScope.forEach(emp => {
                    const sched = schedMap[emp.uid] || null;
                    const empOffice = officeFor(emp.branch);
                    const personalHolSet = new Set((sched && Array.isArray(sched.holidays)) ? sched.holidays : []);
                    const empLeaves = leaveByUid[emp.uid] || {};

                    days.forEach(ds => {
                        const dow  = parseDateTH(ds).getDay();
                        const isPubHol  = isPublicHoliday(ds);
                        const isPersHol = personalHolSet.has(ds);
                        // วันทำงานตามช่วงเวลา — เปลี่ยนวันหยุดแล้วต้องไม่ย้อนไปเปลี่ยนสถานะวันเก่า
                        const isWorkDay = workDaySetOn(sched, ds).has(dow) && !isPubHol && !isPersHol;
                        const leave = empLeaves[ds];

                        const g = groups[emp.uid + '|' + ds];
                        let inFirst, outLast;
                        if (g) {
                            g.ins.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
                            g.outs.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
                            inFirst = g.ins[0];
                            outLast = g.outs[g.outs.length-1];
                        }

                        // เวลาอ้างอิงของวันนี้ — ใช้กะรายวันถ้ามี ไม่งั้นใช้ตารางปกติ
                        const eff = effTimes(sched, dow);
                        const LATE_GRACE_MIN = 15;     // มาช้าได้ไม่เกิน 15 นาทีถึงไม่ติดสถานะ "สาย"
                        const toMin = (hhmm) => {
                            const [h, m] = String(hhmm||'').split(':').map(Number);
                            return (h || 0) * 60 + (m || 0);
                        };
                        let hours = 0, isLate = false, isEarlyOut = false;
                        let lateMinutes = 0, earlyOutMinutes = 0;
                        if (inFirst && outLast) {
                            const ms = new Date(outLast.timestamp) - new Date(inFirst.timestamp);
                            hours = Math.max(0, ms/3600000 - eff.breakMinutes/60);
                        }
                        if (inFirst && eff.start && isWorkDay) {
                            const inT = new Date(inFirst.timestamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});
                            const diff = toMin(inT) - toMin(eff.start);
                            if (diff > 0) {
                                lateMinutes = diff;                    // เก็บนาทีสายจริง
                                isLate = diff > LATE_GRACE_MIN;        // status "สาย" เฉพาะเกิน 15 นาที
                            }
                        }
                        if (outLast && eff.end && isWorkDay) {
                            const outT = new Date(outLast.timestamp).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'});
                            const diff = toMin(eff.end) - toMin(outT);
                            if (diff > 0) {
                                earlyOutMinutes = diff;
                                isEarlyOut = true;
                            }
                        }
                        const totalLateMin = lateMinutes + earlyOutMinutes;   // นาทีสาย + ออกก่อน รวม

                        // กำหนดสถานะ
                        let status, statusCls;
                        const hasLog = !!(inFirst || outLast);
                        if (!hasLog) {
                            if (leave) {
                                const t = getLeaveTypeInfo(leave.type);
                                status = 'ลา' + (t.label.replace(/^ลา/,'') || '');
                                statusCls = 'bg-blue-100 text-blue-700';
                            } else if (isPubHol) {
                                status = 'วันหยุดนักขัตฤกษ์';
                                statusCls = 'bg-red-100 text-red-700';
                            } else if (!isWorkDay) {
                                status = 'วันหยุด';
                                statusCls = 'bg-purple-100 text-purple-700';
                            } else {
                                status = 'ขาดงาน';
                                statusCls = 'bg-red-200 text-red-800';
                            }
                        } else if (!inFirst || !outLast) {
                            status = 'ไม่ครบ';
                            statusCls = 'bg-orange-100 text-orange-700';
                        } else if (!isWorkDay) {
                            status = 'วันโอที';
                            statusCls = 'bg-amber-100 text-amber-700';
                        } else if (isLate && isEarlyOut) {
                            status = 'สาย+ออกก่อน';
                            statusCls = 'bg-red-100 text-red-700';
                        } else if (isLate) {
                            status = 'สาย';
                            statusCls = 'bg-orange-100 text-orange-700';
                        } else if (isEarlyOut) {
                            status = 'ออกก่อน';
                            statusCls = 'bg-pink-100 text-pink-700';
                        } else {
                            status = 'ปกติ';
                            statusCls = 'bg-green-100 text-green-700';
                        }

                        // ข้าม "วันหยุด" / "วันหยุดนักขัตฤกษ์" ที่ไม่มีบันทึก (ลดความรก)
                        if (!hasLog && !leave && !isWorkDay) return;

                        const branchVal = emp.branch || (g && g.branch) || '';
                        rows.push({
                            date: ds,
                            dow: DOW_TH[dow],
                            uid: emp.uid,
                            name: emp.name,
                            code: emp.employeeCode || '',
                            branch: branchVal,
                            photoURL: emp.photoURL || '',
                            inTime: inFirst ? new Date(inFirst.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}) : '',
                            outTime: outLast ? new Date(outLast.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}) : '',
                            inLat:  inFirst && inFirst.lat != null ? inFirst.lat : null,
                            inLng:  inFirst && inFirst.lng != null ? inFirst.lng : null,
                            inAcc:  inFirst && inFirst.accuracy != null ? inFirst.accuracy : null,
                            inDist: inFirst && inFirst.lat != null && inFirst.lng != null
                                ? (inFirst.distanceM != null ? inFirst.distanceM : Math.round(distanceMeters(inFirst.lat, inFirst.lng, empOffice.lat, empOffice.lng)))
                                : null,
                            inOutside: !!(inFirst && inFirst.lat != null && inFirst.lng != null && (
                                inFirst.outsideOffice != null
                                    ? inFirst.outsideOffice
                                    : distanceMeters(inFirst.lat, inFirst.lng, empOffice.lat, empOffice.lng) > empOffice.radius
                            )),
                            inDenied:   !!(inFirst && inFirst.locationDenied),
                            outLat: outLast && outLast.lat != null ? outLast.lat : null,
                            outLng: outLast && outLast.lng != null ? outLast.lng : null,
                            outAcc: outLast && outLast.accuracy != null ? outLast.accuracy : null,
                            outDist: outLast && outLast.lat != null && outLast.lng != null
                                ? (outLast.distanceM != null ? outLast.distanceM : Math.round(distanceMeters(outLast.lat, outLast.lng, empOffice.lat, empOffice.lng)))
                                : null,
                            outOutside: !!(outLast && outLast.lat != null && outLast.lng != null && (
                                outLast.outsideOffice != null
                                    ? outLast.outsideOffice
                                    : distanceMeters(outLast.lat, outLast.lng, empOffice.lat, empOffice.lng) > empOffice.radius
                            )),
                            outDenied:  !!(outLast && outLast.locationDenied),
                            hours,
                            shift: eff.shiftName,
                            complete: !!(inFirst && outLast),
                            isLate,
                            isEarlyOut,
                            lateMinutes,
                            earlyOutMinutes,
                            totalLateMin,
                            isOT: hasLog && !isWorkDay,
                            isAbsent: !hasLog && !leave && isWorkDay,
                            isLeave: !hasLog && !!leave,
                            status,
                            statusCls,
                        });
                    });
                });

                rows.sort((a,b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name,'th'));

                lastRows = rows;
                renderRows(rows);
            } catch (e) {
                console.error('saLoad:', e);
                if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-12 text-red-400 text-sm font-bold">โหลดข้อมูลไม่ได้: ${e.message}</td></tr>`;
                setCardsMsg(`<span class="text-red-400 text-sm font-bold">โหลดข้อมูลไม่ได้: ${e.message}</span>`);
            }
        };

        function setCardsMsg(html) {
            ['sa-daily-cards','sa-summary-cards'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<div class="text-center py-12 text-slate-300">${html}</div>`;
            });
        }

        function renderRows(rows) {
            const tbody = document.getElementById('sa-tbody');
            const cnt = document.getElementById('sa-count');
            if (cnt) cnt.textContent = (typeof saView !== 'undefined' && saView === 'summary')
                ? buildSummary(rows).length + ' คน'
                : rows.length + ' รายการ';
            if (typeof saView !== 'undefined' && saView === 'summary') renderSummary(rows);

            // stats
            const empSet = new Set(rows.filter(r=>r.complete||!r.isAbsent).map(r=>r.uid));
            const workDays = rows.filter(r=>r.complete).length;
            const totalHours = rows.reduce((s,r)=>s+r.hours,0);
            const absentCount = rows.filter(r=>r.isAbsent).length;
            const setT = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
            const outsideCount = rows.filter(r => r.inOutside || r.outOutside).length;
            setT('sa-stat-emp', new Set(rows.map(r=>r.uid)).size);
            setT('sa-stat-days', workDays);
            setT('sa-stat-hours', totalHours.toFixed(1));
            setT('sa-stat-incomplete', absentCount);
            setT('sa-stat-outside', outsideCount);

            if (!tbody) return;
            if (!rows.length) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-16 text-slate-300"><i class="fa-regular fa-folder-open text-4xl mb-3 block"></i><span class="font-bold text-sm">ไม่พบประวัติในช่วงนี้</span></td></tr>`;
                setCardsMsg(`<i class="fa-regular fa-folder-open text-4xl mb-3 block"></i><span class="font-bold text-sm">ไม่พบประวัติในช่วงนี้</span>`);
                return;
            }
            const timeCell = (time, lat, lng, acc, dist, outside, colorCls, deltaMin, deltaKind) => {
                if (!time) return '<span class="font-mono font-black text-slate-300">—</span>';
                const hasGps = lat != null && lng != null;
                const distTxt = dist != null
                    ? (dist < 1000 ? `${Math.round(dist)}ม.` : `${(dist/1000).toFixed(1)}กม.`)
                    : '';
                const linkColor = outside ? 'text-red-600 hover:text-red-700' : 'text-brand-600 hover:text-brand-700';
                const linkIcon  = outside ? 'fa-triangle-exclamation' : 'fa-map-location-dot';
                const linkLabel = outside ? `นอกออฟฟิศ ${distTxt}` : (distTxt ? `ในออฟฟิศ ${distTxt}` : 'ดูแผนที่');
                const mapLink = hasGps
                    ? `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="text-[10px] font-bold inline-flex items-center gap-1 mt-0.5 ${linkColor}" title="ความแม่นยำ ±${acc?Math.round(acc):'?'}ม.">
                          <i class="fa-solid ${linkIcon}"></i> ${linkLabel}
                       </a>`
                    : `<span class="text-[10px] font-bold text-red-400 mt-0.5 inline-flex items-center gap-1">
                          <i class="fa-solid fa-location-crosshairs"></i> ไม่มี GPS
                       </span>`;
                // ป้ายนาทีสาย/ออกก่อน (แสดงเสมอเมื่อมี — แม้ไม่เกิน grace period)
                let deltaBadge = '';
                if (deltaMin > 0) {
                    if (deltaKind === 'late') {
                        const isHard = deltaMin > 15;     // เกิน grace
                        deltaBadge = `<span class="text-[10px] font-black mt-0.5 px-1.5 py-0.5 rounded ${isHard?'bg-orange-100 text-orange-700':'bg-slate-100 text-slate-500'}" title="${isHard?'สาย':'สายในช่วง grace'}">
                            +${deltaMin} นาที${isHard?'':' (ในช่วงผ่อนผัน)'}
                        </span>`;
                    } else {
                        deltaBadge = `<span class="text-[10px] font-black mt-0.5 px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                            ออกก่อน ${deltaMin} นาที
                        </span>`;
                    }
                }
                return `<div class="flex flex-col items-center gap-0.5">
                    <span class="font-mono font-black ${colorCls}">${time}</span>
                    ${deltaBadge}
                    ${mapLink}
                </div>`;
            };
            tbody.innerHTML = rows.map(r => {
                const dateLabel = new Date(r.date+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
                const avatar = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f4f4f5&color=27272a&bold=true`;
                const rowBg = r.isAbsent ? 'bg-red-50/60' : r.isOT ? 'bg-amber-50/60' : r.isLeave ? 'bg-blue-50/40' : '';
                return `<tr class="sa-row border-b border-slate-100 ${rowBg}">
                    <td class="px-4 py-3 whitespace-nowrap">
                        <div class="font-bold text-slate-700 text-xs">${dateLabel}</div>
                        <div class="text-[10px] font-black text-slate-400 uppercase">${r.dow}${r.shift ? ` · <span class="text-indigo-500">${r.shift}</span>` : ''}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                            <img src="${avatar}" onerror="handleImgError(this)" data-name="${r.name}" class="w-7 h-7 rounded-full object-cover border border-slate-200">
                            <span class="font-bold text-slate-800 text-xs">${r.name}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-slate-500 text-xs font-bold">${r.code||'-'}</td>
                    <td class="px-4 py-3 text-slate-500 text-xs">${r.branch||'-'}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">${timeCell(r.inTime, r.inLat, r.inLng, r.inAcc, r.inDist, r.inOutside, 'text-green-700', r.lateMinutes, 'late')}</td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">${timeCell(r.outTime, r.outLat, r.outLng, r.outAcc, r.outDist, r.outOutside, 'text-red-600', r.earlyOutMinutes, 'early')}</td>
                    <td class="px-4 py-3 text-right font-bold text-slate-700">${r.hours?r.hours.toFixed(2):'-'}</td>
                    <td class="px-4 py-3 text-center"><span class="sa-chip ${r.statusCls}">${r.status}</span></td>
                </tr>`;
            }).join('');

            const cards = document.getElementById('sa-daily-cards');
            if (cards) cards.innerHTML = rows.map(r => {
                const dateLabel = new Date(r.date+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit',timeZone:'Asia/Bangkok'});
                const avatar = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f4f4f5&color=27272a&bold=true`;
                const rowBg = r.isAbsent ? 'bg-red-50/60' : r.isOT ? 'bg-amber-50/60' : r.isLeave ? 'bg-blue-50/40' : '';
                return `<div class="px-4 py-3 ${rowBg}">
                    <div class="flex items-start gap-2.5">
                        <img src="${avatar}" onerror="handleImgError(this)" data-name="${r.name}" class="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-2">
                                <p class="font-bold text-slate-800 text-sm leading-tight">${r.name}</p>
                                <span class="sa-chip ${r.statusCls} shrink-0">${r.status}</span>
                            </div>
                            <p class="text-[11px] text-slate-500 font-bold mt-0.5">${dateLabel} · ${r.dow}${r.shift ? ` · <span class="text-indigo-500">${r.shift}</span>` : ''}</p>
                            <p class="text-[10px] text-slate-400">${r.code||'-'} · ${r.branch||'-'}</p>
                        </div>
                    </div>
                    ${(r.inTime || r.outTime) ? `<div class="sa-g3 gap-2 mt-2.5 bg-white/70 rounded-xl border border-slate-100 py-2 px-1">
                        <div class="text-center"><p class="text-[9px] font-black text-slate-400 uppercase">เข้างาน</p>${timeCell(r.inTime, r.inLat, r.inLng, r.inAcc, r.inDist, r.inOutside, 'text-green-700', r.lateMinutes, 'late')}</div>
                        <div class="text-center"><p class="text-[9px] font-black text-slate-400 uppercase">ออกงาน</p>${timeCell(r.outTime, r.outLat, r.outLng, r.outAcc, r.outDist, r.outOutside, 'text-red-600', r.earlyOutMinutes, 'early')}</div>
                        <div class="text-center"><p class="text-[9px] font-black text-slate-400 uppercase">ชั่วโมง</p><span class="font-mono font-black text-slate-700">${r.hours?r.hours.toFixed(2):'—'}</span></div>
                    </div>` : ''}
                </div>`;
            }).join('');
        }

        // ── สรุปรายคน ─────────────────────────────────────────
        let saView = 'daily';

        function buildSummary(rows) {
            const byUid = {};
            rows.forEach(r => {
                if (!byUid[r.uid]) byUid[r.uid] = {
                    uid: r.uid, name: r.name, code: r.code, branch: r.branch, photoURL: r.photoURL,
                    present: 0, late: 0, earlyOut: 0, incomplete: 0, absent: 0, leave: 0, ot: 0, outside: 0,
                    lateMin: 0, hours: 0,
                };
                const s = byUid[r.uid];
                if (r.isAbsent) s.absent++;
                else if (r.isLeave) s.leave++;
                else if (r.isOT) { s.ot++; s.hours += r.hours; }
                else if (!r.complete) s.incomplete++;
                else {
                    s.present++;
                    s.hours += r.hours;
                    if (r.isLate) s.late++;       // นับเฉพาะที่เกิน grace
                    if (r.isEarlyOut) s.earlyOut++;
                }
                // สะสมนาทีสาย + นาทีออกก่อน (ทุกแถวที่มี ไม่สนใจ grace)
                s.lateMin += (r.lateMinutes || 0) + (r.earlyOutMinutes || 0);
                if (r.inOutside || r.outOutside) s.outside++;
            });
            return Object.values(byUid).sort((a,b)=>a.name.localeCompare(b.name,'th'));
        }

        function renderSummary(rows) {
            const tbody = document.getElementById('sa-summary-tbody');
            if (!tbody) return;
            const sums = buildSummary(rows);
            const cards = document.getElementById('sa-summary-cards');
            if (!sums.length) {
                tbody.innerHTML = `<tr><td colspan="12" class="text-center py-16 text-slate-300 font-bold text-sm">ไม่พบข้อมูลในช่วงนี้</td></tr>`;
                if (cards) cards.innerHTML = `<div class="text-center py-16 text-slate-300 font-bold text-sm">ไม่พบข้อมูลในช่วงนี้</div>`;
                return;
            }
            const numCell = (v, cls) => v > 0
                ? `<td class="px-4 py-3 text-center font-black ${cls}">${v}</td>`
                : `<td class="px-4 py-3 text-center text-slate-300">-</td>`;
            const fmtLateMin = (m) => {
                if (!m) return '<td class="px-4 py-3 text-right text-slate-300">-</td>';
                const h = Math.floor(m / 60), mm = m % 60;
                const txt = h ? `${h} ชม. ${mm} น.` : `${mm} น.`;
                return `<td class="px-4 py-3 text-right font-black text-rose-600">${txt}</td>`;
            };
            tbody.innerHTML = sums.map(s => {
                const avatar = s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f4f4f5&color=27272a&bold=true`;
                return `<tr class="sa-row border-b border-slate-100">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                            <img src="${avatar}" onerror="handleImgError(this)" data-name="${s.name}" class="w-7 h-7 rounded-full object-cover border border-slate-200">
                            <div>
                                <p class="font-bold text-slate-800 text-xs">${s.name}</p>
                                <p class="text-[10px] text-slate-400 font-bold">${s.code||''}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-slate-500 text-xs">${s.branch||'-'}</td>
                    ${numCell(s.present, 'text-green-700')}
                    ${numCell(s.late, 'text-orange-600')}
                    ${numCell(s.earlyOut, 'text-pink-600')}
                    ${numCell(s.incomplete, 'text-orange-500')}
                    ${numCell(s.absent, 'text-red-600')}
                    ${numCell(s.leave, 'text-blue-600')}
                    ${numCell(s.ot, 'text-amber-600')}
                    ${numCell(s.outside, 'text-red-500')}
                    ${fmtLateMin(s.lateMin)}
                    <td class="px-4 py-3 text-right font-black text-slate-800">${s.hours.toFixed(1)}</td>
                </tr>`;
            }).join('');

            // มือถือ: การ์ดรายคน — ตัวเลข 0 เป็นสีจาง ให้ตาไปหยุดที่เรื่องที่ต้องดูจริง
            const stat = (v, label, cls) => `<div class="sa-stat"><b class="${v>0?cls:'text-slate-300'}">${v>0?v:'-'}</b><span>${label}</span></div>`;
            if (cards) cards.innerHTML = sums.map(s => {
                const avatar = s.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=f4f4f5&color=27272a&bold=true`;
                const lm = s.lateMin ? (Math.floor(s.lateMin/60) ? `${Math.floor(s.lateMin/60)} ชม. ${s.lateMin%60} น.` : `${s.lateMin} น.`) : '';
                return `<div class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                        <img src="${avatar}" onerror="handleImgError(this)" data-name="${s.name}" class="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-slate-800 text-sm leading-tight">${s.name}</p>
                            <p class="text-[10px] text-slate-400 font-bold">${s.code||'-'} · ${s.branch||'-'}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-black text-slate-800 leading-tight">${s.hours.toFixed(1)}</p>
                            <p class="text-[9px] font-bold text-slate-400">ชม. รวม</p>
                        </div>
                    </div>
                    <div class="sa-g4 gap-1.5 mt-2.5">
                        ${stat(s.present,'มาทำงาน','text-green-700')}
                        ${stat(s.late,'สาย','text-orange-600')}
                        ${stat(s.earlyOut,'ออกก่อน','text-pink-600')}
                        ${stat(s.incomplete,'ไม่ครบ','text-orange-500')}
                        ${stat(s.absent,'ขาด','text-red-600')}
                        ${stat(s.leave,'ลา','text-blue-600')}
                        ${stat(s.ot,'OT','text-amber-600')}
                        ${stat(s.outside,'นอกพื้นที่','text-red-500')}
                    </div>
                    ${lm ? `<p class="text-[11px] font-bold text-rose-600 mt-2"><i class="fa-regular fa-clock mr-1"></i>สาย + ออกก่อนรวม ${lm}</p>` : ''}
                </div>`;
            }).join('');
        }

        window.saSetView = (mode) => {
            saView = mode;
            const daily = mode === 'daily';
            document.getElementById('sa-daily-wrap')?.classList.toggle('hidden', !daily);
            document.getElementById('sa-summary-wrap')?.classList.toggle('hidden', daily);
            const db_ = document.getElementById('sa-view-daily');
            const sb_ = document.getElementById('sa-view-summary');
            if (db_) db_.className = `text-[11px] font-black px-3 py-1 rounded-md ${daily?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`;
            if (sb_) sb_.className = `text-[11px] font-black px-3 py-1 rounded-md ${!daily?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`;
            if (!daily) renderSummary(lastRows);
            const cnt = document.getElementById('sa-count');
            if (cnt) cnt.textContent = daily
                ? lastRows.length + ' รายการ'
                : buildSummary(lastRows).length + ' คน';
        };

        window.saExport = () => {
            if (window.blockedInLINE?.('Export CSV')) return;
            if (!lastRows.length) { showToast('ไม่มีข้อมูลให้ Export', 'error'); return; }
            if (saView === 'summary') { saExportSummary(); return; }
            const header = ['Date','DayOfWeek','EmployeeCode','Name','Branch','ClockIn','InLat','InLng','InAcc','InDistM','InOutside','LateMin','ClockOut','OutLat','OutLng','OutAcc','OutDistM','OutOutside','EarlyOutMin','TotalLateMin','InMapUrl','OutMapUrl','Hours','Status'];
            const lines = [header.join(',')];
            const esc = s => `"${String(s||'').replace(/"/g,'""')}"`;
            const mapUrl = (lat,lng) => (lat!=null && lng!=null) ? `https://www.google.com/maps?q=${lat},${lng}` : '';
            lastRows.forEach(r => {
                lines.push([
                    r.date, r.dow, r.code||'', esc(r.name), esc(r.branch),
                    r.inTime,  r.inLat??'',  r.inLng??'',  r.inAcc!=null?Math.round(r.inAcc):'',  r.inDist??'',  r.inOutside?'YES':'',  r.lateMinutes||0,
                    r.outTime, r.outLat??'', r.outLng??'', r.outAcc!=null?Math.round(r.outAcc):'', r.outDist??'', r.outOutside?'YES':'', r.earlyOutMinutes||0, r.totalLateMin||0,
                    esc(mapUrl(r.inLat,r.inLng)), esc(mapUrl(r.outLat,r.outLng)),
                    r.hours.toFixed(2), esc(r.status)
                ].join(','));
            });
            const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_${document.getElementById('sa-from').value}_${document.getElementById('sa-to').value}.csv`;
            a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); // iOS Safari ยังไม่ทันโหลดถ้า revoke ทันที
        };

        function saExportSummary() {
            const sums = buildSummary(lastRows);
            const header = ['EmployeeCode','Name','Branch','PresentDays','LateDays','EarlyOutDays','Incomplete','Absent','LeaveDays','OTDays','OutsideOffice','TotalLateMin','TotalHours'];
            const esc = s => `"${String(s||'').replace(/"/g,'""')}"`;
            const lines = [header.join(',')];
            sums.forEach(s => {
                lines.push([s.code||'', esc(s.name), esc(s.branch), s.present, s.late, s.earlyOut, s.incomplete, s.absent, s.leave, s.ot, s.outside, s.lateMin, s.hours.toFixed(2)].join(','));
            });
            const blob = new Blob(['﻿'+lines.join('\n')], { type:'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `attendance_summary_${document.getElementById('sa-from').value}_${document.getElementById('sa-to').value}.csv`;
            a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); // iOS Safari ยังไม่ทันโหลดถ้า revoke ทันที
        }

        // โหลดอัตโนมัติครั้งแรก
        saLoad();

        return () => {
            ['saSetRange','saLoad','saExport','saSetView'].forEach(k => delete window[k]);
        };
    }
};
