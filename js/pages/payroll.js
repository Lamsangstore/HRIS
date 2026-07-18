// หน้า "จัดการเงินเดือน" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// หน้าใหญ่สุดของระบบ: งวดเงินเดือน, คำนวณอัตโนมัติ, แก้รายคน,
// export XLSX/KBIZ และส่งสลิปทาง LINE
// sendLineMessage ผูกกับ LINE token ใน app.html จึงเรียกผ่าน window

export default {
    title: '\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19',
    html: `
<style>
:root { --pr-gold:#eab308; --pr-dark:#18181b; }
.pr-input {
  width:100%; border:2px solid #f4f4f5; background:#fafafa; border-radius:.6rem;
  padding:.55rem .85rem; font-size:.8rem; font-weight:600; color:#27272a;
  outline:none; transition:all .18s; font-family:inherit;
}
.pr-input:focus { background:#fff; border-color:#eab308; box-shadow:0 0 0 3px rgba(234,179,8,.12); }
.pr-input[readonly],.pr-input:read-only { background:#f4f4f5; color:#71717a; cursor:default; border-color:#e4e4e7; }
.pr-lbl { display:block; font-size:.7rem; font-weight:700; color:#71717a; margin-bottom:.22rem; text-transform:uppercase; letter-spacing:.05em; }
.pr-section { border-left:3px solid #eab308; padding-left:1rem; margin-bottom:1.5rem; }
.pr-section-title { font-size:.68rem; font-weight:900; color:#a1a1aa; text-transform:uppercase; letter-spacing:.12em; margin-bottom:.7rem; }
.pr-row-earn   { background:#f0fdf4; }
.pr-row-deduct { background:#fef2f2; }
.pr-row-net    { background:#fefce8; }
.pr-badge-draft  { background:#fef9c3; color:#713f12; border:1px solid #fde047; }
.pr-badge-final  { background:#dcfce7; color:#14532d; border:1px solid #86efac; }
.pr-badge-paid   { background:#e0f2fe; color:#0c4a6e; border:1px solid #7dd3fc; }
.pr-slide { animation:prSlide .2s ease forwards; }
@keyframes prSlide { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
.num { font-variant-numeric:tabular-nums; }
</style>

<div class="p-6 lg:p-8 max-w-[1400px] mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <div class="flex items-center gap-3 mb-1">
        <div class="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-md">
          <i class="fa-solid fa-file-invoice-dollar text-yellow-400"></i>
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">Payroll Management</h2>
      </div>
      <p class="text-sm text-zinc-400 font-medium">\u0e04\u0e33\u0e19\u0e27\u0e13\u0e41\u0e25\u0e30\u0e08\u0e31\u0e14\u0e01\u0e32\u0e23\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19 Lamsang Group</p>
    </div>
    <button onclick="prOpenCreate()"
      class="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black px-6 py-3 rounded-xl shadow-lg transition-all text-sm uppercase tracking-widest">
      <i class="fa-solid fa-plus"></i> \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e07\u0e27\u0e14\u0e43\u0e2b\u0e21\u0e48
    </button>
  </div>
  <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
    <div class="xl:col-span-2">
      <div class="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div class="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 class="font-black text-zinc-800 text-sm uppercase tracking-widest flex items-center gap-2">
            <i class="fa-solid fa-calendar-days text-yellow-500"></i> \u0e07\u0e27\u0e14\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19
          </h3>
          <span id="pr-cnt" class="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">-</span>
        </div>
        <div id="pr-list" class="divide-y divide-zinc-100 max-h-[72vh] overflow-y-auto">
          <div class="p-8 text-center text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i><p class="text-sm font-bold">\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14...</p></div>
        </div>
      </div>
    </div>
    <div class="xl:col-span-3" id="pr-panel">
      <div class="bg-white rounded-2xl border border-zinc-200 p-10 flex flex-col items-center justify-center h-72 text-zinc-300">
        <i class="fa-solid fa-arrow-left text-5xl mb-4 opacity-25"></i>
        <p class="font-bold text-sm">\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e07\u0e27\u0e14\u0e08\u0e32\u0e01\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</p>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     LINE Payroll Send Modal
═══════════════════════════════════════════════════════ -->
<div id="pr-line-modal" class="fixed inset-0 z-[300] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="prLineClose()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="bg-[#06C755] px-7 py-5 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <i class="fa-brands fa-line text-white text-2xl"></i>
        </div>
        <div>
          <h3 class="font-black text-white text-lg leading-tight">ส่งสลิปเงินเดือนทาง LINE</h3>
          <p id="pr-line-period-sub" class="text-green-100 text-[11px] font-bold uppercase tracking-widest mt-0.5">กำลังโหลด...</p>
        </div>
      </div>
      <button onclick="prLineClose()" class="text-white/70 hover:text-white transition-colors">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="px-6 py-3 border-b border-zinc-100 flex items-center gap-3 shrink-0 bg-zinc-50">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" id="pr-line-all" onchange="prLineToggleAll(this.checked)"
          class="w-4 h-4 accent-[#06C755] cursor-pointer">
        <span class="text-sm font-bold text-zinc-700">เลือกทั้งหมด</span>
      </label>
      <span id="pr-line-sel-cnt" class="text-xs font-black text-[#06C755] bg-green-50 px-3 py-1 rounded-full ml-auto">0 คน</span>
      <div class="relative">
        <i class="fa-solid fa-search absolute left-3 top-2.5 text-zinc-400 text-xs"></i>
        <input type="text" id="pr-line-search" oninput="prLineFilter()"
          placeholder="ค้นหา..." class="border-2 border-zinc-200 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:border-[#06C755] focus:outline-none w-40">
      </div>
    </div>

    <!-- Employee list -->
    <div class="flex-1 overflow-y-auto px-6 py-4">
      <div id="pr-line-list" class="space-y-2">
        <div class="text-center py-10 text-zinc-300">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 border-t border-zinc-100 flex items-center gap-3 shrink-0 bg-white">
      <div class="flex-1">
        <p class="text-xs text-zinc-500 font-medium">ส่งเฉพาะพนักงานที่มี LINE User ID เท่านั้น</p>
        <p id="pr-line-no-id-warn" class="text-[10px] text-amber-600 font-bold hidden">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i>
          <span id="pr-line-no-id-cnt"></span> คนไม่มี LINE ID (จะไม่ถูกส่ง)
        </p>
      </div>
      <button onclick="prLineClose()"
        class="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl text-sm transition-all">
        ยกเลิก
      </button>
      <button id="pr-line-send-btn" onclick="prLineSend()"
        class="px-6 py-2.5 bg-[#06C755] hover:bg-[#05b04a] text-white font-black rounded-xl text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
        <i class="fa-brands fa-line"></i>
        <span id="pr-line-send-label">ส่งสลิป</span>
      </button>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     KBIZ Bank Export Modal
═══════════════════════════════════════════════════════ -->
<div id="pr-bank-modal" class="fixed inset-0 z-[300] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" onclick="prBankClose()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="bg-zinc-900 px-7 py-5 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-500/20 rounded-2xl flex items-center justify-center">
          <i class="fa-solid fa-building-columns text-green-400 text-xl"></i>
        </div>
        <div>
          <h3 class="font-black text-white text-lg leading-tight">Export โอนเงินเดือน (KBIZ)</h3>
          <p id="pr-bank-period-sub" class="text-zinc-400 text-[11px] font-bold uppercase tracking-widest mt-0.5">กำลังโหลด...</p>
        </div>
      </div>
      <button onclick="prBankClose()" class="text-zinc-400 hover:text-white transition-colors">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>

    <!-- Effective Date + Select All -->
    <div class="px-6 pt-5 pb-3 border-b border-zinc-100 shrink-0 space-y-3">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-[160px]">
          <label class="pr-lbl mb-1 block">วันที่เงินเข้าบัญชี (DD/MM/YYYY)</label>
          <input type="date" id="pr-bank-date" class="pr-input" />
        </div>
        <div class="flex items-center gap-2 pt-4">
          <input type="checkbox" id="pr-bank-chk-all" class="w-4 h-4 accent-zinc-900 cursor-pointer" onchange="prBankToggleAll(this.checked)">
          <label for="pr-bank-chk-all" class="text-xs font-black text-zinc-600 uppercase tracking-widest cursor-pointer select-none">เลือกทั้งหมด</label>
        </div>
      </div>
      <p class="text-[11px] text-zinc-400 font-medium">เลือกพนักงานที่ต้องการ Export — เฉพาะที่มีเลขบัญชีธนาคารเท่านั้น</p>
    </div>

    <!-- Employee List -->
    <div id="pr-bank-list" class="flex-1 overflow-y-auto divide-y divide-zinc-100 px-2 py-2">
      <div class="py-10 text-center text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
        <p class="text-sm font-bold mt-2">กำลังโหลด...</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
      <p class="text-xs text-zinc-400 font-bold"><span id="pr-bank-sel-count">0</span> คนที่เลือก</p>
      <div class="flex gap-2">
        <button onclick="prBankClose()" class="px-5 py-2.5 rounded-xl text-xs font-black text-zinc-500 hover:text-zinc-800 border-2 border-zinc-200 hover:border-zinc-400 transition-all uppercase tracking-widest">
          ยกเลิก
        </button>
        <button onclick="prBankExport()" class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">
          <i class="fa-solid fa-file-excel"></i> Export KBIZ
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Modal: Create Period -->
<div id="pr-modal-create" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="prCloseCreate()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
    <div class="bg-zinc-900 px-7 py-5 flex items-center justify-between">
      <div>
        <h3 class="font-black text-white text-lg">\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e07\u0e27\u0e14\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e43\u0e2b\u0e21\u0e48</h3>
        <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">New Payroll Period</p>
      </div>
      <button onclick="prCloseCreate()" class="text-zinc-400 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
    </div>
    <div class="p-7 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div><label class="pr-lbl">\u0e07\u0e27\u0e14\u0e17\u0e35\u0e48</label><input type="number" id="pr-no" class="pr-input" placeholder="1" min="1"></div>
        <div><label class="pr-lbl">\u0e1b\u0e35 (\u0e1e.\u0e28.)</label><input type="number" id="pr-yr" class="pr-input" placeholder="2568"></div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="pr-lbl">\u0e15\u0e31\u0e49\u0e07\u0e41\u0e15\u0e48\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</label><input type="date" id="pr-s" class="pr-input"></div>
        <div><label class="pr-lbl">\u0e16\u0e36\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48</label><input type="date" id="pr-e" class="pr-input"></div>
      </div>
      <div><label class="pr-lbl">\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</label><input type="text" id="pr-note" class="pr-input" placeholder="\u0e40\u0e0a\u0e48\u0e19 \u0e40\u0e14\u0e37\u0e2d\u0e19\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21 2568"></div>
      <button onclick="prDoCreate()" id="pr-create-btn"
        class="w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-4 rounded-xl transition-all text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-2">
        <i class="fa-solid fa-plus-circle"></i> \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e07\u0e27\u0e14
      </button>
    </div>
  </div>
</div>

<!-- Modal: Edit Record -->
<div id="pr-modal-rec" class="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="prCloseRec()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden">
    <div class="bg-zinc-900 px-4 sm:px-7 py-4 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <img id="pr-rec-av" src="" class="w-10 h-10 rounded-xl object-cover border border-zinc-700 shrink-0" onerror="handleImgError(this)">
        <div class="min-w-0">
          <p id="pr-rec-name" class="font-black text-white text-sm truncate">-</p>
          <p id="pr-rec-code" class="text-yellow-400 text-[10px] font-bold uppercase tracking-wide truncate">-</p>
        </div>
      </div>
      <button onclick="prCloseRec()" class="text-zinc-400 hover:text-white shrink-0 ml-2"><i class="fa-solid fa-xmark text-xl"></i></button>
    </div>
    <div class="overflow-y-auto flex-1 p-4 sm:p-7 space-y-5" id="pr-rec-body"></div>
    <div class="shrink-0 px-4 sm:px-7 py-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[10px] text-zinc-400 font-bold uppercase">รวมรับ (สุทธิ)</p>
        <p class="text-xl sm:text-2xl font-black text-green-600 num" id="pr-net-prev">฿ -</p>
      </div>
      <div class="flex gap-2 sm:gap-3 shrink-0">
        <button onclick="prCloseRec()" class="px-4 sm:px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl transition-all text-sm">ยกเลิก</button>
        <button onclick="prSaveRec()" id="pr-save-btn"
          class="px-5 sm:px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black rounded-xl transition-all text-sm uppercase tracking-wide shadow-md flex items-center gap-2">
          <i class="fa-solid fa-save"></i> บันทึก
        </button>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, addDoc, updateDoc, onSnapshot, query,
                orderBy, where, getDocs, writeBatch }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let periods = [], activeId = null, records = [], employees = [], editId = null, unsubRec = null;
        const fmt  = n => Number(n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
        const fmtD = s => s ? new Date(s+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit',timeZone:'Asia/Bangkok'}) : '-';
        const gN   = id => parseFloat(document.getElementById(id)?.value||0)||0;
        const gV   = id => document.getElementById(id)?.value?.trim()||'';
        const sEl  = id => document.getElementById(id);

        const empSnap = await getDocs(collection(db,'artifacts',APP_ID,'public','data','users'));
        employees = empSnap.docs.map(d=>d.data()).filter(e=>e.uid);

        const unsubP = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','payroll_periods'),orderBy('createdAt','desc')),
            snap => {
                periods = snap.docs.map(d=>({id:d.id,...d.data()}));
                renderList();
                const c = sEl('pr-cnt'); if(c) c.textContent = periods.length+' \u0e07\u0e27\u0e14';
            }
        );

        function badge(s) {
            return s==='paid' ? ['pr-badge-paid','\u0e08\u0e48\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27']
                 : s==='final' ? ['pr-badge-final','\u0e2a\u0e23\u0e38\u0e1b\u0e41\u0e25\u0e49\u0e27']
                 : ['pr-badge-draft','\u0e23\u0e48\u0e32\u0e07'];
        }

        function renderList() {
            const el = sEl('pr-list'); if(!el) return;
            if(!periods.length){el.innerHTML=`<div class="p-10 text-center text-zinc-300"><i class="fa-regular fa-folder-open text-4xl mb-3 block"></i><p class="font-bold text-sm">\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e07\u0e27\u0e14\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19</p></div>`;return;}
            el.innerHTML = periods.map(p=>{
                const ia=p.id===activeId;
                const [bc,bt]=badge(p.status);
                return `<button onclick="prSel('${p.id}')" class="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-all ${ia?'bg-yellow-50 border-l-4 border-yellow-500':''}">
                  <div class="w-11 h-11 rounded-2xl ${ia?'bg-zinc-900':'bg-zinc-100'} flex flex-col items-center justify-center shrink-0">
                    <span class="text-[9px] font-black ${ia?'text-yellow-400':'text-zinc-400'} uppercase leading-none">\u0e07\u0e27\u0e14</span>
                    <span class="text-lg font-black ${ia?'text-white':'text-zinc-700'} leading-none">${p.periodNo}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-black text-zinc-800 text-sm">\u0e07\u0e27\u0e14 ${p.periodNo} / ${p.year}</span>
                      <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${bc}">${bt}</span>
                    </div>
                    <p class="text-[11px] text-zinc-400 mt-0.5">${fmtD(p.startDate)} \u2013 ${fmtD(p.endDate)}</p>
                    ${p.note?`<p class="text-[10px] text-zinc-400 truncate">${p.note}</p>`:''}
                  </div>
                  <i class="fa-solid fa-chevron-right text-zinc-300 text-xs shrink-0"></i>
                </button>`;
            }).join('');
        }

        window.prSel = async pid => {
            activeId=pid; renderList();
            if(unsubRec){unsubRec();unsubRec=null;}
            const period=periods.find(p=>p.id===pid); if(!period) return;
            const panel=sEl('pr-panel');
            if(panel) panel.innerHTML=`<div class="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i><p class="font-bold text-sm">\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14...</p></div>`;
            unsubRec=onSnapshot(
                query(collection(db,'artifacts',APP_ID,'public','data','payroll_records'),
                      where('periodId','==',pid)),
                snap=>{records=snap.docs.map(d=>({id:d.id,...d.data()}));renderPanel(period);}
            );
        };

        function renderPanel(p) {
            const panel=sEl('pr-panel'); if(!panel) return;
            const isDraft=!p.status||p.status==='draft';
            const tNet=records.reduce((s,r)=>s+(r.netPay||0),0);
            const tEar=records.reduce((s,r)=>s+(r.totalEarning||0),0);
            const tDed=records.reduce((s,r)=>s+(r.totalDeduct||0),0);
            const [bc,bt]=badge(p.status);
            panel.innerHTML=`<div class="pr-slide space-y-5">
              <div class="bg-zinc-900 rounded-2xl p-6 text-white">
                <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-5xl font-black text-yellow-400 leading-none">${p.periodNo}</span>
                    <div>
                      <p class="font-black text-xl leading-tight">\u0e07\u0e27\u0e14\u0e17\u0e35\u0e48 ${p.periodNo} / ${p.year}</p>
                      <p class="text-zinc-400 text-xs mt-0.5">${fmtD(p.startDate)} \u2013 ${fmtD(p.endDate)}</p>
                      ${p.note?`<p class="text-zinc-500 text-xs">${p.note}</p>`:''}
                      <span class="mt-1 inline-block text-[10px] font-black px-2.5 py-0.5 rounded-full ${bc}">${bt}</span>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-[10px] text-zinc-400 font-bold uppercase">\u0e22\u0e2d\u0e14\u0e2a\u0e38\u0e17\u0e18\u0e34\u0e23\u0e27\u0e21</p>
                    <p class="text-3xl font-black text-yellow-400 num">\u0e3f${fmt(tNet)}</p>
                    <p class="text-[10px] text-zinc-500 mt-1">${records.length} \u0e04\u0e19</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800">
                  <div class="text-center"><p class="text-[10px] text-zinc-500 font-bold uppercase">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e23\u0e27\u0e21</p><p class="font-black text-green-400 num">\u0e3f${fmt(tEar)}</p></div>
                  <div class="text-center border-x border-zinc-800"><p class="text-[10px] text-zinc-500 font-bold uppercase">\u0e2b\u0e31\u0e01\u0e23\u0e27\u0e21</p><p class="font-black text-red-400 num">\u0e3f${fmt(tDed)}</p></div>
                  <div class="text-center"><p class="text-[10px] text-zinc-500 font-bold uppercase">\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19</p><p class="font-black text-white">${records.length} \u0e04\u0e19</p></div>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 items-center">
                ${isDraft?`
                <button onclick="prGenAll('${p.id}')" class="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">
                  <i class="fa-solid fa-bolt"></i> \u0e04\u0e33\u0e19\u0e27\u0e13\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34
                </button>
                <button onclick="prFinal('${p.id}')" class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">
                  <i class="fa-solid fa-lock"></i> \u0e2a\u0e23\u0e38\u0e1b\u0e07\u0e27\u0e14
                </button>`:''}
                ${p.status==='final'?`<button onclick="prPaid('${p.id}')" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm"><i class="fa-solid fa-check-double"></i> \u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e08\u0e48\u0e32\u0e22</button>`:''}
                <button onclick="prXLSX('${p.id}')" class="inline-flex items-center gap-2 border-2 border-green-200 hover:border-green-400 text-green-700 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">
                  <i class="fa-solid fa-file-excel"></i> Export XLSX
                </button>
                <button onclick="prBankOpen('${p.id}')" class="inline-flex items-center gap-2 border-2 border-blue-200 hover:border-blue-500 text-blue-700 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">
                  <i class="fa-solid fa-building-columns"></i> Export KBIZ
                </button>
                <button onclick="prLineOpen('${p.id}')" class="inline-flex items-center gap-2 bg-[#06C755] hover:bg-[#05b04a] text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">
                  <i class="fa-brands fa-line"></i> ส่งสลิปทาง LINE
                </button>
                ${isDraft?`<button onclick="prDel('${p.id}')" class="ml-auto inline-flex items-center gap-1.5 text-red-400 hover:text-red-600 font-black text-xs px-3 py-2 rounded-lg hover:bg-red-50 transition-all"><i class="fa-solid fa-trash-can"></i> \u0e25\u0e1a\u0e07\u0e27\u0e14</button>`:''}
              </div>
              <div class="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead><tr class="bg-zinc-50 border-b border-zinc-200">
                      <th class="px-4 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">\u0e1e\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19</th>
                      <th class="px-3 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49</th>
                      <th class="px-3 py-3 text-right text-[10px] font-black text-zinc-400 uppercase tracking-widest">\u0e2b\u0e31\u0e01</th>
                      <th class="px-3 py-3 text-right text-[10px] font-black text-green-600 uppercase tracking-widest">\u0e2a\u0e38\u0e17\u0e18\u0e34</th>
                      <th class="px-3 py-3 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">\u0e41\u0e01\u0e49\u0e44\u0e02</th>
                    </tr></thead>
                    <tbody>${records.length ? records.map(r=>{
                        const av=r.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f4f4f5&color=27272a&bold=true`;
                        return `<tr class="border-b border-zinc-100 hover:bg-zinc-50 transition-all">
                          <td class="px-4 py-3"><div class="flex items-center gap-3"><img src="${av}" onerror="handleImgError(this)" class="w-9 h-9 rounded-xl object-cover border border-zinc-200 shrink-0"><div class="min-w-0"><p class="font-black text-zinc-800 text-sm truncate">${r.name}${r.nickname?` (${r.nickname})`:''}</p><p class="text-[10px] text-zinc-400 font-bold uppercase">${r.employeeCode||''}</p></div></div></td>
                          <td class="px-3 py-3 text-right num text-sm font-bold text-zinc-700">\u0e3f${fmt(r.totalEarning)}</td>
                          <td class="px-3 py-3 text-right num text-sm font-bold text-red-500">\u0e3f${fmt(r.totalDeduct)}</td>
                          <td class="px-3 py-3 text-right num font-black text-green-600">\u0e3f${fmt(r.netPay)}</td>
                          <td class="px-3 py-3 text-center"><button onclick="prOpenRec('${r.id}')" class="text-xs font-black bg-zinc-100 hover:bg-zinc-900 hover:text-yellow-400 text-zinc-600 px-3 py-1.5 rounded-lg transition-all"><i class="fa-solid fa-pen-to-square mr-1"></i>${isDraft?'\u0e41\u0e01\u0e49\u0e44\u0e02':'\u0e14\u0e39'}</button></td>
                        </tr>`;
                    }).join('') : `<tr><td colspan="5" class="text-center py-12 text-zinc-300"><i class="fa-solid fa-circle-exclamation text-3xl mb-3 block"></i><p class="font-bold text-sm">\u0e01\u0e14 "\u0e04\u0e33\u0e19\u0e27\u0e13\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34" \u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</p></td></tr>`}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>`;
        }

        window.prOpenCreate = () => {
            const now=newDateTH(), y=now.getFullYear();
            const nx=periods.length ? Math.max(...periods.filter(p=>p.year==y).map(p=>p.periodNo||0))+1 : 1;
            const sv=(id,v)=>{const e=sEl(id);if(e)e.value=v;};
            sv('pr-no',nx); sv('pr-yr',y);
            const gy=now.getFullYear(), gm=now.getMonth();
            // ใช้ format YYYY-MM-DD โดยตรง ไม่ผ่าน toISOString เพื่อป้องกัน UTC shift
            const pad=n=>String(n).padStart(2,'0');
            sv('pr-s',`${gy}-${pad(gm+1)}-01`);
            const lastDay=new Date(gy,gm+1,0).getDate();
            sv('pr-e',`${gy}-${pad(gm+1)}-${pad(lastDay)}`);
            sEl('pr-modal-create')?.classList.remove('hidden');
        };
        window.prCloseCreate = () => sEl('pr-modal-create')?.classList.add('hidden');

        window.prDoCreate = async () => {
            const no=parseInt(gV('pr-no')), yr=parseInt(gV('pr-yr')), s=gV('pr-s'), e=gV('pr-e'), n=gV('pr-note');
            if(!no||!yr||!s||!e){showToast('\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e2b\u0e49\u0e04\u0e23\u0e1a','error');return;}
            const btn=sEl('pr-create-btn'); btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i>';
            try {
                const ref=await addDoc(collection(db,'artifacts',APP_ID,'public','data','payroll_periods'),
                    {periodNo:no,year:yr,startDate:s,endDate:e,note:n,status:'draft',createdAt:new Date().toISOString(),createdBy:profile.name});
                showToast('\u2705 \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e07\u0e27\u0e14\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22','success');
                prCloseCreate();
                setTimeout(()=>prSel(ref.id),300);
            } catch(err){showToast('\u274c '+err.message,'error');}
            finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-plus-circle mr-2"></i> \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e07\u0e27\u0e14';}
        };

        function cntDays(sd,ed,sc){
            const ws=new Set(sc.workDays||[1,2,3,4,5]), hd=new Set(sc.holidays||[]);
            let n=0, d=parseDateTH(sd), end=parseDateTH(ed);
            while(d<=end){const ds=dateToTHStr(d);if(ws.has(d.getDay())&&!hd.has(ds))n++;d.setDate(d.getDate()+1);}
            return n;
        }
        function calcTax(sal,mode){
            if(!mode||mode==='No')return 0;
            if(mode==='3')return Math.round(sal*0.03);
            const an=sal*12; let t=0,rem=an;
            for(const [c,r] of [[150000,0],[150000,.05],[200000,.1],[250000,.15],[250000,.2],[500000,.25],[500000,.3],[Infinity,.35]]){
                const tx=Math.min(rem,c); t+=tx*r; rem-=tx; if(rem<=0)break;
            }
            return Math.round(t/12);
        }

        window.prGenAll = async pid => {
            const active=employees.filter(e=>e.status!=='resigned');
            if(!confirm(
                `คำนวณเงินเดือนใหม่ให้ ${active.length} คน?\n\n`
              + `คำนวณใหม่จากข้อมูลล่าสุด: เงินเดือน ชั่วโมงลา OT คอมมิชชั่น ประกันสังคม ภาษี และหักอื่นๆ ประจำ\n`
              + `เก็บค่าที่พิมพ์เองไว้ให้: หักลา รายได้อื่นๆ และชั่วโมงสาย\n\n`
              + `หมายเหตุ: รายการหักอื่นๆ ที่เพิ่มไว้เฉพาะงวดนี้ จะถูกแทนที่ด้วยรายการประจำจากข้อมูลพนักงาน`
            ))return;
            const period=periods.find(p=>p.id===pid); if(!period)return;
            const btn=document.querySelector(`[onclick="prGenAll('${pid}')"]`);
            if(btn){btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังคำนวณ...';}
            try {
                const [ls,ss,otSnap]=await Promise.all([
                    getDocs(query(collection(db,'artifacts',APP_ID,'public','data','leave_requests'),where('status','==','approved'))),
                    getDocs(collection(db,'artifacts',APP_ID,'public','data','work_schedules')),
                    getDocs(query(collection(db,'artifacts',APP_ID,'public','data','ot_requests'),where('status','==','approved'),where('periodId','==',pid))),
                ]);
                const lbu={},sbu={},otbu={};
                ls.docs.forEach(d=>{const l=d.data();if(l.startDate<=period.endDate&&l.endDate>=period.startDate){if(!lbu[l.uid])lbu[l.uid]=[];lbu[l.uid].push(l);}});
                ss.docs.forEach(d=>{sbu[d.id]=d.data();});
                // รวม OT และ Commission ต่อพนักงาน (อาจมีหลาย request ต่องวด)
                otSnap.docs.forEach(d=>{
                    const o=d.data();
                    if(!otbu[o.uid]) otbu[o.uid]={otHours:0,commTotal:0,salesTotal:0};
                    otbu[o.uid].otHours   += o.otConverted||0;
                    otbu[o.uid].commTotal += o.commTotal||0;
                    // รวมยอดขายจาก commItems
                    (o.commItems||[]).forEach(c=>{ otbu[o.uid].salesTotal += c.sales||0; });
                });
                const ex=await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','payroll_records'),where('periodId','==',pid)));
                // ค่าพวกนี้ไม่มีที่มาจากไหน admin พิมพ์เองล้วนๆ — เก็บไว้ก่อนลบแล้วใส่คืน
                // ไม่งั้นกดคำนวณใหม่ทีเดียวหายหมด ต้องมานั่งกรอกใหม่ทุกคน
                const manual={};
                ex.docs.forEach(d=>{
                    const r=d.data(); if(!r.uid) return;
                    manual[r.uid]={
                        deductLeave:  r.deductLeave  || 0,
                        otherEarning: r.otherEarning || 0,
                        lateHours:    r.lateHours    || 0,
                    };
                });
                // ห้ามลบก่อนเขียน: ถ้า commit ชุดใหม่ล้ม (เน็ตหลุด/rules ปฏิเสธ)
                // งวดนั้นจะไม่เหลือ record เลย ทั้งยอดเงินและค่าที่พิมพ์มือหายถาวร
                // จึงใช้ doc id ที่คำนวณจาก periodId+uid แล้วเขียนทับ → commit → ค่อยลบของเก่า
                // ถ้าล้มกลางทางอย่างมากก็มีข้อมูลซ้ำชั่วคราว ซึ่งกดคำนวณใหม่อีกรอบก็หาย
                const recId = uid => `${pid}_${uid}`;
                const b2=writeBatch(db);
                active.forEach(emp=>{
                    const lv=lbu[emp.uid]||[], sc=sbu[emp.uid]||{workDays:[1,2,3,4,5],workStart:'08:00',workEnd:'17:00',breakMinutes:60};
                    const lh={sick:0,personal:0,vacation:0,other:0};
                    lv.forEach(l=>{const t=['sick','personal','vacation'].includes(l.type)?l.type:'other';lh[t]+=(l.totalHours||0);});
                    const wd=cntDays(period.startDate,period.endDate,sc);
                    const base=emp.baseSalary||0, daily=emp.dailyWage||0, hourly=emp.hourlyWage||0, commR=emp.commission||0;
                    const taxMode=emp.taxDeduction||'No';
                    const dSSO=emp.sso==='Yes'?Math.min(Math.round(base*0.05),750):0;
                    const dTax=taxMode==='custom' ? (emp.taxCustomAmount||0) : calcTax(base,taxMode), eD=daily*wd;
                    // OT & Commission จาก ot_requests ที่อนุมัติแล้ว
                    const otData=otbu[emp.uid]||{otHours:0,commTotal:0,salesTotal:0};
                    const wh=Math.round(otData.otHours*100)/100;
                    const eH=Math.round(hourly*wh*100)/100;
                    const eC=Math.round(otData.commTotal*100)/100;
                    const salesTotal=Math.round(otData.salesTotal*100)/100;
                    // หักอื่นๆ ประจำจากโปรไฟล์ — คัดลอกเป็น snapshot ไว้ในใบเงินเดือน
                    // งวดที่ปิดไปแล้วจะได้ไม่เปลี่ยนตามถ้ามีคนไปแก้โปรไฟล์ทีหลัง
                    const odItems=(emp.otherDeducts||[]).filter(it=>it && (it.label || it.amount>0))
                        .map(it=>({label:it.label||'',amount:Number(it.amount)||0}));
                    const dOther=Math.round(odItems.reduce((s,it)=>s+it.amount,0)*100)/100;
                    const mn=manual[emp.uid]||{deductLeave:0,otherEarning:0,lateHours:0};
                    const tEar=base+eD+eH+eC+mn.otherEarning, tDed=dSSO+dTax+dOther+mn.deductLeave, net=tEar-tDed;
                    const ref=doc(db,'artifacts',APP_ID,'public','data','payroll_records',recId(emp.uid));
                    b2.set(ref,{
                        periodId:pid,periodNo:period.periodNo,year:period.year,
                        uid:emp.uid,employeeCode:emp.employeeCode||'',name:emp.name,
                        nickname:emp.nickname||'',lineId:emp.lineId||'',photoURL:emp.photoURL||'',
                        branch:emp.branch||'',position:emp.position||'',
                        bankName:emp.bankName||'',bankAccount:emp.bankAccount||'',
                        baseSalary:base,dailyWage:daily,hourlyWage:hourly,commissionRate:commR,commissionMin:emp.commMin||emp.commissionMin||0,
                        workDays:wd,workHours:wh,commissionUnits:salesTotal,
                        earningDaily:eD,earningHourly:eH,earningCommission:eC,otherEarning:mn.otherEarning,
                        sickLeaveHours:lh.sick,personalLeaveHours:lh.personal,
                        vacationLeaveHours:lh.vacation,otherLeaveHours:lh.other,lateHours:mn.lateHours,
                        deductLeave:mn.deductLeave,deductSSO:dSSO,deductTax:dTax,otherDeduct:dOther,otherDeductItems:odItems,taxMode,taxCustomAmount:emp.taxCustomAmount||0,
                        totalEarning:tEar,totalDeduct:tDed,netPay:net,
                        createdAt:new Date().toISOString(),
                    });
                });
                await b2.commit();

                // ลบ record เก่าที่เป็น auto-id (จากตอนที่ยังไม่ได้ใช้ periodId_uid)
                // ทำหลัง commit สำเร็จแล้วเท่านั้น — ถ้าขั้นนี้ล้ม ข้อมูลใหม่ยังอยู่ครบ
                const keep=new Set(active.map(e=>recId(e.uid)));
                const stale=ex.docs.filter(d=>!keep.has(d.id));
                if(stale.length){const b3=writeBatch(db);stale.forEach(d=>b3.delete(d.ref));await b3.commit();}

                showToast(`✅ สร้าง ${active.length} รายการสำเร็จ`,'success');
            } catch(err){showToast('❌ '+err.message,'error');console.error(err);}
            finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-bolt mr-2"></i> คำนวณอัตโนมัติ';}}
        };

        window.prOpenRec = rid => {
            const r=records.find(x=>x.id===rid); if(!r) return;
            editId=rid;
            // fallback commissionMin จาก employee ถ้า record เก่าไม่มี
            const emp=employees.find(e=>e.uid===r.uid)||{};
            const commMin = r.commissionMin || emp.commMin || emp.commissionMin || 0;
            const period=periods.find(p=>p.id===r.periodId);
            const isDraft=!period||period.status==='draft';
            const RO=isDraft?'':'readonly';
            const av=r.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=27272a&color=eab308&bold=true`;
            sEl('pr-rec-av').src=av;
            sEl('pr-rec-name').textContent=`${r.name}${r.nickname?` (${r.nickname})`:''}`;
            sEl('pr-rec-code').textContent=`${r.employeeCode} \u00b7 ${r.branch||''} \u00b7 \u0e07\u0e27\u0e14 ${r.periodNo}/${r.year}`;
            sEl('pr-rec-body').innerHTML=`
            <div class="pr-section"><p class="pr-section-title">\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1e\u0e37\u0e49\u0e19\u0e10\u0e32\u0e19</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label class="pr-lbl">\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e25\u0e48\u0e19</label><input ${RO} id="rn" class="pr-input" value="${r.nickname||''}"></div>
                <div><label class="pr-lbl">Line ID</label><input ${RO} id="rl" class="pr-input" value="${r.lineId||''}"></div>
                <div><label class="pr-lbl">\u0e07\u0e27\u0e14\u0e17\u0e35\u0e48</label><input readonly id="rp" class="pr-input" value="${r.periodNo}/${r.year}"></div>
                <div><label class="pr-lbl">\u0e2a\u0e32\u0e02\u0e32</label><input readonly class="pr-input" value="${r.branch||'-'}"></div>
              </div>
            </div>
            <div class="pr-section"><p class="pr-section-title">\u0e2d\u0e31\u0e15\u0e23\u0e32\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label class="pr-lbl">\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19 (\u0e3f/\u0e40\u0e14\u0e37\u0e2d\u0e19)</label><input ${RO} id="rb" type="number" class="pr-input num" value="${r.baseSalary||0}"></div>
                <div><label class="pr-lbl">\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e27\u0e31\u0e19 (\u0e3f/\u0e27\u0e31\u0e19)</label><input ${RO} id="rd" type="number" class="pr-input num" value="${r.dailyWage||0}"></div>
                <div><label class="pr-lbl">\u0e04\u0e48\u0e32\u0e08\u0e49\u0e32\u0e07\u0e23\u0e32\u0e22\u0e0a\u0e21. (\u0e3f/\u0e0a\u0e21.)</label><input ${RO} id="rh" type="number" class="pr-input num" value="${r.hourlyWage||0}"></div>
                <div><label class="pr-lbl">\u0e04\u0e2d\u0e21\u0e21\u0e34\u0e0a\u0e0a\u0e31\u0e48\u0e19 (%)</label><input ${RO} id="rc" type="number" class="pr-input num" value="${r.commissionRate||0}"></div>
                <div><label class="pr-lbl">ยอดขั้นต่ำคอมมิชชั่น (฿)</label><input ${RO} id="rcm" type="number" class="pr-input num" value="${commMin}"></div>
              </div>
            </div>
            <div class="pr-section"><p class="pr-section-title">\u0e23\u0e27\u0e21\u0e27\u0e31\u0e19 / \u0e0a\u0e31\u0e48\u0e27\u0e42\u0e21\u0e07 / \u0e04\u0e2d\u0e21\u0e21\u0e34\u0e0a\u0e0a\u0e31\u0e48\u0e19</p>
              <div class="grid grid-cols-3 gap-3">
                <div><label class="pr-lbl">\u0e23\u0e27\u0e21\u0e27\u0e31\u0e19\u0e17\u0e33\u0e07\u0e32\u0e19</label><input ${RO} id="rwd" type="number" class="pr-input num" value="${r.workDays||0}"></div>
                <div><label class="pr-lbl">\u0e23\u0e27\u0e21\u0e0a\u0e21. OT/Extra</label><input ${RO} id="rwh" type="number" step="0.5" class="pr-input num" value="${r.workHours||0}"></div>
                <div><label class="pr-lbl">\u0e23\u0e27\u0e21\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e04\u0e2d\u0e21\u0e21\u0e34\u0e0a\u0e0a\u0e31\u0e48\u0e19</label><input ${RO} id="rcu" type="number" class="pr-input num" value="${r.commissionUnits||0}"></div>
              </div>
            </div>
            <div class="pr-section"><p class="pr-section-title">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49 (Earnings)</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-green-50 rounded-xl p-3 border border-green-100"><label class="pr-lbl" style="color:#15803d">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e27\u0e31\u0e19 (\u0e3f)</label><p class="font-black text-green-700 num text-base mt-0.5" id="red">${fmt(r.earningDaily||0)}</p></div>
                <div class="bg-green-50 rounded-xl p-3 border border-green-100"><label class="pr-lbl" style="color:#15803d">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e08\u0e32\u0e01\u0e0a\u0e21. (\u0e3f)</label><p class="font-black text-green-700 num text-base mt-0.5" id="reh">${fmt(r.earningHourly||0)}</p></div>
                <div class="bg-green-50 rounded-xl p-3 border border-green-100"><label class="pr-lbl" style="color:#15803d">รายได้คอมมิชชั่น (฿)</label><p class="font-black text-green-700 num text-base mt-0.5" id="rec">${fmt(r.earningCommission||0)}</p><p id="rec-note" class="text-[10px] mt-0.5">${(commMin>0&&(r.commissionUnits||0)<commMin&&(r.commissionUnits||0)>0)?'<span class="text-red-500 font-bold">⚠️ ยอดไม่ถึงขั้นต่ำ</span>':''}</p></div>
                <div><label class="pr-lbl">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49\u0e2d\u0e37\u0e48\u0e19\u0e46 (\u0e3f)</label><input ${RO} id="reo" type="number" class="pr-input num" value="${r.otherEarning||0}"></div>
              </div>
            </div>
            <div class="pr-section"><p class="pr-section-title">\u0e01\u0e32\u0e23\u0e25\u0e32 (Leave)</p>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div><label class="pr-lbl">\u0e25\u0e32\u0e1b\u0e48\u0e27\u0e22 (\u0e0a\u0e21.)</label><input ${RO} id="rls" type="number" step="0.5" class="pr-input num" value="${r.sickLeaveHours||0}"></div>
                <div><label class="pr-lbl">\u0e25\u0e32\u0e01\u0e34\u0e08 (\u0e0a\u0e21.)</label><input ${RO} id="rlp" type="number" step="0.5" class="pr-input num" value="${r.personalLeaveHours||0}"></div>
                <div><label class="pr-lbl">\u0e25\u0e32\u0e1e\u0e31\u0e01\u0e23\u0e49\u0e2d\u0e19 (\u0e0a\u0e21.)</label><input ${RO} id="rlv" type="number" step="0.5" class="pr-input num" value="${r.vacationLeaveHours||0}"></div>
                <div><label class="pr-lbl">\u0e25\u0e32\u0e2d\u0e37\u0e48\u0e19\u0e46 (\u0e0a\u0e21.)</label><input ${RO} id="rlo" type="number" step="0.5" class="pr-input num" value="${r.otherLeaveHours||0}"></div>
                <div><label class="pr-lbl">\u0e2a\u0e32\u0e22 (\u0e0a\u0e21.)</label><input ${RO} id="rlt" type="number" step="0.5" class="pr-input num" value="${r.lateHours||0}"></div>
              </div>
            </div>
            <div class="pr-section"><p class="pr-section-title">\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01 (Deductions)</p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label class="pr-lbl">\u0e2b\u0e31\u0e01\u0e25\u0e32 (\u0e3f)</label><input ${RO} id="rdl" type="number" class="pr-input num" value="${r.deductLeave||0}"></div>
                <div><label class="pr-lbl">\u0e2b\u0e31\u0e01\u0e1b\u0e23\u0e30\u0e01\u0e31\u0e19\u0e2a\u0e31\u0e07\u0e04\u0e21 (\u0e3f)</label><input ${RO} id="rds" type="number" class="pr-input num" value="${r.deductSSO||0}"></div>
                <div><label class="pr-lbl">ภาษี ณ ที่จ่าย</label>
                  <select ${RO} id="rtm" class="pr-input" onchange="prRecalc()">
                    <option value="No" ${r.taxMode==='No'||!r.taxMode?'selected':''}>ไม่หัก</option>
                    <option value="Yes" ${r.taxMode==='Yes'?'selected':''}>ตามขั้นบันได</option>
                    <option value="3" ${r.taxMode==='3'?'selected':''}>3% Fixed</option>
                    <option value="custom" ${r.taxMode==='custom'?'selected':''}>กำหนดเอง</option>
                  </select>
                </div>
                <div><label class="pr-lbl">หักภาษี (฿)</label><input id="rdt" type="number" class="pr-input num" value="${r.deductTax||0}" ${r.taxMode==='custom' ? (isDraft?'':'readonly') : 'readonly'} oninput="prRecalc()"></div>
                <div><label class="pr-lbl">\u0e2b\u0e31\u0e01\u0e2d\u0e37\u0e48\u0e19\u0e46 (\u0e3f)</label><input readonly id="rdo" type="number" class="pr-input num bg-zinc-100" value="${r.otherDeduct||0}"></div>
              </div>
              <div class="mt-4 pt-3 border-t border-zinc-100">
                <div class="flex items-center justify-between mb-2">
                  <p class="pr-lbl">\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e2d\u0e37\u0e48\u0e19\u0e46</p>
                  ${isDraft ? `<button type="button" onclick="prOdAdd()"
                    class="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-lg transition-all text-[11px]">
                    <i class="fa-solid fa-plus mr-1 text-zinc-500"></i> \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</button>` : ''}
                </div>
                <div id="pr-od-list" class="space-y-2"></div>
              </div>
            </div>
            <div class="rounded-2xl overflow-hidden border border-zinc-200">
              <table class="w-full text-sm">
                <tbody>
                  <tr class="pr-row-earn border-b border-green-100"><td class="px-5 py-3 font-bold text-green-700">\u0e23\u0e27\u0e21\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49</td><td class="px-5 py-3 text-right font-black text-green-700 num" id="rte">\u0e3f${fmt(r.totalEarning)}</td></tr>
                  <tr class="pr-row-deduct border-b border-red-100"><td class="px-5 py-3 font-bold text-red-600">\u0e23\u0e27\u0e21\u0e2b\u0e31\u0e01</td><td class="px-5 py-3 text-right font-black text-red-600 num" id="rtd">\u0e3f${fmt(r.totalDeduct)}</td></tr>
                  <tr class="pr-row-net"><td class="px-5 py-4 font-black text-zinc-800 text-base">\u0e23\u0e27\u0e21\u0e23\u0e31\u0e1a (\u0e2a\u0e38\u0e17\u0e18\u0e34)</td><td class="px-5 py-4 text-right font-black text-green-600 text-xl num" id="rtn">\u0e3f${fmt(r.netPay)}</td></tr>
                </tbody>
              </table>
            </div>`;

            // ใบเก่าที่บันทึกก่อนมีรายการย่อย จะมีแต่ยอดรวม otherDeduct
            // ต้องแปลงเป็น 1 รายการ ไม่งั้น prRecalc จะรวมจาก list ว่างแล้วทับยอดเดิมเป็น 0
            const odInit = (r.otherDeductItems && r.otherDeductItems.length)
                ? r.otherDeductItems
                : (Number(r.otherDeduct)>0 ? [{label:'หักอื่นๆ', amount:Number(r.otherDeduct)}] : []);
            prOdRender(odInit, isDraft);

            sEl('pr-net-prev').textContent=`\u0e3f ${fmt(r.netPay)}`;
            if(isDraft){
                ['rb','rd','rh','rc','rwd','rwh','rcu','reo','rdl','rds','rdt','rtm']
                    .forEach(id=>sEl(id)?.addEventListener('input',prRecalc));
            }
            const sb=sEl('pr-save-btn'); if(sb) sb.style.display=isDraft?'':'none';
            sEl('pr-modal-rec')?.classList.remove('hidden');
            prRecalc();
        };

        window.prCloseRec = () => { sEl('pr-modal-rec')?.classList.add('hidden'); editId=null; };

        // ── รายการหักอื่นๆ ในใบเงินเดือน (snapshot ที่คัดลอกมาจากโปรไฟล์ตอนสร้างงวด)
        // แก้เฉพาะงวดนี้ได้ ไม่ย้อนกลับไปแก้โปรไฟล์
        let prOdDraft = true;
        window.prOdRows = () =>
            [...document.querySelectorAll('#pr-od-list .pr-od-row')].map(r=>({
                label:  r.querySelector('.pr-od-label')?.value.trim() || '',
                amount: Number(r.querySelector('.pr-od-amount')?.value) || 0,
            }));

        window.prOdRender = (items, isDraft) => {
            prOdDraft = isDraft;
            const box=sEl('pr-od-list'); if(!box) return;
            const RO2 = isDraft ? '' : 'readonly';
            box.innerHTML = (items||[]).map((it,i)=>`
                <div class="pr-od-row flex gap-2 items-center">
                  <input ${RO2} type="text" class="pr-input pr-od-label flex-1" value="${(it.label||'').replace(/"/g,'&quot;')}" placeholder="หักค่าอะไร">
                  <input ${RO2} type="number" step="0.01" class="pr-input num pr-od-amount w-32" value="${Number(it.amount)||0}">
                  ${isDraft?`<button type="button" onclick="prOdRemove(${i})" title="ลบรายการนี้"
                    class="shrink-0 w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all">
                    <i class="fa-solid fa-trash-can text-xs"></i></button>`:''}
                </div>`).join('')
                || `<p class="text-[11px] text-zinc-400 font-medium py-2 text-center bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                      ไม่มีรายการหักอื่นๆ${isDraft?' — ตั้งรายการประจำได้ที่ข้อมูลพนักงาน หรือกด "เพิ่มรายการ" สำหรับงวดนี้เท่านั้น':''}
                    </p>`;
            if(isDraft) box.querySelectorAll('.pr-od-amount').forEach(el=>el.addEventListener('input',prRecalc));
            prRecalc();
        };

        window.prOdAdd = () => {
            prOdRender([...prOdRows(), {label:'',amount:0}], prOdDraft);
            document.querySelector('#pr-od-list .pr-od-row:last-child .pr-od-label')?.focus();
        };

        window.prOdRemove = (i) => {
            const items=prOdRows(); items.splice(i,1);
            prOdRender(items, prOdDraft);
        };

        window.prRecalc = () => {
            const b=gN('rb'),d=gN('rd'),h=gN('rh'),c=gN('rc');
            const wd=gN('rwd'),wh=gN('rwh'),cu=gN('rcu'),eo=gN('reo');
            const tm=sEl('rtm')?.value||'No';
            const cm=gN('rcm');
            // toggle หักภาษี field: custom = แก้ได้, อื่นๆ = readonly
            const rdtEl=sEl('rdt');
            const isLocked=sEl('rtm')?.hasAttribute('readonly');
            if(rdtEl){
                if(tm==='custom' && !isLocked) rdtEl.removeAttribute('readonly');
                else rdtEl.setAttribute('readonly','');
            }
            const eD=d*wd, eH=h*wh, eC=(cm>0&&cu<cm) ? 0 : cu*(c/100);
            const setT=(id,v)=>{const e=sEl(id);if(e)e.textContent=fmt(v);};
            setT('red',eD); setT('reh',eH); setT('rec',eC);
            // Commission min threshold note
            const recNote=sEl('rec-note');
            if(recNote){
                if(cm>0&&cu>0&&cu<cm) recNote.innerHTML='<span class="text-red-500 text-[10px] font-bold">⚠️ ยอดไม่ถึงขั้นต่ำ (' + cm.toLocaleString('th-TH') + ' ฿)</span>';
                else if(cm>0&&cu>=cm) recNote.innerHTML='<span class="text-green-600 text-[10px] font-bold">✅ ถึงขั้นต่ำ</span>';
                else recNote.innerHTML='';
            }
            const tEar=b+eD+eH+eC+eo;
            if(tm!=='custom'){const te=sEl('rdt');if(te)te.value=calcTax(b,tm);}
            // \u0e2b\u0e31\u0e01\u0e2d\u0e37\u0e48\u0e19\u0e46 \u0e21\u0e32\u0e08\u0e32\u0e01\u0e1c\u0e25\u0e23\u0e27\u0e21\u0e02\u0e2d\u0e07\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e22\u0e48\u0e2d\u0e22 \u0e0a\u0e48\u0e2d\u0e07 rdo \u0e40\u0e1b\u0e47\u0e19\u0e41\u0e04\u0e48\u0e17\u0e35\u0e48\u0e41\u0e2a\u0e14\u0e07\u0e1c\u0e25
            const dOther=Math.round(prOdRows().reduce((s,it)=>s+it.amount,0)*100)/100;
            const rdoEl=sEl('rdo'); if(rdoEl) rdoEl.value=dOther;
            const tDed=gN('rdl')+gN('rds')+gN('rdt')+dOther;
            const net=tEar-tDed;
            const setTL=(id,v)=>{const e=sEl(id);if(e)e.textContent=`\u0e3f${fmt(v)}`;};
            setTL('rte',tEar); setTL('rtd',tDed); setTL('rtn',net);
            const p=sEl('pr-net-prev');if(p)p.textContent=`\u0e3f ${fmt(net)}`;
        };

        window.prSaveRec = async () => {
            if(!editId) return;
            const b=gN('rb'),d=gN('rd'),h=gN('rh'),c=gN('rc');
            const wd=gN('rwd'),wh=gN('rwh'),cu=gN('rcu'),eo=gN('reo');
            const tm=sEl('rtm')?.value||'No';
            const cm=gN('rcm');
            const eD=d*wd,eH=h*wh,eC=(cm>0&&cu<cm) ? 0 : cu*(c/100);
            const tEar=b+eD+eH+eC+eo;
            const odItems=prOdRows().filter(it=>it.label||it.amount>0);
            const dOther=Math.round(odItems.reduce((s,it)=>s+it.amount,0)*100)/100;
            const tDed=gN('rdl')+gN('rds')+gN('rdt')+dOther;
            const net=tEar-tDed;
            const btn=sEl('pr-save-btn'); btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i> \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01...';
            try {
                await updateDoc(doc(db,'artifacts',APP_ID,'public','data','payroll_records',editId),{
                    nickname:gV('rn'),lineId:gV('rl'),
                    baseSalary:b,dailyWage:d,hourlyWage:h,commissionRate:c,commissionMin:cm,
                    workDays:wd,workHours:wh,commissionUnits:cu,
                    earningDaily:eD,earningHourly:eH,earningCommission:eC,otherEarning:eo,
                    sickLeaveHours:gN('rls'),personalLeaveHours:gN('rlp'),
                    vacationLeaveHours:gN('rlv'),otherLeaveHours:gN('rlo'),lateHours:gN('rlt'),
                    deductLeave:gN('rdl'),deductSSO:gN('rds'),deductTax:gN('rdt'),
                    otherDeduct:dOther,otherDeductItems:odItems,
                    taxMode:tm,totalEarning:tEar,totalDeduct:tDed,netPay:net,
                    updatedAt:new Date().toISOString(),
                });
                showToast('\u2705 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22','success');
                prCloseRec();
            } catch(err){showToast('\u274c '+err.message,'error');}
            finally{btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-save mr-2"></i> \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01';}
        };

        window.prFinal = async pid => {
            if(!confirm('\u0e2a\u0e23\u0e38\u0e1b\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49? \u0e08\u0e30\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e41\u0e01\u0e49\u0e44\u0e02\u0e44\u0e14\u0e49\u0e2d\u0e35\u0e01'))return;
            try{await updateDoc(doc(db,'artifacts',APP_ID,'public','data','payroll_periods',pid),
                {status:'final',finalizedAt:new Date().toISOString(),finalizedBy:profile.name});
                showToast('\u2705 \u0e2a\u0e23\u0e38\u0e1b\u0e07\u0e27\u0e14\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22','success');
            }catch(err){showToast('\u274c '+err.message,'error');}
        };
        window.prPaid = async pid => {
            if(!confirm('\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e08\u0e48\u0e32\u0e22\u0e40\u0e07\u0e34\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49?'))return;
            try{await updateDoc(doc(db,'artifacts',APP_ID,'public','data','payroll_periods',pid),
                {status:'paid',paidAt:new Date().toISOString(),paidBy:profile.name});
                showToast('\u2705 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e08\u0e48\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27','success');
            }catch(err){showToast('\u274c '+err.message,'error');}
        };
        window.prDel = async pid => {
            if(!confirm('\u0e25\u0e1a\u0e07\u0e27\u0e14\u0e19\u0e35\u0e49\u0e41\u0e25\u0e30\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14?'))return;
            try{
                const ex=await getDocs(query(collection(db,'artifacts',APP_ID,'public','data','payroll_records'),where('periodId','==',pid)));
                const b=writeBatch(db); ex.docs.forEach(d=>b.delete(d.ref));
                b.delete(doc(db,'artifacts',APP_ID,'public','data','payroll_periods',pid));
                await b.commit(); activeId=null;
                const panel=sEl('pr-panel');
                if(panel)panel.innerHTML=`<div class="bg-white rounded-2xl border border-zinc-200 p-10 flex flex-col items-center justify-center h-72 text-zinc-300"><i class="fa-solid fa-trash-can text-4xl mb-3 opacity-30"></i><p class="font-bold text-sm">\u0e25\u0e1a\u0e07\u0e27\u0e14\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22</p></div>`;
                showToast('\u0e25\u0e1a\u0e07\u0e27\u0e14\u0e41\u0e25\u0e49\u0e27','info');
            }catch(err){showToast('\u274c '+err.message,'error');}
        };

        window.prXLSX = async pid => {
            const period = periods.find(p => p.id === pid);
            if (!period || !records.length) { showToast('ไม่มีข้อมูล', 'error'); return; }

            // Load SheetJS dynamically if not loaded
            if (typeof XLSX === 'undefined') {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
            }

            // Headers ตาม template ของระบบ
            const headers = [
                'เลขที่พนักงาน',
                'ชื่อ - นามสกุล',
                'เงินเดือน(SAL)',
                'ส่วนแบ่งการขาย(COM)',
                'ค่าล่วงเวลา(OT)',
                'ค่ากะ(R004)',
                'โบนัส(R003)',
                'ค่าปรับ(FN)',
                'กองทุนเงินให้กู้ยืมเพื่อการศึกษา(STL)',
                'ภาษีหัก ณ ที่จ่าย(WHT)',
                'ประกันสังคม(SSF)'
            ];

            // Map payroll records → template columns
            const dataRows = records.map(r => [
                r.employeeCode || '',                          // เลขที่พนักงาน
                r.name || '',                                  // ชื่อ - นามสกุล
                r.baseSalary || 0,                             // เงินเดือน(SAL)
                r.earningCommission || 0,                      // ส่วนแบ่งการขาย(COM)
                r.earningHourly || 0,                          // ค่าล่วงเวลา(OT)
                r.earningDaily || 0,                           // ค่ากะ(R004)
                r.otherEarning || 0,                           // โบนัส(R003)
                r.deductLeave || 0,                            // ค่าปรับ(FN)
                r.otherDeduct || 0,                            // กองทุนเงินให้กู้ยืมเพื่อการศึกษา(STL)
                r.deductTax || 0,                              // ภาษีหัก ณ ที่จ่าย(WHT)
                r.deductSSO || 0,                              // ประกันสังคม(SSF)
            ]);

            // Build worksheet
            const wsData = [headers, ...dataRows];
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Column widths (match template approximately)
            ws['!cols'] = [
                { wch: 14 },  // เลขที่พนักงาน
                { wch: 28 },  // ชื่อ - นามสกุล
                { wch: 16 },  // เงินเดือน
                { wch: 20 },  // ส่วนแบ่งการขาย
                { wch: 14 },  // OT
                { wch: 12 },  // ค่ากะ
                { wch: 12 },  // โบนัส
                { wch: 10 },  // ค่าปรับ
                { wch: 36 },  // กองทุน
                { wch: 20 },  // ภาษี
                { wch: 16 },  // ประกันสังคม
            ];

            // Style header row — gray fill, bold (using !ref-based approach)
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!ws[addr]) continue;
                ws[addr].s = {
                    font: { bold: true, name: 'Calibri', sz: 11 },
                    fill: { fgColor: { rgb: 'D3D3D3' }, patternType: 'solid' },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: {
                        top:    { style: 'thin', color: { rgb: '999999' } },
                        bottom: { style: 'thin', color: { rgb: '999999' } },
                        left:   { style: 'thin', color: { rgb: '999999' } },
                        right:  { style: 'thin', color: { rgb: '999999' } },
                    }
                };
            }
            // Style data rows — number format with 2 decimal places
            for (let R = 1; R <= dataRows.length; R++) {
                for (let C = 0; C <= range.e.c; C++) {
                    const addr = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[addr]) continue;
                    const isNum = C >= 2;
                    ws[addr].s = {
                        font: { name: 'Calibri', sz: 11 },
                        numFmt: isNum ? '#,##0.00' : '@',
                        alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
                        border: {
                            top:    { style: 'thin', color: { rgb: 'DDDDDD' } },
                            bottom: { style: 'thin', color: { rgb: 'DDDDDD' } },
                            left:   { style: 'thin', color: { rgb: 'DDDDDD' } },
                            right:  { style: 'thin', color: { rgb: 'DDDDDD' } },
                        }
                    };
                }
            }

            XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลนำเข้าเงินเดือน');

            // Download
            const filename = `Import_SalaryPayRun_${period.year}_${String(period.periodNo).padStart(2,'0')}.xlsx`;
            XLSX.writeFile(wb, filename, { bookSST: false, type: 'binary', cellStyles: true });
            showToast('📥 Export XLSX สำเร็จ', 'success');
        };

        // ── KBIZ Bank Export Logic ────────────────────────────────────
        const BANK_CODES = { KBANK:'004', SCB:'014', BBL:'002', KTB:'006', BAY:'025', GSB:'030', BAAC:'034', TTB:'011', UOB:'024', CIMB:'022' };
        let _bankActivePid = null;
        let _bankRecords   = [];

        window.prBankOpen = async (pid) => {
            _bankActivePid = pid;
            const p = periods.find(x => x.id === pid);
            if (!p) return;

            document.getElementById('pr-bank-modal')?.classList.remove('hidden');
            const sub = document.getElementById('pr-bank-period-sub');
            if (sub) sub.textContent = `งวดที่ ${p.periodNo} / ${p.year}`;

            // Default effective date = today (เวลาไทย)
            const dateEl = document.getElementById('pr-bank-date');
            if (dateEl && !dateEl.value) {
                dateEl.value = todayTH();
            }

            const list = document.getElementById('pr-bank-list');
            if (list) list.innerHTML = '<div class="py-10 text-center text-zinc-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm font-bold mt-2">กำลังโหลด...</p></div>';

            // Use already-loaded records if same period
            _bankRecords = records.filter(r => r.periodId === pid || !r.periodId);
            if (!_bankRecords.length) _bankRecords = records;
            // Fallback: เติม bankAccount/bankName จาก employees ถ้า record เก่าไม่มี
            _bankRecords = _bankRecords.map(r => {
                if (r.bankAccount && r.bankAccount.trim()) return r;
                const emp = employees.find(e => e.uid === r.uid);
                if (emp && emp.bankAccount) {
                    return { ...r, bankAccount: emp.bankAccount, bankName: emp.bankName || '' };
                }
                return r;
            });
            prBankRenderList();
        };

        function prBankRenderList() {
            const list = document.getElementById('pr-bank-list');
            if (!list) return;
            const withBank = _bankRecords.filter(r => r.bankAccount && r.bankAccount.trim());
            const noBank   = _bankRecords.filter(r => !r.bankAccount || !r.bankAccount.trim());

            if (!_bankRecords.length) {
                list.innerHTML = '<div class="py-10 text-center text-zinc-400"><i class="fa-solid fa-users-slash text-2xl mb-2"></i><p class="text-sm font-bold">ไม่มีข้อมูลพนักงาน</p></div>';
                return;
            }

            let html = '';
            if (withBank.length) {
                html += `<div class="px-4 py-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0">มีบัญชีธนาคาร (${withBank.length} คน)</div>`;
                withBank.forEach(r => {
                    const av = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f4f4f5&color=27272a&bold=true`;
                    const bankLabel = r.bankName || 'ธนาคาร';
                    const code = BANK_CODES[r.bankName] || '???';
                    const hasCode = BANK_CODES[r.bankName];
                    html += `<label class="flex items-center gap-4 px-4 py-3 hover:bg-blue-50 cursor-pointer transition-all">
                        <input type="checkbox" class="pr-bank-chk w-4 h-4 accent-zinc-900 cursor-pointer shrink-0" value="${r.id}" checked onchange="prBankUpdateCount()">
                        <img src="${av}" class="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200">
                        <div class="flex-1 min-w-0">
                            <p class="font-black text-zinc-800 text-sm truncate">${r.name || ''}</p>
                            <p class="text-[11px] text-zinc-400 font-medium truncate">${bankLabel} ${hasCode ? `(${code})` : '<span class="text-red-400">ไม่รู้จักรหัสธนาคาร</span>'} · ${r.bankAccount || ''}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-black text-sm text-zinc-800 num">฿${(r.netPay||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                            <p class="text-[10px] text-zinc-400">สุทธิ</p>
                        </div>
                    </label>`;
                });
            }
            if (noBank.length) {
                html += `<div class="px-4 py-2 text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-50 sticky top-0">ไม่มีข้อมูลบัญชี (${noBank.length} คน — ไม่รวมใน Export)</div>`;
                noBank.forEach(r => {
                    const av = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=f4f4f5&color=27272a&bold=true`;
                    html += `<div class="flex items-center gap-4 px-4 py-3 opacity-40">
                        <div class="w-4 h-4 shrink-0"></div>
                        <img src="${av}" class="w-9 h-9 rounded-full object-cover shrink-0 border border-zinc-200">
                        <div class="flex-1 min-w-0">
                            <p class="font-black text-zinc-800 text-sm truncate">${r.name || ''}</p>
                            <p class="text-[11px] text-red-400 font-bold">ยังไม่ได้ระบุบัญชีธนาคาร</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="font-black text-sm text-zinc-500 num">฿${(r.netPay||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                        </div>
                    </div>`;
                });
            }
            list.innerHTML = html;
            prBankUpdateCount();

            // Sync select-all checkbox
            const allChk = document.getElementById('pr-bank-chk-all');
            if (allChk) allChk.checked = withBank.length > 0;
        }

        window.prBankUpdateCount = () => {
            const checked = document.querySelectorAll('.pr-bank-chk:checked').length;
            const el = document.getElementById('pr-bank-sel-count');
            if (el) el.textContent = checked;
        };

        window.prBankToggleAll = (checked) => {
            document.querySelectorAll('.pr-bank-chk').forEach(c => { c.checked = checked; });
            prBankUpdateCount();
        };

        window.prBankClose = () => {
            document.getElementById('pr-bank-modal')?.classList.add('hidden');
        };

        window.prBankExport = async () => {
            const dateEl = document.getElementById('pr-bank-date');
            if (!dateEl || !dateEl.value) { showToast('กรุณาระบุวันที่เงินเข้าบัญชี', 'error'); return; }

            const selectedIds = new Set([...document.querySelectorAll('.pr-bank-chk:checked')].map(c => c.value));
            if (!selectedIds.size) { showToast('กรุณาเลือกพนักงานอย่างน้อย 1 คน', 'error'); return; }

            // Format effective date DD/MM/YYYY
            const [yyyy, mm, dd] = dateEl.value.split('-');
            const effectiveDate = `${dd}/${mm}/${yyyy}`;

            const selected = _bankRecords.filter(r => selectedIds.has(r.id) && r.bankAccount && r.bankAccount.trim());
            if (!selected.length) { showToast('ไม่มีพนักงานที่มีบัญชีธนาคารในรายการที่เลือก', 'error'); return; }

            if (typeof XLSX === 'undefined') {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    s.onload = res; s.onerror = rej;
                    document.head.appendChild(s);
                });
            }

            const period = periods.find(p => p.id === _bankActivePid);

            // ── Build KBIZ template format ──
            const wb = XLSX.utils.book_new();
            const ws = {};

            // Row 1: Summary formulas (as values to match template style)
            const totalAmt = selected.reduce((s, r) => s + (r.netPay || 0), 0);
            ws['A1'] = { v: 'Total No. of Transaction / จำนวนรายการทั้งหมด ', t: 's' };
            ws['B1'] = { v: selected.length, t: 'n' };
            ws['C1'] = { v: 'Total Amount / จำนวนเงินทั้งหมด ', t: 's' };
            ws['D1'] = { v: totalAmt, t: 'n', z: '#,##0.00' };

            // Row 2: blank
            ws['A2'] = { v: '', t: 's' };

            // Row 3: Headers
            const headers = [
                'Bank Code / \nรหัสธนาคาร',
                'Account number / \nเลขบัญชีรับเงิน',
                'Account name / \nชื่อบัญชีรับเงิน',
                'Amount/ \nจำนวนเงิน',
                'Effective Date /\nวันที่เงินเข้าบัญชี\n(DD/MM/YYYY) '
            ];
            const cols = ['A','B','C','D','E'];
            headers.forEach((h, i) => {
                ws[`${cols[i]}3`] = { v: h, t: 's' };
            });

            // Data rows starting at row 4
            selected.forEach((r, i) => {
                const row = i + 4;
                const bankCode = BANK_CODES[r.bankName] || '';
                ws[`A${row}`] = { v: bankCode, t: 's' };
                ws[`B${row}`] = { v: (r.bankAccount || '').trim(), t: 's' };
                ws[`C${row}`] = { v: r.name || '', t: 's' };
                ws[`D${row}`] = { v: r.netPay || 0, t: 'n', z: '#,##0.00' };
                ws[`E${row}`] = { v: effectiveDate, t: 's' };
            });

            // Set sheet range
            const lastRow = selected.length + 3;
            ws['!ref'] = `A1:E${lastRow}`;

            // Column widths matching template
            ws['!cols'] = [
                { wch: 18 },  // Bank Code
                { wch: 22 },  // Account Number
                { wch: 30 },  // Account Name
                { wch: 20 },  // Amount
                { wch: 28 },  // Effective Date
            ];

            // Row heights
            ws['!rows'] = [];
            ws['!rows'][2] = { hpt: 50 }; // header row taller for wrapped text

            // Styles — Row 1 summary
            ['A1','B1','C1','D1'].forEach(addr => {
                if (!ws[addr]) return;
                ws[addr].s = {
                    font: { bold: true, name: 'Calibri', sz: 10 },
                    fill: { fgColor: { rgb: 'FFF2CC' }, patternType: 'solid' },
                    alignment: { vertical: 'center', wrapText: false },
                    border: { top:{style:'thin',color:{rgb:'CCCCCC'}}, bottom:{style:'thin',color:{rgb:'CCCCCC'}}, left:{style:'thin',color:{rgb:'CCCCCC'}}, right:{style:'thin',color:{rgb:'CCCCCC'}} }
                };
            });

            // Styles — Header row 3
            cols.forEach(c => {
                const addr = `${c}3`;
                if (!ws[addr]) return;
                ws[addr].s = {
                    font: { bold: true, name: 'Calibri', sz: 10 },
                    fill: { fgColor: { rgb: 'D6DCE4' }, patternType: 'solid' },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    border: { top:{style:'thin',color:{rgb:'999999'}}, bottom:{style:'thin',color:{rgb:'999999'}}, left:{style:'thin',color:{rgb:'999999'}}, right:{style:'thin',color:{rgb:'999999'}} }
                };
            });

            // Styles — Data rows
            for (let i = 0; i < selected.length; i++) {
                const row = i + 4;
                cols.forEach((c, ci) => {
                    const addr = `${c}${row}`;
                    if (!ws[addr]) return;
                    const isNum = ci === 3;
                    ws[addr].s = {
                        font: { name: 'Calibri', sz: 10 },
                        alignment: { horizontal: isNum ? 'right' : (ci === 0 ? 'center' : 'left'), vertical: 'center' },
                        border: { top:{style:'thin',color:{rgb:'E4E4E7'}}, bottom:{style:'thin',color:{rgb:'E4E4E7'}}, left:{style:'thin',color:{rgb:'E4E4E7'}}, right:{style:'thin',color:{rgb:'E4E4E7'}} }
                    };
                });
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Transaction Upload');

            const pNo = period ? String(period.periodNo).padStart(2,'0') : '00';
            const pYr = period ? period.year : newDateTH().getFullYear();
            const filename = `KBIZ_PayrollTransfer_${pYr}_${pNo}_${dd}${mm}${yyyy}.xlsx`;
            XLSX.writeFile(wb, filename, { bookSST: false, type: 'binary', cellStyles: true });
            prBankClose();
            showToast(`📥 Export KBIZ สำเร็จ (${selected.length} รายการ)`, 'success');
        };

        // ── LINE Payroll Send Logic ──────────────────────────────────
        let _lineActivePid = null;
        let _lineRecords   = [];

        window.prLineOpen = async (pid) => {
            _lineActivePid = pid;
            const p = periods.find(x => x.id === pid);
            if (!p) return;

            // เปิด modal ก่อน แล้วค่อยโหลด
            document.getElementById('pr-line-modal')?.classList.remove('hidden');
            const list = document.getElementById('pr-line-list');
            if (list) list.innerHTML = '<div class="py-10 text-center text-zinc-400"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm font-bold mt-2">กำลังโหลด...</p></div>';

            const sub = document.getElementById('pr-line-period-sub');
            if (sub) sub.textContent = `งวดที่ ${p.periodNo}/${p.year}  ·  ${fmtD(p.startDate)} – ${fmtD(p.endDate)}`;

            // โหลด records + users พร้อมกัน เพื่อดึง lineId ล่าสุดจาก users
            try {
                const [recSnap, userSnap] = await Promise.all([
                    getDocs(query(
                        collection(db,'artifacts',APP_ID,'public','data','payroll_records'),
                        where('periodId','==',pid)
                    )),
                    getDocs(collection(db,'artifacts',APP_ID,'public','data','users')),
                ]);
                // map uid → lineId ล่าสุด
                const userLineMap = {};
                userSnap.docs.forEach(d => {
                    const u = d.data();
                    if (u.uid) userLineMap[u.uid] = u.lineId || '';
                });
                // merge lineId ล่าสุดเข้า records
                _lineRecords = recSnap.docs.map(d => {
                    const r = { id:d.id, ...d.data() };
                    r.lineId = userLineMap[r.uid] || r.lineId || '';
                    return r;
                });
            } catch(e) {
                _lineRecords = records.filter(r => r.periodId === pid); // fallback
            }

            // count no-lineId
            const noId = _lineRecords.filter(r => !r.lineId).length;
            const warnEl = document.getElementById('pr-line-no-id-warn');
            const cntEl  = document.getElementById('pr-line-no-id-cnt');
            if (warnEl && cntEl) {
                if (noId > 0) { warnEl.classList.remove('hidden'); cntEl.textContent = noId; }
                else            { warnEl.classList.add('hidden'); }
            }

            // reset
            const allCb = document.getElementById('pr-line-all');
            if (allCb) allCb.checked = false;
            const searchEl = document.getElementById('pr-line-search');
            if (searchEl) searchEl.value = '';

            prLineFilter();
        };

        window.prLineClose = () => {
            document.getElementById('pr-line-modal')?.classList.add('hidden');
        };

        window.prLineFilter = () => {
            const q = (document.getElementById('pr-line-search')?.value || '').toLowerCase();
            const list = document.getElementById('pr-line-list');
            if (!list) return;
            const filtered = _lineRecords.filter(r =>
                !q || r.name.toLowerCase().includes(q) ||
                (r.branch||'').toLowerCase().includes(q) ||
                (r.employeeCode||'').toLowerCase().includes(q)
            );
            list.innerHTML = filtered.length ? filtered.map(r => {
                const hasLine = !!r.lineId;
                const av = r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=06C755&color=fff&bold=true`;
                return `<label class="flex items-center gap-3 p-3 rounded-2xl border-2 border-zinc-100 hover:border-[#06C755] cursor-pointer transition-all group ${hasLine ? '' : 'opacity-50 cursor-not-allowed'}" ${!hasLine ? 'title="ไม่มี LINE User ID"' : ''}>
                    <input type="checkbox" class="pr-line-cb w-4 h-4 accent-[#06C755] cursor-pointer shrink-0" data-rid="${r.id}" ${!hasLine ? 'disabled' : ''}>
                    <img src="${av}" onerror="handleImgError(this)" class="w-9 h-9 rounded-full object-cover border-2 border-zinc-200 group-hover:border-[#06C755] transition-all shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-zinc-800 truncate">${r.name}${r.nickname ? ` <span class="text-zinc-400 font-normal">(${r.nickname})</span>` : ''}</p>
                        <p class="text-[10px] text-zinc-400 font-medium truncate">${r.branch||''} · ${r.position||''}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-sm font-black text-zinc-800 num">฿${fmt(r.netPay||0)}</p>
                        ${hasLine
                            ? '<span class="text-[9px] font-black text-[#06C755] bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">มี LINE</span>'
                            : '<span class="text-[9px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-wider">ไม่มี LINE ID</span>'}
                    </div>
                </label>`;
            }).join('') : '<p class="text-center text-zinc-400 text-sm py-8">ไม่พบรายการ</p>';
            prLineUpdateCount();
        };

        window.prLineToggleAll = (checked) => {
            document.querySelectorAll('.pr-line-cb:not(:disabled)').forEach(cb => { cb.checked = checked; });
            prLineUpdateCount();
        };

        function prLineUpdateCount() {
            const sel = document.querySelectorAll('.pr-line-cb:checked').length;
            const el = document.getElementById('pr-line-sel-cnt');
            if (el) el.textContent = `${sel} คน`;
            const allEl = document.getElementById('pr-line-all');
            const total = document.querySelectorAll('.pr-line-cb:not(:disabled)').length;
            if (allEl) allEl.checked = total > 0 && sel === total;
            document.getElementById('pr-line-list')?.querySelectorAll('label').forEach(lbl => {
                lbl.addEventListener('change', prLineUpdateCount);
            });
        }
        document.getElementById('pr-line-list')?.addEventListener('change', prLineUpdateCount);

        window.prLineSend = async () => {
            const pid = _lineActivePid;
            const p   = periods.find(x => x.id === pid);
            if (!p) return;
            const selectedIds = [...document.querySelectorAll('.pr-line-cb:checked')].map(cb => cb.dataset.rid);
            if (!selectedIds.length) { showToast('กรุณาเลือกพนักงานอย่างน้อย 1 คน', 'error'); return; }

            const btn = document.getElementById('pr-line-send-btn');
            const lbl = document.getElementById('pr-line-send-label');
            btn.disabled = true; lbl.textContent = 'กำลังส่ง...';

            const period_label = `งวดที่ ${p.periodNo}/${p.year}`;
            const period_range = `${fmtD(p.startDate)} – ${fmtD(p.endDate)}`;
            let ok = 0, fail = 0;

            for (const rid of selectedIds) {
                const r = _lineRecords.find(x => x.id === rid);
                if (!r || !r.lineId) { fail++; continue; }
                lbl.textContent = `กำลังส่ง ${r.name}...`;
                try {
                    await sendLineMessage(r.lineId, [buildPayslipFlex(r, period_label, period_range)]);
                    ok++;
                } catch(e) {
                    console.warn('LINE send failed:', r.name, e.message);
                    fail++;
                    if (fail === 1) showToast(`❌ ${r.name}: ${e.message}`, 'error');
                }
                await new Promise(res => setTimeout(res, 300)); // rate limit
            }

            btn.disabled = false; lbl.textContent = 'ส่งสลิป';
            prLineClose();
            showToast(
                fail === 0
                    ? `✅ ส่งสลิปทาง LINE สำเร็จ ${ok} คน`
                    : `⚠️ สำเร็จ ${ok} คน, ล้มเหลว ${fail} คน`,
                fail === 0 ? 'success' : 'info'
            );
        };

        function buildPayslipFlex(r, periodLabel, periodRange) {
            const fmtN = n => Number(n||0).toLocaleString('th-TH', {minimumFractionDigits:2, maximumFractionDigits:2});
            const fmtB = n => `฿${fmtN(n)}`;
            const fmtI = n => Number(n||0) === 0 ? '0' : fmtN(n);

            const row = (label, val, bold, color) => ({
                type:'box', layout:'horizontal', margin:'xs',
                contents:[
                    { type:'text', text:label, size:'sm', color:'#52525b', flex:4, wrap:false },
                    { type:'text', text:String(val), size:'sm', align:'end', flex:3,
                      weight: bold ? 'bold' : 'regular',
                      color:  color || (bold ? '#18181b' : '#3f3f46') }
                ]
            });
            const section = (icon, label, color) => ({
                type:'box', layout:'horizontal', margin:'md', alignItems:'center',
                contents:[
                    { type:'text', text:icon+' '+label, size:'xs', weight:'bold', color:color, flex:1 }
                ]
            });
            const sep = { type:'separator', margin:'sm', color:'#e4e4e7' };

            // ลา — ใช้ field names จาก payroll_records จริง
            const leaveRows = [
                row('ลาป่วย (ชม.)',               fmtI(r.sickLeaveHours)),
                row('ลาพักร้อน (ชม.)',             fmtI(r.vacationLeaveHours)),
                row('ลากิจ (ชม.)',                fmtI(r.personalLeaveHours)),
                row('ลาอื่นๆ (ชม.)',              fmtI(r.otherLeaveHours)),
                row('ไม่ได้บันทึกเวลา (เข้า-ออก)', `${r.missingCheckIn||0}-${r.missingCheckOut||0}`),
            ];

            // รายได้
            const earningRows = [
                row('เงินเดือน ('+(r.workDays||0)+')', fmtI(r.baseSalary)),
                row('รายวัน ('+(r.workDays||0)+')',     fmtI(r.earningDaily)),
                row('รายชั่วโมง ('+(r.workHours||0)+')',fmtI(r.earningHourly)),
                row('คอมมิชชั่น ('+(r.commissionUnits||0)+')', fmtI(r.earningCommission)),
                row('รายได้อื่นๆ',                     fmtI(r.otherEarning)),
                { type:'box', layout:'horizontal', margin:'xs',
                  contents:[
                    { type:'text', text:'รวมเงินได้', size:'sm', weight:'bold', color:'#18181b', flex:4 },
                    { type:'text', text:fmtN(r.totalEarning), size:'sm', weight:'bold', color:'#18181b', align:'end', flex:3 }
                  ]
                },
            ];

            // หัก — taxMode เก็บเป็น text เช่น "3%" หรือ "No"
            const taxLabel = r.taxMode && r.taxMode !== 'No' ? `หักภาษี ณ ที่จ่าย ${r.taxMode}` : 'หักภาษี ณ ที่จ่าย';
            // แจกแจงหักอื่นๆ ทีละรายการ เพื่อให้พนักงานรู้ว่าถูกหักค่าอะไรบ้าง
            // ถ้าไม่มีรายการย่อย (ใบเก่าก่อนมีฟีเจอร์นี้) ให้แสดงยอดรวมเหมือนเดิม
            const odItems = (r.otherDeductItems||[]).filter(it => it && (it.label || it.amount > 0));
            const otherDeductRows = odItems.length
                ? odItems.map(it => row(`• ${it.label || 'หักอื่นๆ'}`, fmtI(it.amount), false, '#dc2626'))
                : [row('หักอื่นๆ', fmtI(r.otherDeduct), false, '#dc2626')];
            const deductRows = [
                row(taxLabel,          fmtI(r.deductTax),   false, '#dc2626'),
                row('หักประกันสังคม', fmtI(r.deductSSO),   false, '#dc2626'),
                row('หักขาดงาน',      fmtI(r.deductLeave), false, '#dc2626'),
                ...otherDeductRows,
                { type:'box', layout:'horizontal', margin:'xs',
                  contents:[
                    { type:'text', text:'รวมเงินหัก', size:'sm', weight:'bold', color:'#dc2626', flex:4 },
                    { type:'text', text:fmtN(r.totalDeduct), size:'sm', weight:'bold', color:'#dc2626', align:'end', flex:3 }
                  ]
                },
            ];

            const heroContents = r.photoURL ? [{
                type:'image', url: r.photoURL,
                size:'full', aspectRatio:'20:13', aspectMode:'cover'
            }] : [];

            return {
                type: 'flex',
                altText: `สลิปเงินเดือน ${periodLabel} - ${r.name} ฿${fmtN(r.netPay)}`,
                contents: {
                    type:'bubble', size:'mega',
                    ...(r.photoURL ? {
                        hero: {
                            type:'image', url:r.photoURL,
                            size:'full', aspectRatio:'20:10', aspectMode:'cover'
                        }
                    } : {}),
                    body: {
                        type:'box', layout:'vertical',
                        paddingAll:'16px', spacing:'none',
                        contents:[
                            // หัวข้อ period
                            { type:'text', text:`เงินเดือนงวดที่ ${periodLabel.replace('งวดที่ ','')}`, size:'sm', color:'#52525b' },
                            { type:'text', text:`ตั้งแต่ วันที่ ${periodRange.split('–')[0]?.trim()}`, size:'xs', color:'#71717a' },
                            { type:'text', text:`ถึง วันที่ ${(periodRange.split('–')[1]||'').trim()}`, size:'xs', color:'#71717a' },
                            sep,
                            // ชื่อ + รหัส
                            { type:'box', layout:'horizontal', margin:'md', alignItems:'center',
                              contents:[
                                { type:'text', text: r.employeeCode||'', size:'sm', color:'#52525b', flex:2 },
                                { type:'text', text: r.nickname||r.name, size:'lg', weight:'bold', color:'#18181b', align:'end', flex:3 }
                              ]
                            },
                            { type:'text', text: r.name + (r.position?' · '+r.position:''), size:'xs', color:'#71717a', align:'end' },
                            sep,
                            // ลารวม
                            section('🗓️','ลารวม','#52525b'),
                            ...leaveRows,
                            sep,
                            // เงินได้
                            section('💰','เงินได้','#16a34a'),
                            ...earningRows,
                            sep,
                            // เงินหัก
                            section('💸','เงินหัก','#dc2626'),
                            ...deductRows,
                            sep,
                            // สุทธิ
                            { type:'box', layout:'horizontal', margin:'md', alignItems:'center',
                              contents:[
                                { type:'text', text:'เงินได้สุทธิ', size:'md', weight:'bold', color:'#18181b', flex:2 },
                                { type:'text', text:fmtN(r.netPay), size:'xl', weight:'bold', color:'#ca8a04', align:'end', flex:3 }
                              ]
                            },
                        ]
                    },
                    footer: {
                        type:'box', layout:'vertical', paddingAll:'12px',
                        backgroundColor:'#f4f4f5',
                        contents:[
                            { type:'text', text:'พบปัญหาติดต่อที่ HR', size:'xs', color:'#a1a1aa', align:'center' }
                        ]
                    }
                }
            };
        }

        return () => {
            unsubP();
            if(unsubRec) unsubRec();
            ['prSel','prOpenCreate','prCloseCreate','prDoCreate','prGenAll',
             'prOpenRec','prCloseRec','prRecalc','prSaveRec',
             'prFinal','prPaid','prDel','prCSV','prXLSX',
             'prBankOpen','prBankClose','prBankExport','prBankToggleAll','prBankUpdateCount',
             'prLineOpen','prLineClose','prLineFilter','prLineToggleAll','prLineSend'
            ].forEach(k=>delete window[k]);
        };
    }
};
