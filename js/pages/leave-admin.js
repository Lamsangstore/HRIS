// หน้า "ตั้งค่าการลา" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ประเภทลา + ตัวคำนวณชั่วโมง import จาก module / ที่เหลือเป็น global บน window

import { LEAVE_TYPES, colorVariants } from '../lib/leave-types.js?v=20260717a';
import { calcLeaveHours, getDayWorkHours, balanceToDisplay, hhmmToMins } from '../lib/leave-hours.js?v=20260717a';

export default {
    title: 'ตั้งค่าการลา',
    html: `
<style>
.day-toggle { transition: all .15s; }
.day-toggle.selected { background:#18181b; color:#eab308; border-color:#18181b; }
</style>
<div class="p-6 lg:p-8 max-w-7xl mx-auto">

  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ตั้งค่าการลา</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">จัดการตารางงาน โควต้าวันลา และวันหยุดของพนักงานแต่ละคน</p>
    </div>
    <!-- Search -->
    <div class="relative w-full sm:w-72">
      <i class="fa-solid fa-search absolute left-3 top-3 text-zinc-400 text-sm"></i>
      <input id="admin-emp-search" oninput="filterAdminEmpList()" type="text" placeholder="ค้นหาพนักงาน..."
        class="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
    </div>
  </div>

  <!-- Backfill: ซ่อมชั่วโมงลาที่คำนวณด้วยสูตรเก่า (หักพักตามสัดส่วน) -->
  <div class="bg-white rounded-2xl border border-zinc-200 p-5 mb-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1">
        <h3 class="font-black text-zinc-800 text-sm uppercase tracking-widest flex items-center gap-2">
          <i class="fa-solid fa-wrench text-yellow-500"></i> ซ่อมชั่วโมงลาย้อนหลัง
        </h3>
        <p class="text-[11px] text-zinc-400 font-medium mt-1">
          ใบลาที่บันทึกก่อนหน้านี้ถูกหักเวลาพักตามสัดส่วน (เช่น ลาเช้า 08:00–12:00 ได้ 3.56 แทน 4)
          กด "ดูผล" เพื่อตรวจก่อน แล้วค่อยกด "เขียนจริง" — ทำครั้งเดียวพอ
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button onclick="backfillLeaveHours(false)" id="backfill-dry-btn"
          class="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black py-2.5 px-4 rounded-xl transition-all text-sm border-2 border-zinc-200">
          <i class="fa-solid fa-magnifying-glass mr-2 text-zinc-500"></i> ดูผล (ไม่เขียน)
        </button>
        <button onclick="backfillLeaveHours(true)" id="backfill-apply-btn"
          class="bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-2.5 px-4 rounded-xl transition-all text-sm">
          <i class="fa-solid fa-database mr-2"></i> เขียนจริง
        </button>
      </div>
    </div>
    <div id="backfill-result" class="hidden mt-4 pt-4 border-t border-zinc-100"></div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

    <!-- Employee List (left) -->
    <div class="lg:col-span-2">
      <div class="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-zinc-100">
          <h3 class="font-black text-zinc-800 text-sm uppercase tracking-widest">รายชื่อพนักงาน</h3>
        </div>
        <div id="admin-emp-list" class="divide-y divide-zinc-100 max-h-[65vh] overflow-y-auto">
          <div class="p-6 text-center text-zinc-400 text-sm">กำลังโหลด...</div>
        </div>
      </div>
    </div>

    <!-- Settings Panel (right) -->
    <div class="lg:col-span-3" id="admin-right-panel">
      <div class="bg-white rounded-2xl border border-zinc-200 p-8 flex flex-col items-center justify-center h-48 text-zinc-400">
        <i class="fa-solid fa-arrow-left text-3xl mb-3 opacity-40"></i>
        <p class="font-bold text-sm">เลือกพนักงานจากรายการ</p>
        <p class="text-xs mt-1">เพื่อตั้งค่าตารางงานและโควต้า</p>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, getDocs, query, where }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let allEmps   = [];
        let selectedEmpUid = null;
        let workDaysSel = [1, 2, 3, 4, 5];

        const unsub = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'), snap => {
            allEmps = snap.docs.map(d => d.data()).filter(e => e.uid);
            renderEmpList(allEmps);
        });

        function renderEmpList(list) {
            const el = document.getElementById('admin-emp-list');
            if (!el) return;
            if (!list.length) { el.innerHTML = `<div class="p-6 text-center text-zinc-400 text-sm">ไม่พบพนักงาน</div>`; return; }
            el.innerHTML = list.map(e => {
                const av = e.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=f4f4f5&color=27272a&bold=true`;
                const isActive = e.uid === selectedEmpUid;
                return `
                <button onclick="selectAdminEmp('${e.uid}')" class="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all hover:bg-zinc-50 ${isActive ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''}">
                  <img src="${av}" onerror="handleImgError(this)" class="w-10 h-10 rounded-xl object-cover border border-zinc-200 shrink-0">
                  <div class="min-w-0">
                    <p class="font-bold text-zinc-800 text-sm truncate">${e.name}</p>
                    <p class="text-[10px] text-zinc-400 font-bold uppercase">${e.employeeCode || e.role}</p>
                    <p class="text-[10px] text-zinc-400 truncate">${e.branch || ''}</p>
                  </div>
                  <i class="fa-solid fa-chevron-right text-zinc-300 ml-auto shrink-0 text-xs"></i>
                </button>`;
            }).join('');
        }

        window.filterAdminEmpList = () => {
            const q = document.getElementById('admin-emp-search')?.value.toLowerCase();
            renderEmpList(allEmps.filter(e => e.name?.toLowerCase().includes(q) || e.employeeCode?.toLowerCase().includes(q)));
        };

        window.selectAdminEmp = async (uid) => {
            selectedEmpUid = uid;
            renderEmpList(allEmps.filter(e => {
                const q = document.getElementById('admin-emp-search')?.value.toLowerCase() || '';
                return !q || e.name?.toLowerCase().includes(q) || e.employeeCode?.toLowerCase().includes(q);
            }));
            const emp = allEmps.find(e => e.uid === uid);
            if (!emp) return;

            // โหลด schedule, balance และ approved requests พร้อมกัน
            const [schedSnap, balSnap, reqSnap] = await Promise.all([
                getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', uid)),
                getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances',  uid)),
                getDocs(query(
                    collection(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests'),
                    where('uid', '==', uid),
                    where('status', '==', 'approved')
                )),
            ]);

            const sched = schedSnap.exists() ? schedSnap.data() : { workDays:[1,2,3,4,5], workStart:'08:00', workEnd:'17:00', breakMinutes:60, holidays:[] };
            const balRaw = balSnap.exists() ? balSnap.data() : {};

            // คำนวณ usedHours จาก approved requests (source of truth)
            const usedFromReqs = {};
            reqSnap.docs.forEach(d => {
                const r = d.data();
                if (r.type && r.totalHours > 0)
                    usedFromReqs[r.type] = Math.round(((usedFromReqs[r.type]||0) + r.totalHours) * 100) / 100;
            });

            // merge: ใช้ค่าที่มากกว่าระหว่าง Firestore กับที่คำนวณได้
            const bal = { ...balRaw };
            Object.keys(usedFromReqs).forEach(tid => {
                if (!bal[tid]) bal[tid] = {};
                bal[tid] = {
                    ...bal[tid],
                    usedHours: Math.max(bal[tid]?.usedHours || 0, usedFromReqs[tid]),
                };
            });

            workDaysSel = sched.workDays || [1,2,3,4,5];
            renderAdminPanel(emp, sched, bal);
        };

        
        function renderAdminPanel(emp, sched, bal) {
            const panel = document.getElementById('admin-right-panel');
            if (!panel) return;
            const av = emp.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=27272a&color=eab308&bold=true`;
            const DAY_NAMES = ['อา','จ','อ','พ','พฤ','ศ','ส'];
            const daysHtml = [0,1,2,3,4,5,6].map(d => {
                const isSel = workDaysSel.includes(d);
                return `<button onclick="toggleWorkDay(${d})" id="wday-${d}"
                    class="day-toggle w-10 h-10 rounded-xl border-2 border-zinc-200 font-black text-xs text-zinc-500 ${isSel ? 'selected' : ''}">
                    ${DAY_NAMES[d]}</button>`;
            }).join('');

            // คำนวณ hpd จาก schedule จริง
            const hpd = getDayWorkHours(sched);

            panel.innerHTML = `
            <!-- Employee card -->
            <div class="bg-zinc-900 text-white rounded-2xl p-5 flex items-center gap-4 mb-5">
              <img src="${av}" onerror="handleImgError(this)" class="w-14 h-14 rounded-2xl object-cover border-2 border-zinc-700">
              <div>
                <p class="font-black text-lg">${emp.name}</p>
                <p class="text-yellow-400 text-xs font-bold uppercase">${emp.employeeCode || ''} · ${emp.position || emp.role}</p>
                <p class="text-zinc-400 text-xs">${emp.branch || ''}</p>
              </div>
            </div>

            <!-- Work Schedule -->
            <div class="bg-white rounded-2xl border border-zinc-200 p-6 mb-5">
              <h4 class="font-black text-zinc-800 mb-5 flex items-center gap-2 uppercase text-sm tracking-widest">
                <i class="fa-solid fa-calendar-days text-yellow-500"></i> ตารางการทำงาน
              </h4>
              <div class="space-y-5">
                <div>
                  <p class="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">วันทำงาน</p>
                  <div class="flex gap-2 flex-wrap">${daysHtml}</div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">เวลาเข้างาน</label>
                    <input type="time" id="sched-start" value="${sched.workStart || '08:00'}"
                      class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">เวลาออกงาน</label>
                    <input type="time" id="sched-end" value="${sched.workEnd || '17:00'}"
                      class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">เริ่มพัก</label>
                    <input type="time" id="sched-break-start" value="${sched.breakStart || '12:00'}"
                      class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">พัก (นาที)</label>
                    <input type="number" id="sched-break" value="${sched.breakMinutes ?? 60}" min="0" max="240"
                      class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
                  </div>
                </div>
                <!-- Daily work hours preview -->
                <div class="bg-zinc-50 rounded-xl p-3 flex items-center gap-3 border border-zinc-200">
                  <i class="fa-solid fa-clock text-yellow-500"></i>
                  <p class="text-sm font-bold text-zinc-600">
                    ชั่วโมงงาน/วัน: <span id="daily-hrs-preview" class="text-yellow-600">${hpd.toFixed(1)} ชม.</span>
                  </p>
                </div>
                <div>
                  <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">วันหยุดพิเศษ (กรอก YYYY-MM-DD คั่นด้วย ,)</label>
                  <textarea id="sched-holidays" rows="2" placeholder="2026-04-06, 2026-04-07, ..."
                    class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none resize-none">${(sched.holidays||[]).join(', ')}</textarea>
                </div>
                <button onclick="saveSchedule()" class="w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest">
                  <i class="fa-solid fa-save mr-2"></i> บันทึกตารางงาน
                </button>
              </div>
            </div>

            <!-- Leave Quota -->
            <div class="bg-white rounded-2xl border border-zinc-200 p-6">
              <h4 class="font-black text-zinc-800 mb-1 flex items-center gap-2 uppercase text-sm tracking-widest">
                <i class="fa-solid fa-sliders text-yellow-500"></i> โควต้าวันลาประจำปี
              </h4>
              <p class="text-[11px] text-zinc-400 mb-5 font-medium">
                คำนวณจาก <span class="font-black text-yellow-600">${hpd.toFixed(1)} ชม./วัน</span>
                (${sched.workStart||'08:00'} – ${sched.workEnd||'17:00'} พัก ${sched.breakStart||'12:00'} ${sched.breakMinutes??60} นาที)
              </p>
              <div class="space-y-4" id="quota-form">
                ${LEAVE_TYPES.filter(t => t.maxDays > 0).map(t => {
                    const b        = bal[t.id] || {};
                    const cv       = colorVariants(t.color);
                    const usedHrs  = b.usedHours  || 0;
                    const totalHrs = b.totalHours != null ? b.totalHours : (t.maxDays * hpd);
                    // แปลง ชม. → วัน เพื่อแสดงใน input (ช่องนี้ต้องเป็นตัวเลขวันล้วน เพราะอ่านค่ากลับไปคำนวณ)
                    const totalDays = Math.round(totalHrs / hpd * 10) / 10;
                    const remHrs    = Math.max(0, totalHrs - usedHrs);
                    return `
                    <div class="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                      <div class="flex items-center gap-3 mb-2">
                        <div class="w-9 h-9 rounded-xl ${cv.bg} flex items-center justify-center shrink-0">
                          <i class="fa-solid ${t.icon} ${cv.text} text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="font-bold text-zinc-800 text-sm">${t.label}</p>
                          <div class="flex gap-3 text-[10px] text-zinc-400 mt-0.5 flex-wrap">
                            <span>ใช้ <span class="font-black text-zinc-600">${balanceToDisplay(usedHrs, sched)}</span></span>
                            <span>คงเหลือ <span class="font-black ${remHrs <= 0 ? 'text-red-500' : 'text-green-600'}">${balanceToDisplay(remHrs, sched)}</span></span>
                            <span>จาก <span class="font-black">${balanceToDisplay(totalHrs, sched)}</span></span>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                          <label class="text-xs text-zinc-500 font-bold whitespace-nowrap">สิทธิ์ (วัน)</label>
                          <input type="number" id="quota-${t.id}"
                            value="${totalDays}"
                            min="0" step="0.5"
                            class="w-20 border-2 border-zinc-200 rounded-lg px-2 py-1.5 text-sm font-black text-center focus:border-yellow-500 focus:outline-none">
                        </div>
                      </div>
                      ${totalHrs > 0 ? (() => {
                        const pct2 = Math.min(100, Math.round(usedHrs/totalHrs*100));
                        const barC = pct2 >= 100 ? 'bg-red-400' : pct2 >= 80 ? 'bg-orange-400' : 'bg-green-400';
                        return `<div class="w-full bg-zinc-200 rounded-full h-1.5"><div class="h-1.5 rounded-full ${barC}" style="width:${pct2}%"></div></div>
                                <p class="text-right text-[9px] text-zinc-400 font-bold mt-0.5">${pct2}% ใช้แล้ว</p>`;
                      })() : ''}
                    </div>`;
                }).join('')}
              </div>
              <p class="text-[10px] text-zinc-400 mt-3 text-center font-medium">
                กรอกเป็น "วัน" — ระบบแปลงเป็นชั่วโมงอัตโนมัติตาม schedule
              </p>
              <div class="mt-4 flex gap-3">
                <button onclick="recalcUsedHours()" class="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black py-3 rounded-xl transition-all text-sm border-2 border-zinc-200">
                  <i class="fa-solid fa-rotate mr-2 text-zinc-500"></i> คำนวณจากประวัติการลา
                </button>
                <button onclick="saveQuota()" class="flex-1 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-3 rounded-xl transition-all text-sm shadow-md">
                  <i class="fa-solid fa-save mr-2"></i> บันทึกโควต้าวันลา
                </button>
              </div>
            </div>`;

            // Bind daily hours preview (อัปเดตทันทีเมื่อเปลี่ยนเวลา/พัก)
            function updateDailyPreview() {
                const s = document.getElementById('sched-start')?.value || '08:00';
                const e = document.getElementById('sched-end')?.value   || '17:00';
                const b = Number(document.getElementById('sched-break')?.value) || 0;
                const [sh, sm] = s.split(':').map(Number);
                const [eh, em] = e.split(':').map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm) - b;
                const el = document.getElementById('daily-hrs-preview');
                if (el) el.textContent = mins > 0 ? `${(mins/60).toFixed(1)} ชม.` : '-';
            }
            ['sched-start','sched-end','sched-break'].forEach(id =>
                document.getElementById(id)?.addEventListener('input', updateDailyPreview)
            );
        }

        window.toggleWorkDay = (d) => {
            if (workDaysSel.includes(d)) workDaysSel = workDaysSel.filter(x => x !== d);
            else workDaysSel.push(d);
            workDaysSel.sort();
            const btn = document.getElementById(`wday-${d}`);
            if (btn) {
                btn.classList.toggle('selected', workDaysSel.includes(d));
            }
        };

        window.saveSchedule = async () => {
            if (!selectedEmpUid) return;
            const payload = {
                workDays: workDaysSel,
                workStart: document.getElementById('sched-start')?.value || '08:00',
                workEnd:   document.getElementById('sched-end')?.value   || '17:00',
                breakStart:   document.getElementById('sched-break-start')?.value || '12:00',
                breakMinutes: Number(document.getElementById('sched-break')?.value) || 60,
                holidays: (document.getElementById('sched-holidays')?.value || '')
                    .split(',').map(s => s.trim()).filter(Boolean),
                updatedAt: new Date().toISOString(),
            };
            // เวลาพักต้องอยู่ในช่วงเวลาทำงาน ไม่งั้นชั่วโมงลาเต็มวันจะไม่ตรงกับ ชม./วัน
            if (payload.breakMinutes > 0) {
                const bs = hhmmToMins(payload.breakStart);
                if (bs < hhmmToMins(payload.workStart) || bs + payload.breakMinutes > hhmmToMins(payload.workEnd)) {
                    showToast('❌ ช่วงเวลาพักต้องอยู่ภายในเวลาเข้า–ออกงาน', 'error');
                    return;
                }
            }
            try {
                await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', selectedEmpUid), payload, { merge: true });
                showToast('✅ บันทึกตารางงานแล้ว', 'success');
            } catch (e) { showToast('❌ ' + e.message, 'error'); }
        };

       
        window.recalcUsedHours = async () => {
            if (!selectedEmpUid) return;
            const btn = document.querySelector('button[onclick="recalcUsedHours()"]');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังคำนวณ...'; }
            try {
                // ดึง approved requests ทั้งหมดของพนักงานคนนี้
                const reqSnap = await getDocs(query(
                    collection(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests'),
                    where('uid', '==', selectedEmpUid),
                    where('status', '==', 'approved')
                ));
                // รวม totalHours แยกตาม type
                const usedMap = {};
                reqSnap.docs.forEach(d => {
                    const r = d.data();
                    const tid = r.type;
                    if (!tid) return;
                    usedMap[tid] = Math.round(((usedMap[tid] || 0) + (r.totalHours || 0)) * 100) / 100;
                });
                // อ่าน balance ปัจจุบัน
                const balRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', selectedEmpUid);
                const balSnap = await getDoc(balRef);
                // สร้าง update payload ด้วย dotted path
                const updatePayload = {};
                Object.entries(usedMap).forEach(([tid, hrs]) => {
                    updatePayload[`${tid}.usedHours`] = hrs;
                });
                // ถ้า type ไม่มีใน usedMap แปลว่า usedHours = 0
                ['sick','personal','vacation','maternity','ordain','military'].forEach(tid => {
                    if (!(tid in usedMap)) updatePayload[`${tid}.usedHours`] = 0;
                });
                if (balSnap.exists()) {
                    await updateDoc(balRef, updatePayload);
                } else {
                    // doc ไม่มีเลย — สร้างใหม่
                    const schedSnap2 = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', selectedEmpUid));
                    const empSched2 = schedSnap2.exists() ? schedSnap2.data() : { workStart:'08:00', workEnd:'17:00', breakMinutes:60 };
                    const hpd2 = getDayWorkHours(empSched2);
                    const initDoc = {};
                    LEAVE_TYPES.filter(t => t.maxDays > 0).forEach(t => {
                        initDoc[t.id] = { totalHours: Math.round(t.maxDays * hpd2 * 100)/100, usedHours: usedMap[t.id] || 0 };
                    });
                    await setDoc(balRef, initDoc);
                }
                // reload panel
                const emp = allEmps.find(e => e.uid === selectedEmpUid);
                if (emp) await selectAdminEmp(selectedEmpUid);
                const total = Object.values(usedMap).reduce((a,b)=>a+b,0);
                showToast(`✅ คำนวณจาก ${reqSnap.size} คำขอ รวม ${total.toFixed(1)} ชม.`, 'success');
            } catch(e) {
                showToast('❌ ' + e.message, 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-2 text-zinc-500"></i> คำนวณจากประวัติการลา'; }
            }
        };

        // คำนวณ totalHours ของใบลาทุกใบใหม่ด้วยสูตรปัจจุบัน (หักพักเฉพาะส่วนที่คาบเกี่ยวจริง)
        // apply=false → แค่แสดงผลว่าจะเปลี่ยนอะไรบ้าง, apply=true → เขียนลง Firestore แล้วปรับ usedHours
        window.backfillLeaveHours = async (apply) => {
            const btnId = apply ? 'backfill-apply-btn' : 'backfill-dry-btn';
            const btn = document.getElementById(btnId);
            const orig = btn ? btn.innerHTML : '';
            const out = document.getElementById('backfill-result');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังคำนวณ...'; }
            try {
                const reqCol = collection(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests');
                const reqSnap = await getDocs(reqCol);

                // โหลด schedule ของแต่ละ uid ครั้งเดียว
                const uids = [...new Set(reqSnap.docs.map(d => d.data().uid).filter(Boolean))];
                const schedOf = {};
                await Promise.all(uids.map(async uid => {
                    const s = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', uid));
                    schedOf[uid] = s.exists() ? s.data()
                        : { workDays:[1,2,3,4,5], workStart:'08:00', workEnd:'17:00', breakStart:'12:00', breakMinutes:60, holidays:[] };
                }));

                // หาใบที่ค่าเปลี่ยน
                const diffs = [];
                reqSnap.docs.forEach(d => {
                    const r = d.data();
                    if (!r.uid || !r.startDate || !r.endDate) return;
                    const fresh = calcLeaveHours(r.startDate, r.startTime, r.endDate, r.endTime, schedOf[r.uid]);
                    const old = r.totalHours ?? 0;
                    if (Math.abs(fresh - old) > 0.005) {
                        diffs.push({ id: d.id, uid: r.uid, name: r.employeeName || r.uid,
                                     date: r.startDate, time: `${r.startTime || '-'}–${r.endTime || '-'}`,
                                     status: r.status, old, fresh });
                    }
                });

                if (!diffs.length) {
                    if (out) {
                        out.classList.remove('hidden');
                        out.innerHTML = `<p class="text-sm font-bold text-emerald-600"><i class="fa-solid fa-circle-check mr-2"></i>
                            ตรวจ ${reqSnap.size} ใบ — ถูกต้องทั้งหมดแล้ว ไม่มีอะไรต้องแก้</p>`;
                    }
                    showToast(`✅ ตรวจ ${reqSnap.size} ใบ ไม่พบที่ต้องแก้`, 'success');
                    return;
                }

                // ตารางสรุป
                const rows = diffs.map(x => `
                    <tr class="border-b border-zinc-100">
                      <td class="py-2 pr-3 font-bold text-zinc-700">${x.name}</td>
                      <td class="py-2 pr-3 text-zinc-500">${x.date} ${x.time}</td>
                      <td class="py-2 pr-3 text-zinc-400">${x.status}</td>
                      <td class="py-2 pr-3 text-right text-red-500 font-bold">${x.old.toFixed(2)}</td>
                      <td class="py-2 pr-3 text-right text-emerald-600 font-black">${x.fresh.toFixed(2)}</td>
                    </tr>`).join('');
                if (out) {
                    out.classList.remove('hidden');
                    out.innerHTML = `
                      <p class="text-sm font-black text-zinc-700 mb-2">
                        ${apply ? 'เขียนแล้ว' : 'จะแก้'} ${diffs.length} ใบ (จากทั้งหมด ${reqSnap.size} ใบ)
                        ${apply ? '' : '<span class="text-zinc-400 font-medium">— ยังไม่ได้เขียนลงฐานข้อมูล</span>'}
                      </p>
                      <div class="overflow-x-auto max-h-64 overflow-y-auto">
                        <table class="w-full text-xs">
                          <thead class="text-[10px] uppercase text-zinc-400 font-black">
                            <tr class="border-b-2 border-zinc-200">
                              <th class="text-left py-2 pr-3">พนักงาน</th>
                              <th class="text-left py-2 pr-3">วันที่/เวลา</th>
                              <th class="text-left py-2 pr-3">สถานะ</th>
                              <th class="text-right py-2 pr-3">เดิม</th>
                              <th class="text-right py-2 pr-3">ใหม่</th>
                            </tr>
                          </thead>
                          <tbody>${rows}</tbody>
                        </table>
                      </div>`;
                }

                if (!apply) {
                    showToast(`🔍 พบ ${diffs.length} ใบที่ต้องแก้ — ตรวจแล้วกด "เขียนจริง"`, 'success');
                    return;
                }

                // เขียน totalHours ใหม่
                for (const x of diffs) {
                    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests', x.id), {
                        totalHours: x.fresh,
                        backfilledAt: new Date().toISOString(),
                    });
                }

                // ปรับ usedHours ของคนที่ได้รับผลกระทบ — รวมใหม่จากใบที่อนุมัติแล้วทั้งหมด
                const affected = [...new Set(diffs.map(x => x.uid))];
                for (const uid of affected) {
                    const usedMap = {};
                    reqSnap.docs.forEach(d => {
                        const r = d.data();
                        if (r.uid !== uid || r.status !== 'approved' || !r.type) return;
                        const hrs = diffs.find(x => x.id === d.id)?.fresh ?? (r.totalHours || 0);
                        usedMap[r.type] = Math.round(((usedMap[r.type] || 0) + hrs) * 100) / 100;
                    });
                    const balRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', uid);
                    const balSnap = await getDoc(balRef);
                    if (!balSnap.exists()) continue; // ไม่มี balance ก็ข้าม ให้ไปกด "คำนวณจากประวัติการลา" ทีหลัง
                    const payload = {};
                    ['sick','personal','vacation','maternity','ordain','military'].forEach(tid => {
                        payload[`${tid}.usedHours`] = usedMap[tid] || 0;
                    });
                    await updateDoc(balRef, payload);
                }

                showToast(`✅ แก้ ${diffs.length} ใบ · ปรับโควต้า ${affected.length} คน`, 'success');
                if (selectedEmpUid) await selectAdminEmp(selectedEmpUid);
            } catch (e) {
                showToast('❌ ' + e.message, 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = orig; }
            }
        };

        window.saveQuota = async () => {
            if (!selectedEmpUid) return;
        
            // แก้: ใช้ doc และ getDoc จาก scope ของ init โดยตรง
            // ไม่ import Firestore ใหม่ซ้ำอีกครั้ง
            const schedSnap = await getDoc(
                doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', selectedEmpUid)
            );
            const empSched = schedSnap.exists()
                ? schedSnap.data()
                : { workStart: '08:00', workEnd: '17:00', breakMinutes: 60 };
            const hpd = getDayWorkHours(empSched);
        
            // อ่าน usedHours เดิมก่อน เพื่อไม่ให้ถูกรีเซ็ต
            const curBalSnap = await getDoc(
                doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', selectedEmpUid)
            );
            const curBal = curBalSnap.exists() ? curBalSnap.data() : {};

            // ใช้ dotted path เพื่อ update แค่ totalHours ไม่แตะ usedHours
            const payload = {};
            LEAVE_TYPES.filter(t => t.maxDays > 0).forEach(t => {
                const el = document.getElementById(`quota-${t.id}`);
                if (!el) return;
                const inputDays = parseFloat(el.value) || 0;
                const totalHrs = Math.round(inputDays * hpd * 100) / 100;
                payload[`${t.id}.totalHours`] = totalHrs;
                // เขียน usedHours เฉพาะถ้ายังไม่มี field นี้ (พนักงานใหม่)
                if (curBal[t.id]?.usedHours == null) {
                    payload[`${t.id}.usedHours`] = 0;
                }
            });

            try {
                const balDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', selectedEmpUid);
                if (curBalSnap.exists()) {
                    await updateDoc(balDocRef, payload);
                } else {
                    await setDoc(balDocRef, payload);
                }
                showToast('✅ บันทึกโควต้าวันลาแล้ว (คำนวณจาก ' + hpd.toFixed(1) + ' ชม./วัน)', 'success');
            } catch(e) {
                showToast('❌ ' + e.message, 'error');
            }
        };

        return () => {
            unsub();
            ['filterAdminEmpList','selectAdminEmp','toggleWorkDay','saveSchedule','saveQuota','recalcUsedHours','backfillLeaveHours'].forEach(k => delete window[k]);
        };
    }
};
