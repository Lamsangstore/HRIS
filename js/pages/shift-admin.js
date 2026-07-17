// หน้า "จัดการกะงาน" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / navigateTo ซึ่งยังเป็น global บน window เรียกได้ตรงๆ

export default {
    title: 'จัดการกะงาน',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="mb-8">
    <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">จัดการกะงาน</h2>
    <p class="text-sm text-zinc-400 font-medium mt-0.5">สร้างกะงานและกำหนดกะให้พนักงานแต่ละวันในสัปดาห์</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Shift templates -->
    <div class="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 class="font-black text-zinc-800 mb-4 text-sm uppercase tracking-widest">
        <i class="fa-solid fa-layer-group text-yellow-500 mr-2"></i> กะงานทั้งหมด
      </h3>
      <div id="sh-list" class="space-y-2 mb-4">
        <div class="text-center py-6 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>
      </div>
      <div class="border-t border-zinc-100 pt-4 space-y-3">
        <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest">เพิ่มกะใหม่</p>
        <input type="text" id="sh-name" placeholder="ชื่อกะ เช่น กะเช้า / กะบ่าย / กะดึก"
          class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">เข้า</label>
            <input type="time" id="sh-start" value="08:00" class="w-full border-2 border-zinc-200 rounded-xl px-2 py-2 text-sm focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">ออก</label>
            <input type="time" id="sh-end" value="17:00" class="w-full border-2 border-zinc-200 rounded-xl px-2 py-2 text-sm focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-[9px] font-black text-zinc-400 uppercase mb-1">พัก (นาที)</label>
            <input type="number" id="sh-break" value="60" min="0" step="15" class="w-full border-2 border-zinc-200 rounded-xl px-2 py-2 text-sm focus:border-yellow-500 focus:outline-none">
          </div>
        </div>
        <button onclick="shAdd()" class="w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-2.5 rounded-xl text-xs uppercase">
          <i class="fa-solid fa-plus mr-1"></i> เพิ่มกะ
        </button>
      </div>
    </div>

    <!-- Assign per employee -->
    <div class="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 class="font-black text-zinc-800 mb-4 text-sm uppercase tracking-widest">
        <i class="fa-solid fa-user-clock text-yellow-500 mr-2"></i> กำหนดกะให้พนักงาน
      </h3>
      <select id="sh-emp" onchange="shLoadEmp()" class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-yellow-500 focus:outline-none mb-4">
        <option value="">— เลือกพนักงาน —</option>
      </select>
      <div id="sh-assign" class="space-y-2">
        <p class="text-center py-8 text-zinc-300 text-sm font-bold">เลือกพนักงานเพื่อกำหนดกะ</p>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        let shifts = [];
        let selEmpSched = null;

        const empSnap = await getDocs(col('users'));
        const employees = empSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
            .filter(e => e.name && e.status !== 'resigned')
            .sort((a,b) => a.name.localeCompare(b.name,'th'));
        const empSel = document.getElementById('sh-emp');
        if (empSel) employees.forEach(e => {
            const o = document.createElement('option');
            o.value = e.uid; o.textContent = `${e.name}${e.employeeCode?` (${e.employeeCode})`:''}`;
            empSel.appendChild(o);
        });

        async function loadShifts() {
            const snap = await getDocs(col('shifts'));
            shifts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a,b) => (a.start||'').localeCompare(b.start||''));
            renderShifts();
        }

        function renderShifts() {
            const el = document.getElementById('sh-list');
            if (!el) return;
            if (!shifts.length) {
                el.innerHTML = '<p class="text-center py-4 text-zinc-300 text-sm font-bold">ยังไม่มีกะงาน</p>';
                return;
            }
            el.innerHTML = shifts.map(s => `
                <div class="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-100">
                    <div>
                        <p class="font-black text-zinc-800 text-sm">${s.name}</p>
                        <p class="text-[10px] text-zinc-400 font-bold">${s.start} – ${s.end} · พัก ${s.breakMinutes ?? 60} นาที</p>
                    </div>
                    <button onclick="shDelete('${s.id}')" class="text-red-400 hover:text-red-600 px-2"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>`).join('');
        }

        window.shAdd = async () => {
            const name = document.getElementById('sh-name')?.value.trim();
            const start = document.getElementById('sh-start')?.value;
            const end = document.getElementById('sh-end')?.value;
            const brk = parseInt(document.getElementById('sh-break')?.value) || 0;
            if (!name || !start || !end) { showToast('กรุณากรอกชื่อกะและเวลาให้ครบ', 'error'); return; }
            try {
                await addDoc(col('shifts'), { name, start, end, breakMinutes: brk, createdAt: new Date().toISOString() });
                document.getElementById('sh-name').value = '';
                showToast('✅ เพิ่มกะแล้ว', 'success');
                await loadShifts();
                if (document.getElementById('sh-emp')?.value) shLoadEmp();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        window.shDelete = async (id) => {
            const s = shifts.find(x => x.id === id);
            if (!s || !confirm(`ลบกะ "${s.name}"? พนักงานที่ใช้กะนี้จะกลับไปใช้ตารางปกติ`)) return;
            try {
                await deleteDoc(doc(db,'artifacts',APP_ID,'public','data','shifts', id));
                showToast('ลบกะแล้ว', 'info');
                await loadShifts();
                if (document.getElementById('sh-emp')?.value) shLoadEmp();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        const DOW_FULL = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

        window.shLoadEmp = async () => {
            const uid = document.getElementById('sh-emp')?.value;
            const el = document.getElementById('sh-assign');
            if (!el) return;
            if (!uid) {
                el.innerHTML = '<p class="text-center py-8 text-zinc-300 text-sm font-bold">เลือกพนักงานเพื่อกำหนดกะ</p>';
                return;
            }
            el.innerHTML = '<div class="text-center py-6 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>';
            const snap = await getDoc(doc(db,'artifacts',APP_ID,'public','data','work_schedules', uid));
            selEmpSched = snap.exists() ? snap.data() : {};
            const shiftByDay = selEmpSched.shiftByDay || {};
            const workDaySet = new Set(selEmpSched.workDays || [1,2,3,4,5]);
            const opts = (cur) => `<option value="">ตารางปกติ (${selEmpSched.workStart||'08:00'}–${selEmpSched.workEnd||'17:00'})</option>` +
                shifts.map(s => `<option value="${s.id}" ${cur===s.id?'selected':''}>${s.name} (${s.start}–${s.end})</option>`).join('');
            el.innerHTML = DOW_FULL.map((d, i) => `
                <div class="flex items-center gap-3 ${!workDaySet.has(i)?'opacity-40':''}">
                    <span class="w-16 text-xs font-black ${!workDaySet.has(i)?'text-zinc-400':'text-zinc-700'}">${d}${!workDaySet.has(i)?' (หยุด)':''}</span>
                    <select id="sh-day-${i}" class="flex-1 border-2 border-zinc-200 rounded-xl px-2 py-1.5 text-xs font-medium focus:border-yellow-500 focus:outline-none" ${!workDaySet.has(i)?'disabled':''}>
                        ${opts(shiftByDay[i] || '')}
                    </select>
                </div>`).join('') + `
                <button onclick="shSaveAssign()" class="w-full mt-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-2.5 rounded-xl text-xs uppercase">
                    <i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกการกำหนดกะ
                </button>`;
        };

        window.shSaveAssign = async () => {
            const uid = document.getElementById('sh-emp')?.value;
            if (!uid) return;
            const shiftByDay = {};
            for (let i = 0; i <= 6; i++) {
                const v = document.getElementById('sh-day-'+i)?.value;
                if (v) shiftByDay[i] = v;
            }
            try {
                await setDoc(doc(db,'artifacts',APP_ID,'public','data','work_schedules', uid),
                    { shiftByDay }, { merge: true });
                showToast('✅ บันทึกกะของพนักงานแล้ว', 'success');
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        await loadShifts();

        return () => {
            ['shAdd','shDelete','shLoadEmp','shSaveAssign'].forEach(k => delete window[k]);
        };
    }
};
