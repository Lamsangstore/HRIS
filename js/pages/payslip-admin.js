// หน้า "จัดการ E-Pay Slip" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ตัวช่วยที่ใช้ร่วมกับหน้าอื่นต้องอยู่บน window ถึงจะเรียกได้จากที่นี่
// (tests/page-deps.test.mjs คอยตรวจให้ว่าไม่มีตัวไหนหลุด)

export default {
    title: 'จัดการ E-Pay Slip',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-black text-zinc-800 uppercase tracking-tight flex items-center gap-3">
        <span class="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center shrink-0">
          <i class="fa-solid fa-folder-open text-zinc-900"></i>
        </span>
        จัดการ E-Pay Slip
      </h2>
      <p class="text-sm text-zinc-400 font-medium mt-1 ml-[52px]">ผูก Google Drive Folder URL กับพนักงานแต่ละคน</p>
    </div>
    <button onclick="psaOpenModal(null)"
      class="inline-flex items-center gap-2 bg-zinc-900 hover:bg-yellow-500 hover:text-zinc-900 text-white font-black px-5 py-3 rounded-2xl text-sm transition-all shadow-sm shrink-0">
      <i class="fa-solid fa-link"></i> ผูก Slip Link ใหม่
    </button>
  </div>

  <!-- Drive Permission Warning -->
  <div class="mb-6 flex items-start gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4">
    <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xl mt-0.5 shrink-0"></i>
    <div>
      <p class="font-black text-amber-800 text-sm">อย่าลืมให้สิทธิ์พนักงานใน Google Drive ด้วย!</p>
      <p class="text-xs text-amber-700 mt-1 leading-relaxed">
        แชร์โฟลเดอร์ใน Google Drive ให้กับ <strong>อีเมลของพนักงาน</strong> ก่อน
        มิฉะนั้นพนักงานจะเห็น "ไม่มีสิทธิ์เข้าถึง" แม้กรอกรหัสผ่านถูกต้อง
      </p>
      <p class="text-[10px] text-amber-600 font-black mt-2 uppercase tracking-wider">
        วิธี: Google Drive → คลิกขวาโฟลเดอร์ → แชร์ → ใส่อีเมลพนักงาน → ส่ง
      </p>
    </div>
  </div>

  <!-- Search -->
  <div class="flex items-center gap-3 mb-5">
    <div class="relative flex-1 max-w-xs">
      <i class="fa-solid fa-search absolute left-3 top-3 text-zinc-400 text-sm"></i>
      <input id="psa-search" oninput="psaRender()" type="text" placeholder="ค้นหาพนักงาน..."
        class="w-full border-2 border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
    </div>
    <span id="psa-cnt" class="ml-auto text-xs text-zinc-400 font-bold bg-zinc-100 px-3 py-2 rounded-xl"></span>
  </div>

  <!-- List -->
  <div id="psa-list" class="space-y-3">
    <div class="text-center py-16 text-zinc-300">
      <i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i>
      <p class="font-bold text-sm">กำลังโหลด...</p>
    </div>
  </div>
</div>

<!-- Add/Edit Modal -->
<div id="psa-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="psaCloseModal()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
    <div class="bg-zinc-900 px-7 py-5 flex items-center justify-between">
      <div>
        <h3 id="psa-modal-title" class="font-black text-white text-lg">ผูก Slip Link ใหม่</h3>
        <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">E-Pay Slip</p>
      </div>
      <button onclick="psaCloseModal()" class="text-zinc-400 hover:text-white transition-colors">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>
    <div class="p-7 space-y-5">
      <!-- Warning inline -->
      <div class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <i class="fa-solid fa-triangle-exclamation text-amber-500 text-sm mt-0.5 shrink-0"></i>
        <p class="text-xs text-amber-700 font-medium">แชร์โฟลเดอร์ Drive ให้อีเมลพนักงานก่อนบันทึก</p>
      </div>
      <!-- Employee -->
      <div>
        <label class="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">พนักงาน *</label>
        <select id="psa-emp" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium bg-white focus:border-yellow-500 focus:outline-none">
          <option value="">-- เลือกพนักงาน --</option>
        </select>
      </div>
      <!-- Drive URL -->
      <div>
        <label class="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Google Drive Folder URL *</label>
        <input type="url" id="psa-url" placeholder="https://drive.google.com/drive/folders/..."
          class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        <p class="text-[10px] text-zinc-400 mt-1.5 flex items-center gap-1 font-medium">
          <i class="fa-brands fa-google-drive text-green-500"></i>
          URL โฟลเดอร์ที่รวมสลิปทุกงวดของพนักงานคนนี้
        </p>
      </div>
      <!-- Buttons -->
      <div class="flex gap-3 pt-1">
        <button onclick="psaCloseModal()" class="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl text-sm transition-all">ยกเลิก</button>
        <button onclick="psaSave()" id="psa-save-btn"
          class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <i class="fa-solid fa-link"></i> บันทึก
        </button>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, orderBy, getDocs }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let allSlips = [], allEmps = [], editId = null;

        // Load employees
        const empSnap = await getDocs(collection(db,'artifacts',APP_ID,'public','data','users'));
        allEmps = empSnap.docs.map(d => d.data())
                         .filter(e => e.uid && e.name)
                         .sort((a,b) => (a.name||'').localeCompare(b.name||'','th'));

        // Build employee options for modal
        const epEl = document.getElementById('psa-emp');
        if (epEl) {
            epEl.innerHTML = '<option value="">-- เลือกพนักงาน --</option>' +
                allEmps.map(e =>
                    `<option value="${e.uid}">${e.employeeCode ? e.employeeCode+' — ' : ''}${e.name}</option>`
                ).join('');
        }

        // Realtime listener
        const unsub = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','payslips'), orderBy('createdAt','desc')),
            snap => {
                allSlips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                psaRender();
            }
        );

        // ประกาศแบบ function เพื่อให้ hoist ได้ — onSnapshot อาจ callback ทันที
        // (Firestore มี cache ในเครื่อง) ถ้าใช้ const/arrow จะ ReferenceError
        // แล้วรายการไม่ render ทั้งที่ตัวเลขสถิติขึ้นแล้ว
        function psaRender() {
            const el = document.getElementById('psa-list'); if (!el) return;
            const q = (document.getElementById('psa-search')?.value || '').toLowerCase();
            let list = allSlips;
            if (q) list = list.filter(s => {
                const emp = allEmps.find(e => e.uid === s.uid);
                const name = (s.employeeName || emp?.name || '').toLowerCase();
                const code = (s.employeeCode || emp?.employeeCode || '').toLowerCase();
                return name.includes(q) || code.includes(q);
            });
            const cnt = document.getElementById('psa-cnt');
            if (cnt) cnt.textContent = list.length + ' รายการ';
            if (!list.length) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300">
                    <i class="fa-solid fa-folder-open text-4xl mb-3"></i>
                    <p class="font-bold text-sm">${allSlips.length ? 'ไม่พบรายการ' : 'ยังไม่มี Slip Link'}</p></div>`; return;
            }
            el.innerHTML = list.map(s => {
                const emp = allEmps.find(e => e.uid === s.uid);
                const name = s.employeeName || emp?.name || s.uid;
                const code = s.employeeCode || emp?.employeeCode || '';
                const av   = emp?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f4f4f5&color=27272a&bold=true`;
                return `<div class="bg-white rounded-2xl border border-zinc-100 hover:border-yellow-200 p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all group">
                  <img src="${av}" onerror="handleImgError(this)" class="w-12 h-12 rounded-2xl object-cover border border-zinc-200 shrink-0">
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-0.5">
                      <span class="font-black text-zinc-800 text-sm">${name}</span>
                      ${code ? `<span class="text-[10px] font-bold px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">${code}</span>` : ''}
                    </div>
                    <p class="text-xs text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                      <i class="fa-brands fa-google-drive text-green-500 shrink-0"></i>
                      <a href="${s.driveUrl}" target="_blank" class="hover:underline hover:text-zinc-600 truncate">${s.driveUrl}</a>
                    </p>
                  </div>
                  <div class="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all psa-actions" data-id="${s.id}" data-name="${name.replace(/"/g,'')}">
                    <button class="psa-edit-btn px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black rounded-xl text-xs transition-all">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="psa-del-btn px-4 py-2 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 hover:border-red-500 font-black rounded-xl text-xs transition-all">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>`;
            }).join('');
            el.querySelectorAll('.psa-actions').forEach(div => {
                div.querySelector('.psa-edit-btn').addEventListener('click', () => psaOpenModal(div.dataset.id));
                div.querySelector('.psa-del-btn').addEventListener('click',  () => psaDelete(div.dataset.id, div.dataset.name));
            });
        }
        window.psaRender = psaRender;

        window.psaOpenModal = id => {
            editId = id;
            document.getElementById('psa-modal-title').textContent = id ? 'แก้ไข Slip Link' : 'ผูก Slip Link ใหม่';
            if (id) {
                const s = allSlips.find(x => x.id === id);
                if (s) {
                    document.getElementById('psa-emp').value = s.uid || '';
                    document.getElementById('psa-url').value = s.driveUrl || '';
                }
            } else {
                document.getElementById('psa-emp').value = '';
                document.getElementById('psa-url').value = '';
            }
            document.getElementById('psa-modal')?.classList.remove('hidden');
            setTimeout(() => document.getElementById(editId ? 'psa-url' : 'psa-emp')?.focus(), 120);
        };

        window.psaCloseModal = () => {
            document.getElementById('psa-modal')?.classList.add('hidden');
            editId = null;
        };

        window.psaSave = async () => {
            const uid = document.getElementById('psa-emp')?.value;
            const url = document.getElementById('psa-url')?.value.trim();
            if (!uid) { showToast('กรุณาเลือกพนักงาน', 'error'); return; }
            if (!url) { showToast('กรุณากรอก Google Drive URL', 'error'); return; }
            // Check duplicate (ไม่ให้ผูก uid เดิมซ้ำ ยกเว้นกรณี edit)
            const dup = allSlips.find(s => s.uid === uid && s.id !== editId);
            if (dup) { showToast('พนักงานคนนี้มี Slip Link อยู่แล้ว กรุณาแก้ไขรายการเดิม', 'error'); return; }
            const emp = allEmps.find(e => e.uid === uid);
            const btn = document.getElementById('psa-save-btn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                const data = {
                    uid,
                    driveUrl: url,
                    employeeName: emp?.name || '',
                    employeeCode: emp?.employeeCode || '',
                    updatedAt: new Date().toISOString(),
                };
                if (editId) {
                    await updateDoc(doc(db,'artifacts',APP_ID,'public','data','payslips',editId), data);
                    showToast('✅ อัปเดต Slip Link แล้ว', 'success');
                } else {
                    data.createdAt = new Date().toISOString();
                    data.createdBy = profile.name;
                    await addDoc(collection(db,'artifacts',APP_ID,'public','data','payslips'), data);
                    showToast('✅ ผูก Slip Link แล้ว', 'success');
                }
                psaCloseModal();
            } catch(e) { showToast('❌ ' + e.message, 'error'); }
            finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-link"></i> บันทึก'; }
        };

        window.psaDelete = async (id, name) => {
            if (!confirm(`ลบ Slip Link ของ "${name}" ?`)) return;
            try {
                await deleteDoc(doc(db,'artifacts',APP_ID,'public','data','payslips',id));
                showToast('ลบแล้ว', 'info');
            } catch(e) { showToast('❌ ' + e.message, 'error'); }
        };

        return () => {
            unsub();
            ['psaRender','psaOpenModal','psaCloseModal','psaSave','psaDelete'].forEach(k => delete window[k]);
        };
    }
};
