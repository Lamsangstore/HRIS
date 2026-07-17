// หน้า "วันหยุดตามประเพณี" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ตัวช่วยที่หน้านี้ใช้ (showToast, navigateTo, parseDateTH, window._publicHolidays)
// ยังเป็น global บน window อยู่ จึงเรียกได้ตรงๆ ไม่ต้อง import
// ถ้าวันหนึ่งย้ายพวกนั้นเป็นโมดูลด้วย ต้องกลับมาเพิ่ม import ที่นี่

export default {
    title: 'วันหยุดตามประเพณี',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">วันหยุดตามประเพณี</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">จัดการวันหยุดนักขัตฤกษ์ที่แสดงบนปฏิทินของพนักงานทุกคน</p>
    </div>
    <div class="flex gap-2">
      <button onclick="holAddPreset()" class="inline-flex items-center gap-2 border-2 border-zinc-200 hover:border-yellow-400 text-zinc-700 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">
        <i class="fa-solid fa-wand-magic-sparkles"></i> เพิ่ม Preset ปี 2568
      </button>
      <button onclick="holOpenModal(null)" class="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black px-5 py-2.5 rounded-xl shadow-md transition-all text-sm uppercase tracking-widest">
        <i class="fa-solid fa-plus"></i> เพิ่มวันหยุด
      </button>
    </div>
  </div>

  <!-- Filter by year -->
  <div class="flex items-center gap-3 mb-6">
    <label class="text-xs font-black text-zinc-500 uppercase tracking-widest">แสดงปี (พ.ศ.)</label>
    <select id="hol-year-filter" onchange="holFilterYear()" class="border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
      <option value="all">ทั้งหมด</option>
    </select>
    <span id="hol-count" class="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full ml-auto">-</span>
  </div>

  <!-- Holiday list -->
  <div class="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
    <div id="hol-list" class="divide-y divide-zinc-100">
      <div class="p-8 text-center text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i><p class="font-bold text-sm">กำลังโหลด...</p></div>
    </div>
  </div>
</div>

<!-- Modal -->
<div id="hol-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="holCloseModal()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
    <div class="bg-zinc-900 px-7 py-5 flex items-center justify-between">
      <div>
        <h3 id="hol-modal-title" class="font-black text-white text-lg">เพิ่มวันหยุด</h3>
        <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Public Holiday</p>
      </div>
      <button onclick="holCloseModal()" class="text-zinc-400 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
    </div>
    <div class="p-7 space-y-4">
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">วันที่</label>
        <input type="date" id="hol-date" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">ชื่อวันหยุด (ภาษาไทย)</label>
        <input type="text" id="hol-name" placeholder="เช่น วันสงกรานต์" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">ชื่อ (ภาษาอังกฤษ, ไม่บังคับ)</label>
        <input type="text" id="hol-name-en" placeholder="Songkran Festival" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">ประเภท</label>
        <select id="hol-type" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
          <option value="national">วันหยุดนักขัตฤกษ์</option>
          <option value="royal">วันหยุดราชการพิเศษ</option>
          <option value="company">วันหยุดบริษัท</option>
          <option value="regional">วันหยุดประจำภูมิภาค</option>
        </select>
      </div>
      <input type="hidden" id="hol-edit-id">
      <button onclick="holSave()" id="hol-save-btn"
        class="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-4 rounded-xl transition-all shadow-md uppercase tracking-widest text-sm flex items-center justify-center gap-2">
        <i class="fa-solid fa-save"></i> บันทึก
      </button>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, orderBy, query, writeBatch }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let allHolidays = [];

        const unsub = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','public_holidays'), orderBy('date','asc')),
            snap => {
                allHolidays = snap.docs.map(d=>({id:d.id,...d.data()}));
                window._publicHolidays = allHolidays; // sync global cache
                buildYearFilter();
                holFilterYear();
            }
        );

        function buildYearFilter() {
            const sel = document.getElementById('hol-year-filter'); if(!sel) return;
            const years = [...new Set(allHolidays.map(h => parseInt(h.date.slice(0,4)).toString()))].sort();
            const curVal = sel.value;
            sel.innerHTML = '<option value="all">ทั้งหมด</option>' + years.map(y=>`<option value="${y}" ${y===curVal?'selected':''}>${y}</option>`).join('');
        }

        window.holFilterYear = () => {
            const yr = document.getElementById('hol-year-filter')?.value;
            const filtered = yr==='all' ? allHolidays : allHolidays.filter(h => parseInt(h.date.slice(0,4)).toString()===yr);
            renderList(filtered);
            const cnt = document.getElementById('hol-count');
            if(cnt) cnt.textContent = filtered.length + ' วัน';
        };

        const TYPE_MAP = { national:'วันหยุดนักขัตฤกษ์', royal:'วันหยุดราชการพิเศษ', company:'วันหยุดบริษัท', regional:'วันหยุดประจำภูมิภาค' };
        const DAY_NAMES = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

        function renderList(list) {
            const el = document.getElementById('hol-list'); if(!el) return;
            if (!list.length) { el.innerHTML=`<div class="p-10 text-center text-zinc-300"><i class="fa-regular fa-calendar-xmark text-4xl mb-3 block"></i><p class="font-bold text-sm">ยังไม่มีวันหยุด</p></div>`; return; }
            // Group by year
            const grouped = {};
            list.forEach(h => {
                const yr = parseInt(h.date.slice(0,4)).toString();
                if (!grouped[yr]) grouped[yr] = [];
                grouped[yr].push(h);
            });
            let html = '';
            Object.keys(grouped).sort().forEach(yr => {
                html += `<div class="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                    <i class="fa-solid fa-calendar-days text-yellow-500 text-sm"></i>
                    <span class="font-black text-zinc-700 text-xs uppercase tracking-widest">ปี ${yr}</span>
                    <span class="text-[10px] text-zinc-400 font-bold ml-auto">${grouped[yr].length} วัน</span>
                </div>`;
                grouped[yr].forEach(h => {
                    const d = parseDateTH(h.date);
                    const dayName = DAY_NAMES[d.getDay()];
                    const thDate = d.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Bangkok'});
                    const typeBadge = { national:'bg-red-100 text-red-700', royal:'bg-purple-100 text-purple-700', company:'bg-blue-100 text-blue-700', regional:'bg-orange-100 text-orange-700' }[h.type]||'bg-zinc-100 text-zinc-600';
                    html += `<div class="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-all group">
                      <div class="w-12 text-center shrink-0">
                        <p class="text-lg font-black text-zinc-800">${d.getDate()}</p>
                        <p class="text-[10px] text-zinc-400 font-bold">${dayName}</p>
                      </div>
                      <div class="w-px h-10 bg-zinc-200 shrink-0"></div>
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <p class="font-black text-zinc-800 text-sm">${h.name}</p>
                          ${h.nameEn ? `<p class="text-xs text-zinc-400">${h.nameEn}</p>` : ''}
                          <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${typeBadge}">${TYPE_MAP[h.type]||h.type}</span>
                        </div>
                        <p class="text-xs text-zinc-400 mt-0.5">${thDate}</p>
                      </div>
                      <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button onclick="holOpenModal('${h.id}')" class="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-yellow-400 flex items-center justify-center transition-all"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="holDelete('${h.id}')" class="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-red-400 hover:text-white flex items-center justify-center transition-all"><i class="fa-solid fa-trash text-xs"></i></button>
                      </div>
                    </div>`;
                });
            });
            el.innerHTML = html;
        }

        window.holOpenModal = (id) => {
            const h = id ? allHolidays.find(x=>x.id===id) : null;
            const setV = (elId, v) => { const e=document.getElementById(elId); if(e) e.value=v||''; };
            setV('hol-edit-id', id||'');
            setV('hol-date',    h?.date||'');
            setV('hol-name',    h?.name||'');
            setV('hol-name-en', h?.nameEn||'');
            setV('hol-type',    h?.type||'national');
            const title = document.getElementById('hol-modal-title');
            if(title) title.textContent = id ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด';
            document.getElementById('hol-modal')?.classList.remove('hidden');
        };
        window.holCloseModal = () => document.getElementById('hol-modal')?.classList.add('hidden');

        window.holSave = async () => {
            const date   = document.getElementById('hol-date')?.value;
            const name   = document.getElementById('hol-name')?.value.trim();
            const nameEn = document.getElementById('hol-name-en')?.value.trim();
            const type   = document.getElementById('hol-type')?.value;
            const editId = document.getElementById('hol-edit-id')?.value;
            if (!date || !name) { showToast('กรุณากรอกวันที่และชื่อวันหยุด', 'error'); return; }
            const btn = document.getElementById('hol-save-btn');
            btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i>';
            try {
                const payload = { date, name, nameEn: nameEn||'', type, updatedAt: new Date().toISOString() };
                if (editId) {
                    await setDoc(doc(db,'artifacts',APP_ID,'public','data','public_holidays',editId), payload, {merge:true});
                } else {
                    payload.createdAt = new Date().toISOString();
                    payload.createdBy = profile.name;
                    await addDoc(collection(db,'artifacts',APP_ID,'public','data','public_holidays'), payload);
                }
                showToast('✅ บันทึกวันหยุดแล้ว', 'success');
                holCloseModal();
            } catch(e) { showToast('❌ '+e.message,'error'); }
            finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-save mr-2"></i> บันทึก'; }
        };

        window.holDelete = async (id) => {
            const h = allHolidays.find(x=>x.id===id);
            if (!confirm(`ลบวันหยุด "${h?.name}" ?`)) return;
            try {
                await deleteDoc(doc(db,'artifacts',APP_ID,'public','data','public_holidays',id));
                showToast('ลบแล้ว','info');
            } catch(e) { showToast('❌ '+e.message,'error'); }
        };

        // Preset วันหยุด 2568
        window.holAddPreset = async () => {
            const preset = [
                {date:'2025-01-01',name:'วันขึ้นปีใหม่',nameEn:'New Year\'s Day',type:'national'},
                {date:'2025-02-12',name:'วันมาฆบูชา',nameEn:'Makha Bucha Day',type:'national'},
                {date:'2025-04-06',name:'วันจักรี',nameEn:'Chakri Memorial Day',type:'national'},
                {date:'2025-04-13',name:'วันสงกรานต์',nameEn:'Songkran Festival',type:'national'},
                {date:'2025-04-14',name:'วันสงกรานต์',nameEn:'Songkran Festival',type:'national'},
                {date:'2025-04-15',name:'วันสงกรานต์',nameEn:'Songkran Festival',type:'national'},
                {date:'2025-05-01',name:'วันแรงงานแห่งชาติ',nameEn:'National Labour Day',type:'national'},
                {date:'2025-05-05',name:'วันฉัตรมงคล',nameEn:'Coronation Day',type:'national'},
                {date:'2025-05-12',name:'วันวิสาขบูชา',nameEn:'Visakha Bucha Day',type:'national'},
                {date:'2025-06-03',name:'วันเฉลิมพระชนมพรรษา สมเด็จพระราชินี',nameEn:'Queen\'s Birthday',type:'national'},
                {date:'2025-07-10',name:'วันอาสาฬหบูชา',nameEn:'Asarnha Bucha Day',type:'national'},
                {date:'2025-07-11',name:'วันเข้าพรรษา',nameEn:'Buddhist Lent Day',type:'national'},
                {date:'2025-07-28',name:'วันเฉลิมพระชนมพรรษา ร.10',nameEn:'King\'s Birthday',type:'national'},
                {date:'2025-08-12',name:'วันแม่แห่งชาติ',nameEn:'Mother\'s Day',type:'national'},
                {date:'2025-10-13',name:'วันนวมินทรมหาราช',nameEn:'Navamindra Maharaj Day',type:'national'},
                {date:'2025-10-23',name:'วันปิยมหาราช',nameEn:'Chulalongkorn Day',type:'national'},
                {date:'2025-12-05',name:'วันพ่อแห่งชาติ',nameEn:'Father\'s Day',type:'national'},
                {date:'2025-12-10',name:'วันรัฐธรรมนูญ',nameEn:'Constitution Day',type:'national'},
                {date:'2025-12-31',name:'วันสิ้นปี',nameEn:'New Year\'s Eve',type:'national'},
            ];
            if (!confirm(`เพิ่มวันหยุดนักขัตฤกษ์ปี 2568 จำนวน ${preset.length} วัน?`)) return;
            try {
                const batch = writeBatch(db);
                preset.forEach(h => {
                    const ref = doc(collection(db,'artifacts',APP_ID,'public','data','public_holidays'));
                    batch.set(ref, {...h, createdAt: new Date().toISOString(), createdBy: profile.name});
                });
                await batch.commit();
                showToast(`✅ เพิ่ม ${preset.length} วันหยุดสำเร็จ`, 'success');
            } catch(e) { showToast('❌ '+e.message,'error'); }
        };

        return () => {
            unsub();
            ['holFilterYear','holOpenModal','holCloseModal','holSave','holDelete','holAddPreset'].forEach(k=>delete window[k]);
        };
    }
};
