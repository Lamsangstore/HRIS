// หน้า "ชี้แจง/แก้ไขเวลา"
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / todayTH ซึ่งเป็น global บน window

export default {
    title: 'ชี้แจง/แก้ไขเวลา',
    html: `
<style>
.tr-card { transition: all .18s; }
.tr-card:hover { box-shadow: 0 6px 20px -4px rgba(0,0,0,.1); }
.tr-tab.active { background:#18181b; color:#eab308; }
</style>
<div class="p-6 lg:p-8 max-w-4xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ชี้แจง / แก้ไขเวลา</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">ยื่นคำขอกรณีลืมลงเวลา หรือต้องการแก้ไขเวลาที่ผิดพลาด</p>
    </div>
    <button onclick="trOpenModal(null)"
      class="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black px-5 py-3 rounded-xl shadow-md transition-all text-sm uppercase tracking-widest">
      <i class="fa-solid fa-plus"></i> ยื่นคำขอใหม่
    </button>
  </div>
  <!-- Tabs -->
  <div class="flex gap-2 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
    <button onclick="trTab('explain')" class="tr-tab active text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all">ชี้แจง (ลืมลงเวลา)</button>
    <button onclick="trTab('fix')" class="tr-tab text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg transition-all text-zinc-500">ขอแก้ไขเวลา</button>
  </div>
  <div id="tr-list" class="space-y-3">
    <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i><p class="font-bold text-sm">กำลังโหลด...</p></div>
  </div>
</div>

<!-- Modal -->
<div id="tr-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="trCloseModal()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
    <div class="bg-zinc-900 px-7 py-5 flex items-center justify-between">
      <div>
        <h3 id="tr-modal-title" class="font-black text-white text-lg">ยื่นคำขอ</h3>
        <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Time Adjustment Request</p>
      </div>
      <button onclick="trCloseModal()" class="text-zinc-400 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
    </div>
    <div class="p-7 space-y-4">
      <!-- ประเภท -->
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">ประเภทคำขอ</label>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="trSetType('explain')" id="tr-type-explain"
            class="p-3 rounded-xl border-2 border-yellow-500 bg-yellow-50 text-left transition-all">
            <i class="fa-solid fa-comment-dots text-yellow-600 mb-1 block"></i>
            <p class="text-xs font-black text-zinc-800">ชี้แจงไม่ได้บันทึก</p>
            <p class="text-[10px] text-zinc-500">ลืม Clock In/Out</p>
          </button>
          <button onclick="trSetType('fix')" id="tr-type-fix"
            class="p-3 rounded-xl border-2 border-zinc-200 text-left transition-all hover:border-zinc-400">
            <i class="fa-solid fa-pen-to-square text-zinc-400 mb-1 block"></i>
            <p class="text-xs font-black text-zinc-800">ขอแก้ไขเวลา</p>
            <p class="text-[10px] text-zinc-500">เวลาผิดพลาด</p>
          </button>
        </div>
      </div>
      <!-- วันที่ -->
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-widest">วันที่</label>
        <input type="date" id="tr-date" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <!-- เวลาที่ขอ -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-widest">เวลาเข้างาน</label>
          <input type="time" id="tr-time-in" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-widest">เวลาออกงาน</label>
          <input type="time" id="tr-time-out" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        </div>
      </div>
      <!-- สำหรับ fix: เวลาเดิม -->
      <div id="tr-original-section" class="hidden">
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-widest">เวลาเดิม (ที่ต้องการแก้)</label>
        <div class="grid grid-cols-2 gap-4">
          <input type="time" id="tr-orig-in" placeholder="เวลาเข้าเดิม" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
          <input type="time" id="tr-orig-out" placeholder="เวลาออกเดิม" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        </div>
      </div>
      <!-- เหตุผล -->
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-widest">เหตุผล / รายละเอียด *</label>
        <textarea id="tr-reason" rows="3" placeholder="อธิบายสาเหตุ..." class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none resize-none"></textarea>
      </div>
      <button onclick="trSubmit()" id="tr-submit-btn"
        class="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-4 rounded-xl transition-all shadow-md uppercase tracking-widest text-sm flex items-center justify-center gap-2">
        <i class="fa-solid fa-paper-plane"></i> ส่งคำขอ
      </button>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        const { collection, doc, addDoc, onSnapshot, query, where, orderBy, updateDoc }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let allReqs = [], activeTab = 'explain', selectedType = 'explain';

        const unsub = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','time_requests'),
                  where('uid','==',user.uid), orderBy('createdAt','desc')),
            snap => { allReqs = snap.docs.map(d=>({id:d.id,...d.data()})); renderList(); }
        );

        function renderList() {
            const el = document.getElementById('tr-list'); if(!el) return;
            const filtered = allReqs.filter(r => r.reqType === activeTab);
            if (!filtered.length) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300"><i class="fa-regular fa-calendar-xmark text-5xl mb-3"></i><p class="font-bold text-sm">ยังไม่มีคำขอ</p></div>`; return;
            }
            const ST = { pending:{label:'รออนุมัติ',cls:'bg-yellow-100 text-yellow-800 border border-yellow-200',icon:'fa-clock'},
                         approved:{label:'อนุมัติแล้ว',cls:'bg-green-100 text-green-800 border border-green-200',icon:'fa-circle-check'},
                         rejected:{label:'ไม่อนุมัติ',cls:'bg-red-100 text-red-700 border border-red-200',icon:'fa-circle-xmark'} };
            el.innerHTML = filtered.map(r => {
                const st = ST[r.status]||ST.pending;
                const timeStr = r.reqType === 'explain'
                    ? `เข้า ${r.timeIn||'-'} · ออก ${r.timeOut||'-'}`
                    : `เดิม ${r.origIn||'-'}/${r.origOut||'-'} → ใหม่ ${r.timeIn||'-'}/${r.timeOut||'-'}`;
                return `<div class="tr-card bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                    <i class="fa-solid ${r.reqType==='explain'?'fa-comment-dots text-yellow-500':'fa-pen-to-square text-blue-500'} text-lg"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="font-black text-zinc-800 text-sm">${r.reqType==='explain'?'ชี้แจงไม่ได้บันทึก':'ขอแก้ไขเวลา'}</span>
                      <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${st.cls}"><i class="fa-solid ${st.icon} mr-1"></i>${st.label}</span>
                    </div>
                    <p class="text-sm text-zinc-600 font-medium">${r.date} · ${timeStr}</p>
                    <p class="text-xs text-zinc-400 truncate mt-0.5">${r.reason}</p>
                    ${r.approverNote ? `<p class="text-xs text-red-500 mt-1 font-bold"><i class="fa-solid fa-comment mr-1"></i>${r.approverNote}</p>` : ''}
                  </div>
                  ${r.status==='pending' ? `<button onclick="trCancel('${r.id}')" class="shrink-0 text-[10px] text-red-500 font-black bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all">ยกเลิก</button>` : ''}
                </div>`;
            }).join('');
        }

        window.trTab = (tab) => {
            activeTab = tab;
            document.querySelectorAll('.tr-tab').forEach((b,i) => {
                const isA = (i===0&&tab==='explain')||(i===1&&tab==='fix');
                b.classList.toggle('active', isA);
                b.classList.toggle('text-zinc-500', !isA);
            });
            renderList();
        };

        window.trSetType = (t) => {
            selectedType = t;
            document.getElementById('tr-type-explain')?.classList.toggle('border-yellow-500', t==='explain');
            document.getElementById('tr-type-explain')?.classList.toggle('bg-yellow-50', t==='explain');
            document.getElementById('tr-type-explain')?.classList.toggle('border-zinc-200', t!=='explain');
            document.getElementById('tr-type-fix')?.classList.toggle('border-yellow-500', t==='fix');
            document.getElementById('tr-type-fix')?.classList.toggle('bg-yellow-50', t==='fix');
            document.getElementById('tr-type-fix')?.classList.toggle('border-zinc-200', t!=='fix');
            document.getElementById('tr-original-section')?.classList.toggle('hidden', t!=='fix');
        };

        window.trOpenModal = (prefill) => {
            selectedType = 'explain';
            trSetType('explain');
            const today = todayTH();
            const d = document.getElementById('tr-date'); if(d) d.value = prefill?.date || today;
            ['tr-time-in','tr-time-out','tr-orig-in','tr-orig-out','tr-reason'].forEach(id => {
                const el = document.getElementById(id); if(el) el.value = '';
            });
            document.getElementById('tr-modal')?.classList.remove('hidden');
        };
        window.trCloseModal = () => document.getElementById('tr-modal')?.classList.add('hidden');

        window.trSubmit = async () => {
            const date   = document.getElementById('tr-date')?.value;
            const timeIn = document.getElementById('tr-time-in')?.value;
            const timeOut= document.getElementById('tr-time-out')?.value;
            const reason = document.getElementById('tr-reason')?.value.trim();
            if (!date || !reason) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return; }
            const btn = document.getElementById('tr-submit-btn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>';
            try {
                await addDoc(collection(db,'artifacts',APP_ID,'public','data','time_requests'), {
                    uid: user.uid, employeeName: profile.name, employeeCode: profile.employeeCode||'',
                    branch: profile.branch||'', photoURL: profile.photoURL||'',
                    reqType: selectedType, date, timeIn: timeIn||'', timeOut: timeOut||'',
                    origIn: document.getElementById('tr-orig-in')?.value||'',
                    origOut: document.getElementById('tr-orig-out')?.value||'',
                    reason, status: 'pending', createdAt: new Date().toISOString(),
                });
                showToast('✅ ส่งคำขอเรียบร้อย', 'success');
                trCloseModal();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
            finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-paper-plane mr-2"></i> ส่งคำขอ'; }
        };

        window.trCancel = async (id) => {
            if (!confirm('ยกเลิกคำขอนี้?')) return;
            try {
                await updateDoc(doc(db,'artifacts',APP_ID,'public','data','time_requests',id),
                    { status:'cancelled', cancelledAt: new Date().toISOString() });
                showToast('ยกเลิกแล้ว','info');
            } catch(e) { showToast('❌ '+e.message,'error'); }
        };

        renderList();
        return () => {
            unsub();
            ['trTab','trSetType','trOpenModal','trCloseModal','trSubmit','trCancel'].forEach(k=>delete window[k]);
        };
    }
};
