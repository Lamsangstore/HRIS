// หน้า "นำเข้าเวลางาน" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / navigateTo / todayTH ซึ่งยังเป็น global บน window เรียกได้ตรงๆ

export default {
    title: 'นำเข้าเวลางาน',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="mb-8">
    <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">นำเข้าเวลางาน</h2>
    <p class="text-sm text-zinc-400 font-medium mt-0.5">Import ข้อมูลเวลาเข้า-ออกงานจากระบบเก่าหรือเครื่องสแกนลายนิ้วมือ</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- กรอกทีละรายการ -->
    <div class="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 class="font-black text-zinc-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-widest">
        <i class="fa-solid fa-keyboard text-yellow-500"></i> กรอกทีละรายการ
      </h3>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">พนักงาน</label>
          <select id="ti-emp" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
            <option value="">-- เลือกพนักงาน --</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">วันที่</label>
          <input type="date" id="ti-date" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">เวลาเข้างาน</label>
            <input type="time" id="ti-in" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">เวลาออกงาน</label>
            <input type="time" id="ti-out" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">หมายเหตุ</label>
          <input type="text" id="ti-note" placeholder="เช่น นำเข้าจากระบบเก่า" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
        </div>
        <button onclick="tiSaveOne()" id="ti-save-btn"
          class="w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-3 rounded-xl transition-all text-sm uppercase tracking-widest shadow-md">
          <i class="fa-solid fa-plus mr-2"></i> เพิ่มรายการ
        </button>
      </div>
    </div>

    <!-- Import CSV -->
    <div class="bg-white rounded-2xl border border-zinc-200 p-6">
      <h3 class="font-black text-zinc-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-widest">
        <i class="fa-solid fa-file-csv text-yellow-500"></i> Import จาก CSV
      </h3>
      <div class="mb-4 bg-zinc-50 rounded-xl p-4 border border-zinc-200">
        <p class="text-xs font-black text-zinc-600 mb-2 uppercase tracking-widest">รูปแบบ CSV ที่รองรับ:</p>
        <code class="text-[11px] text-zinc-500 leading-relaxed">employee_code, date, time_in, time_out, note<br>EMP001, 2025-03-01, 08:05, 17:30, import<br>EMP002, 2025-03-01, 08:10, 17:45,</code>
        <button onclick="tiDownloadTemplate()" class="mt-3 text-xs font-bold text-yellow-600 hover:text-yellow-700 flex items-center gap-1">
          <i class="fa-solid fa-download"></i> ดาวน์โหลด Template
        </button>
      </div>
      <label class="block w-full cursor-pointer border-2 border-dashed border-zinc-300 hover:border-yellow-400 rounded-xl p-8 text-center transition-all">
        <i class="fa-solid fa-file-arrow-up text-3xl text-zinc-400 mb-3 block"></i>
        <p class="font-bold text-zinc-600 text-sm">คลิกหรือลากไฟล์ CSV มาวาง</p>
        <p class="text-xs text-zinc-400 mt-1">รองรับไฟล์ .csv เท่านั้น</p>
        <input type="file" accept=".csv" class="hidden" onchange="tiParseCSV(this)">
      </label>
      <div id="ti-csv-preview" class="mt-4 hidden">
        <p class="text-xs font-black text-zinc-500 mb-2 uppercase tracking-widest" id="ti-csv-count">-</p>
        <div class="max-h-48 overflow-y-auto rounded-xl border border-zinc-200">
          <table class="w-full text-xs">
            <thead><tr class="bg-zinc-50 border-b">
              <th class="px-3 py-2 text-left font-black text-zinc-500">รหัส</th>
              <th class="px-3 py-2 text-left font-black text-zinc-500">วันที่</th>
              <th class="px-3 py-2 text-left font-black text-zinc-500">เข้า</th>
              <th class="px-3 py-2 text-left font-black text-zinc-500">ออก</th>
              <th class="px-3 py-2 text-left font-black text-zinc-500">สถานะ</th>
            </tr></thead>
            <tbody id="ti-csv-rows"></tbody>
          </table>
        </div>
        <button onclick="tiImportCSV()" id="ti-import-btn"
          class="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-3 rounded-xl text-sm uppercase tracking-widest shadow-md">
          <i class="fa-solid fa-bolt mr-2"></i> นำเข้า <span id="ti-import-count">0</span> รายการ
        </button>
      </div>
    </div>
  </div>

  <!-- Recent imports -->
  <div class="mt-6 bg-white rounded-2xl border border-zinc-200 overflow-hidden">
    <div class="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
      <h3 class="font-black text-zinc-800 text-sm uppercase tracking-widest">
        <i class="fa-solid fa-history text-yellow-500 mr-2"></i> รายการที่นำเข้าล่าสุด
      </h3>
      <span id="ti-log-count" class="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">-</span>
    </div>
    <div id="ti-log-list" class="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
      <div class="p-6 text-center text-zinc-400 text-sm">กำลังโหลด...</div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, addDoc, getDocs, onSnapshot, query, orderBy, where, limit }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        let employees = [], csvData = [];

        // โหลดรายชื่อพนักงาน
        const empSnap = await getDocs(collection(db,'artifacts',APP_ID,'public','data','users'));
        employees = empSnap.docs.map(d=>d.data()).filter(e=>e.uid);
        const sel = document.getElementById('ti-emp');
        if (sel) {
            employees.sort((a,b)=>a.name.localeCompare(b.name,'th')).forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.uid;
                opt.textContent = `${e.name} (${e.employeeCode||''})`;
                sel.appendChild(opt);
            });
        }

        // ตั้งวันที่เริ่มต้นเป็นวันนี้
        const ti = document.getElementById('ti-date');
        if (ti) ti.value = todayTH();

        // Recent imports listener
        const unsub = onSnapshot(
            query(collection(db,'artifacts',APP_ID,'public','data','time_logs'),
                  where('isImported','==',true), orderBy('importedAt','desc'), limit(50)),
            snap => {
                const logs = snap.docs.map(d=>({id:d.id,...d.data()}));
                const cnt = document.getElementById('ti-log-count');
                if (cnt) cnt.textContent = logs.length + ' รายการ';
                const el = document.getElementById('ti-log-list');
                if (!el) return;
                if (!logs.length) { el.innerHTML='<div class="p-6 text-center text-zinc-400 text-sm">ยังไม่มีรายการ</div>'; return; }
                el.innerHTML = logs.map(l => {
                    const emp = employees.find(e=>e.uid===l.uid);
                    return `<div class="flex items-center gap-4 px-5 py-3">
                      <div class="w-8 h-8 rounded-lg ${l.type==='clock_in'?'bg-green-100':'bg-red-100'} flex items-center justify-center shrink-0">
                        <i class="fa-solid ${l.type==='clock_in'?'fa-right-to-bracket text-green-600':'fa-right-from-bracket text-red-500'} text-xs"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-bold text-zinc-800 text-xs truncate">${emp?.name||l.uid}</p>
                        <p class="text-[10px] text-zinc-400">${l.localDate} · ${l.timestamp ? new Date(l.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}) : ''} · ${l.note||''}</p>
                      </div>
                      <span class="text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">${l.importedBy||'Admin'}</span>
                    </div>`;
                }).join('');
            }
        );

        window.tiSaveOne = async () => {
            const uid  = document.getElementById('ti-emp')?.value;
            const date = document.getElementById('ti-date')?.value;
            const tin  = document.getElementById('ti-in')?.value;
            const tout = document.getElementById('ti-out')?.value;
            const note = document.getElementById('ti-note')?.value || 'นำเข้าโดย Admin';
            if (!uid || !date) { showToast('กรุณาเลือกพนักงานและวันที่', 'error'); return; }
            if (!tin && !tout) { showToast('กรุณาใส่เวลาอย่างน้อย 1 รายการ', 'error'); return; }
            const btn = document.getElementById('ti-save-btn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>';
            try {
                const toImport = [];
                if (tin)  toImport.push({ type:'clock_in',  time: tin });
                if (tout) toImport.push({ type:'clock_out', time: tout });
                for (const e of toImport) {
                    const ts = new Date(`${date}T${e.time}:00`).toISOString();
                    await addDoc(collection(db,'artifacts',APP_ID,'public','data','time_logs'), {
                        uid, type: e.type, timestamp: ts, localDate: date,
                        note, isImported: true, importedBy: profile.name,
                        importedAt: new Date().toISOString(),
                    });
                }
                showToast(`✅ นำเข้า ${toImport.length} รายการสำเร็จ`, 'success');
                document.getElementById('ti-in').value = '';
                document.getElementById('ti-out').value = '';
                document.getElementById('ti-note').value = '';
            } catch(e) { showToast('❌ '+e.message,'error'); }
            finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-plus mr-2"></i> เพิ่มรายการ'; }
        };

        window.tiParseCSV = (input) => {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                // แก้: ใช้ /\r?\n/ แทน '\n' เพื่อรองรับ Windows CSV ที่ใช้ \r\n
                const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
                csvData = [];
                const rows = [];
                lines.slice(1).forEach((line) => {
                    // แก้: trim แต่ละ field เพื่อกำจัด \r ที่อาจติดมาจาก Windows
                    const parts = line.split(',').map(s => s.trim().replace(/"/g,''));
                    const [code, date, timeIn, timeOut, note] = parts;
                    if (!code || !date) return;
                    const emp = employees.find(e => e.employeeCode === code || e.uid === code);
                    const status = emp ? '✅ พบ' : '❌ ไม่พบ';
                    csvData.push({
                        uid: emp?.uid, code, date,
                        timeIn:  timeIn  || '',
                        timeOut: timeOut || '',
                        note: note || 'Import CSV',
                        found: !!emp
                    });
                    rows.push(`<tr class="border-b border-zinc-100 ${!emp?'bg-red-50':''}">
                      <td class="px-3 py-2 font-bold">${code}</td>
                      <td class="px-3 py-2">${date}</td>
                      <td class="px-3 py-2">${timeIn||'-'}</td>
                      <td class="px-3 py-2">${timeOut||'-'}</td>
                      <td class="px-3 py-2">${status}</td>
                    </tr>`);
                });
                document.getElementById('ti-csv-rows').innerHTML = rows.join('');
                document.getElementById('ti-csv-count').textContent =
                    `พบ ${csvData.length} แถว (พนักงานที่รู้จัก ${csvData.filter(r=>r.found).length} คน)`;
                document.getElementById('ti-import-count').textContent = csvData.filter(r=>r.found).length;
                document.getElementById('ti-csv-preview').classList.remove('hidden');
            };
            reader.readAsText(file, 'UTF-8');
        };

        window.tiImportCSV = async () => {
            const valid = csvData.filter(r => r.found);
            if (!valid.length) { showToast('ไม่มีรายการที่นำเข้าได้', 'error'); return; }
            const btn = document.getElementById('ti-import-btn');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังนำเข้า...';
            try {
                let count = 0;
                for (const row of valid) {
                    const toAdd = [];
                    if (row.timeIn)  toAdd.push({ type:'clock_in',  time: row.timeIn });
                    if (row.timeOut) toAdd.push({ type:'clock_out', time: row.timeOut });
                    for (const e of toAdd) {
                        const ts = new Date(`${row.date}T${e.time}:00`).toISOString();
                        await addDoc(collection(db,'artifacts',APP_ID,'public','data','time_logs'), {
                            uid: row.uid, type: e.type, timestamp: ts, localDate: row.date,
                            note: row.note, isImported: true, importedBy: profile.name,
                            importedAt: new Date().toISOString(),
                        });
                        count++;
                    }
                }
                showToast(`✅ นำเข้า ${count} รายการสำเร็จ`, 'success');
                document.getElementById('ti-csv-preview').classList.add('hidden');
                csvData = [];
            } catch(e) { showToast('❌ '+e.message,'error'); }
            finally { btn.disabled=false; btn.innerHTML='<i class="fa-solid fa-bolt mr-2"></i> นำเข้า'; }
        };

        window.tiDownloadTemplate = () => {
            const csv = 'employee_code,date,time_in,time_out,note\nEMP001,2025-03-01,08:05,17:30,import\nEMP002,2025-03-01,08:10,17:45,\n';
            const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
            const a = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(blob),
                download: 'time_import_template.csv'
            });
            a.click();
        };

        return () => {
            unsub();
            ['tiSaveOne','tiParseCSV','tiImportCSV','tiDownloadTemplate'].forEach(k => delete window[k]);
        };
    }
};
