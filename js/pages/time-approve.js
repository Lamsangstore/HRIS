// หน้า "อนุมัติเวลา" (หัวหน้า)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / navigateTo / handleImgError ซึ่งเป็น global บน window

export default {
    title: 'อนุมัติคำขอเวลา',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">อนุมัติคำขอเวลา</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">ตรวจสอบคำขอชี้แจงและแก้ไขเวลาของพนักงาน</p>
    </div>
    <select id="ta-filter" onchange="taFilter()" class="border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
      <option value="pending">รออนุมัติ</option>
      <option value="approved">อนุมัติแล้ว</option>
      <option value="rejected">ไม่อนุมัติ</option>
      <option value="all">ทั้งหมด</option>
    </select>
  </div>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-yellow-600" id="ta-stat-p">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">รออนุมัติ</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-green-600" id="ta-stat-a">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">อนุมัติแล้ว</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-red-600" id="ta-stat-r">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">ไม่อนุมัติ</p>
    </div>
  </div>
  <div id="ta-list" class="space-y-4">
    <div class="text-center py-12 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i></div>
  </div>
</div>

<!-- Action modal -->
<div id="ta-action-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="taCloseAction()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
    <div id="ta-action-header" class="px-7 py-5">
      <h3 id="ta-action-title" class="font-black text-white text-lg">-</h3>
    </div>
    <div class="p-7 space-y-4">
      <div id="ta-action-detail" class="bg-zinc-50 rounded-xl p-4 text-sm space-y-1.5 border border-zinc-200"></div>
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">หมายเหตุ (ถึงพนักงาน)</label>
        <textarea id="ta-action-note" rows="2" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:border-yellow-500 focus:outline-none resize-none"></textarea>
      </div>
      <div class="flex gap-3">
        <button onclick="taCloseAction()" class="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl text-sm">ยกเลิก</button>
        <button id="ta-confirm-btn" onclick="taConfirm()" class="flex-1 py-3 font-black rounded-xl text-sm text-white">ยืนยัน</button>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') { navigateTo('home'); return; }
        const { collection, doc, addDoc, onSnapshot, query, orderBy, updateDoc, where, getDocs }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let allReqs = [], pendingAction = null;

        const unsub = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','time_requests'), orderBy('createdAt','desc')),
            snap => {
                allReqs = snap.docs.map(d=>({id:d.id,...d.data()}));
                updateStats(); taFilter();
            }
        );

        function updateStats() {
            const s = (st) => allReqs.filter(r=>r.status===st).length;
            const setT = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
            setT('ta-stat-p', s('pending')); setT('ta-stat-a', s('approved')); setT('ta-stat-r', s('rejected'));
        }

        // ประกาศแบบ function เพื่อให้ hoist ได้ — onSnapshot อาจ callback ทันที
        // (Firestore มี cache ในเครื่อง) ถ้าใช้ const/arrow จะ ReferenceError
        // แล้วรายการไม่ render ทั้งที่ตัวเลขสถิติขึ้นแล้ว
        function taFilter() {
            const f = document.getElementById('ta-filter')?.value||'pending';
            const list = f==='all' ? allReqs : allReqs.filter(r=>r.status===f);
            renderList(list);
        }
        window.taFilter = taFilter;

        function renderList(list) {
            const el = document.getElementById('ta-list'); if(!el) return;
            if (!list.length) { el.innerHTML=`<div class="text-center py-16 text-zinc-300"><i class="fa-regular fa-folder-open text-5xl mb-3"></i><p class="font-bold text-sm">ไม่มีคำขอในหมวดนี้</p></div>`; return; }
            const ST = { pending:{label:'รออนุมัติ',cls:'bg-yellow-100 text-yellow-800 border border-yellow-200',icon:'fa-clock'},
                         approved:{label:'อนุมัติแล้ว',cls:'bg-green-100 text-green-800 border border-green-200',icon:'fa-circle-check'},
                         rejected:{label:'ไม่อนุมัติ',cls:'bg-red-100 text-red-700 border border-red-200',icon:'fa-circle-xmark'},
                         cancelled:{label:'ยกเลิก',cls:'bg-zinc-100 text-zinc-500 border border-zinc-200',icon:'fa-ban'} };
            const av = r => r.photoURL||`https://ui-avatars.com/api/?name=${encodeURIComponent(r.employeeName)}&background=f4f4f5&color=27272a&bold=true`;
            el.innerHTML = list.map(r => {
                const st = ST[r.status]||ST.pending;
                const isPending = r.status==='pending';
                const typeLabel = r.reqType==='explain' ? '💬 ชี้แจงไม่ได้บันทึก' : '✏️ ขอแก้ไขเวลา';
                const timeInfo = r.reqType==='explain'
                    ? `เข้า ${r.timeIn||'-'} · ออก ${r.timeOut||'-'}`
                    : `เดิม ${r.origIn||'-'}/${r.origOut||'-'} → ใหม่ ${r.timeIn||'-'}/${r.timeOut||'-'}`;
                return `<div class="tr-card bg-white rounded-2xl border border-zinc-200 p-5">
                  <div class="flex flex-col lg:flex-row gap-4">
                    <div class="flex items-center gap-3 lg:w-48 shrink-0">
                      <img src="${av(r)}" onerror="handleImgError(this)" data-name="${r.employeeName||''}" class="w-12 h-12 rounded-2xl object-cover border border-zinc-200">
                      <div class="min-w-0">
                        <p class="font-black text-zinc-800 text-sm truncate">${r.employeeName}</p>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">${r.employeeCode||''}</p>
                        <p class="text-[10px] text-zinc-400">${r.branch||''}</p>
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="flex flex-wrap items-center gap-2 mb-1.5">
                        <span class="font-bold text-zinc-800 text-sm">${typeLabel}</span>
                        <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${st.cls}"><i class="fa-solid ${st.icon} mr-1"></i>${st.label}</span>
                      </div>
                      <p class="text-sm font-bold text-zinc-600">📅 ${r.date} · ${timeInfo}</p>
                      <p class="text-xs text-zinc-400 mt-1 line-clamp-2">${r.reason}</p>
                      ${r.approverNote ? `<p class="text-xs text-zinc-500 mt-1 bg-zinc-50 px-3 py-1 rounded-lg border"><i class="fa-solid fa-comment mr-1 text-zinc-400"></i>${r.approverNote}</p>` : ''}
                    </div>
                    ${isPending ? `<div class="flex lg:flex-col gap-2 shrink-0 justify-end">
                      <button onclick="taOpenAction('${r.id}','approve')" class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">
                        <i class="fa-solid fa-check"></i> อนุมัติ
                      </button>
                      <button onclick="taOpenAction('${r.id}','reject')" class="inline-flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all">
                        <i class="fa-solid fa-xmark"></i> ไม่อนุมัติ
                      </button>
                    </div>` : `<div class="shrink-0 text-right text-xs">
                      <p class="text-zinc-400">โดย ${r.approvedBy||'-'}</p>
                    </div>`}
                  </div>
                </div>`;
            }).join('');
        }

        window.taOpenAction = (id, action) => {
            const r = allReqs.find(x=>x.id===id); if(!r) return;
            pendingAction = {id, action};
            const isApp = action==='approve';
            const hdr = document.getElementById('ta-action-header');
            if(hdr) hdr.className = `px-7 py-5 ${isApp?'bg-green-600':'bg-red-600'}`;
            const title = document.getElementById('ta-action-title');
            if(title) title.textContent = isApp ? '✅ อนุมัติคำขอ' : '❌ ไม่อนุมัติคำขอ';
            const det = document.getElementById('ta-action-detail');
            if(det) det.innerHTML = `
                <div class="flex justify-between"><span class="text-zinc-400">พนักงาน</span><span class="font-bold">${r.employeeName}</span></div>
                <div class="flex justify-between"><span class="text-zinc-400">ประเภท</span><span class="font-bold">${r.reqType==='explain'?'ชี้แจงไม่ได้บันทึก':'ขอแก้ไขเวลา'}</span></div>
                <div class="flex justify-between"><span class="text-zinc-400">วันที่</span><span class="font-bold">${r.date}</span></div>
                <div class="flex justify-between"><span class="text-zinc-400">เวลา</span><span class="font-bold">${r.timeIn||'-'} – ${r.timeOut||'-'}</span></div>`;
            const btn = document.getElementById('ta-confirm-btn');
            if(btn) { btn.className = `flex-1 py-3 font-black rounded-xl text-sm text-white ${isApp?'bg-green-500 hover:bg-green-400':'bg-red-500 hover:bg-red-400'}`; btn.textContent = isApp ? 'ยืนยันอนุมัติ' : 'ยืนยันไม่อนุมัติ'; }
            document.getElementById('ta-action-note').value = '';
            document.getElementById('ta-action-modal')?.classList.remove('hidden');
        };
        window.taCloseAction = () => { document.getElementById('ta-action-modal')?.classList.add('hidden'); pendingAction = null; };

        window.taConfirm = async () => {
            if (!pendingAction) return;
            const {id, action} = pendingAction;
            const note = document.getElementById('ta-action-note')?.value.trim();
            const btn = document.getElementById('ta-confirm-btn');
            btn.disabled=true; btn.textContent='กำลังบันทึก...';
            try {
                const r = allReqs.find(x=>x.id===id);
                await updateDoc(doc(db,'artifacts',APP_ID,'public','data','time_requests',id), {
                    status: action==='approve' ? 'approved' : 'rejected',
                    approvedBy: profile.name, approvedAt: new Date().toISOString(), approverNote: note||'',
                });
                // ถ้าอนุมัติ → สร้าง time_log จริงใน Firestore
                if (action==='approve' && r) {
                    const logsToCreate = [];
                    if (r.timeIn) logsToCreate.push({ type:'clock_in',  time: r.timeIn });
                    if (r.timeOut) logsToCreate.push({ type:'clock_out', time: r.timeOut });
                    for (const entry of logsToCreate) {
                        const ts = new Date(`${r.date}T${entry.time}:00`).toISOString();
                        await addDoc(collection(db,'artifacts',APP_ID,'public','data','time_logs'), {
                            uid: r.uid, type: entry.type,
                            timestamp: ts, localDate: r.date,
                            note: `[${r.reqType==='explain'?'ชี้แจง':'แก้ไข'}] อนุมัติโดย ${profile.name}`,
                            isAdjusted: true, requestId: id,
                        });
                    }
                }
                showToast(action==='approve' ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ', action==='approve'?'success':'info');
                taCloseAction();
            } catch(e) { showToast('❌ '+e.message,'error'); }
            finally { btn.disabled=false; }
        };

        return () => {
            unsub();
            ['taFilter','taOpenAction','taCloseAction','taConfirm'].forEach(k=>delete window[k]);
        };
    }
};
