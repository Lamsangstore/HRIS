// หน้า "พิกัดสาขา & GPS" (admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / navigateTo ซึ่งยังเป็น global บน window เรียกได้ตรงๆ

export default {
    title: 'พิกัดสาขา & GPS',
    html: `
<div class="p-6 lg:p-8 max-w-4xl mx-auto">
  <div class="mb-8">
    <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">พิกัดสาขา & GPS</h2>
    <p class="text-sm text-zinc-400 font-medium mt-0.5">กำหนดตำแหน่งและรัศมีที่อนุญาตให้ลงเวลาของแต่ละสาขา</p>
  </div>
  <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-xs text-amber-800 font-medium">
    <i class="fa-solid fa-circle-info mr-1"></i>
    สาขาที่ไม่ได้ตั้งพิกัด จะใช้พิกัดสำนักงานใหญ่เริ่มต้น (16.41328, 100.16661 · รัศมี 100 ม.)
    — หาพิกัดได้จาก Google Maps: คลิกขวาบนแผนที่ → คัดลอกตัวเลขพิกัด
  </div>
  <div id="bl-list" class="space-y-4">
    <div class="text-center py-12 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin') { navigateTo('home'); return; }
        const { collection, doc, getDocs, setDoc, deleteDoc }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        // รวมชื่อสาขาจาก users + ที่เคยตั้งค่าไว้
        const empSnap = await getDocs(collection(db,'artifacts',APP_ID,'public','data','users'));
        const branches = [...new Set(empSnap.docs.map(d=>d.data().branch).filter(Boolean))].sort();
        const locMap = await loadBranchLocations(true);
        Object.keys(locMap).forEach(b => { if (!branches.includes(b)) branches.push(b); });

        function render() {
            const el = document.getElementById('bl-list');
            if (!el) return;
            if (!branches.length) {
                el.innerHTML = '<div class="text-center py-12 text-zinc-300 font-bold text-sm">ยังไม่มีสาขาในระบบ</div>';
                return;
            }
            el.innerHTML = branches.map((b, i) => {
                const loc = locMap[b] || {};
                const hasLoc = loc.lat != null && loc.lng != null;
                return `<div class="bg-white rounded-2xl border border-zinc-200 p-5">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl ${hasLoc?'bg-green-100 text-green-600':'bg-zinc-100 text-zinc-400'} flex items-center justify-center">
                        <i class="fa-solid fa-building"></i>
                      </div>
                      <div>
                        <p class="font-black text-zinc-800">${b}</p>
                        <p class="text-[10px] font-bold ${hasLoc?'text-green-600':'text-zinc-400'} uppercase">
                          ${hasLoc ? '✓ ตั้งพิกัดแล้ว' : 'ใช้พิกัดเริ่มต้น (สำนักงานใหญ่)'}
                        </p>
                      </div>
                    </div>
                    ${hasLoc ? `<a href="https://www.google.com/maps?q=${loc.lat},${loc.lng}" target="_blank" class="text-xs font-bold text-yellow-600 hover:text-yellow-700"><i class="fa-solid fa-map-location-dot mr-1"></i>ดูแผนที่</a>` : ''}
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div class="sm:col-span-2">
                      <label class="block text-[10px] font-black text-zinc-500 uppercase mb-1">พิกัด (lat, lng) — วางจาก Google Maps ได้เลย</label>
                      <input type="text" id="bl-coord-${i}" value="${hasLoc ? loc.lat+', '+loc.lng : ''}" placeholder="16.4132778, 100.1666111"
                        class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-mono focus:border-yellow-500 focus:outline-none">
                    </div>
                    <div>
                      <label class="block text-[10px] font-black text-zinc-500 uppercase mb-1">รัศมี (เมตร)</label>
                      <input type="number" id="bl-radius-${i}" value="${loc.radius || 100}" min="20" step="10"
                        class="w-full border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-mono focus:border-yellow-500 focus:outline-none">
                    </div>
                    <div class="flex items-end gap-2">
                      <button onclick="blSave(${i})" class="flex-1 bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-2 rounded-xl text-xs uppercase">บันทึก</button>
                      ${hasLoc ? `<button onclick="blClear(${i})" title="ลบพิกัด" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                  </div>
                  <button onclick="blUseHere(${i})" class="mt-2 text-[10px] font-bold text-zinc-400 hover:text-yellow-600">
                    <i class="fa-solid fa-location-crosshairs mr-1"></i> ใช้ตำแหน่งปัจจุบันของฉัน
                  </button>
                </div>`;
            }).join('');
        }

        window.blSave = async (i) => {
            const b = branches[i];
            const raw = document.getElementById('bl-coord-'+i)?.value.trim();
            const radius = parseInt(document.getElementById('bl-radius-'+i)?.value) || 100;
            const m = raw ? raw.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/) : null;
            if (!m) { showToast('รูปแบบพิกัดไม่ถูกต้อง — ใส่เป็น lat, lng เช่น 16.41328, 100.16661', 'error'); return; }
            const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { showToast('ค่าพิกัดอยู่นอกช่วงที่ถูกต้อง', 'error'); return; }
            try {
                await setDoc(doc(db,'artifacts',APP_ID,'public','data','branch_locations', b), { lat, lng, radius, updatedAt: new Date().toISOString(), updatedBy: profile.name });
                locMap[b] = { lat, lng, radius };
                _branchLocCache = locMap;
                showToast('✅ บันทึกพิกัด '+b+' แล้ว', 'success');
                render();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        window.blClear = async (i) => {
            const b = branches[i];
            if (!confirm('ลบพิกัดของ "'+b+'" และกลับไปใช้ค่าเริ่มต้น?')) return;
            try {
                await deleteDoc(doc(db,'artifacts',APP_ID,'public','data','branch_locations', b));
                delete locMap[b];
                _branchLocCache = locMap;
                showToast('ลบพิกัดแล้ว', 'info');
                render();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        window.blUseHere = (i) => {
            if (!navigator.geolocation) { showToast('เบราว์เซอร์ไม่รองรับ GPS', 'error'); return; }
            showToast('กำลังขอตำแหน่ง...', 'info');
            navigator.geolocation.getCurrentPosition(
                pos => {
                    const el = document.getElementById('bl-coord-'+i);
                    if (el) el.value = pos.coords.latitude.toFixed(7) + ', ' + pos.coords.longitude.toFixed(7);
                    showToast('ใส่พิกัดปัจจุบันแล้ว — กดบันทึกเพื่อยืนยัน', 'success');
                },
                err => showToast('ขอตำแหน่งไม่สำเร็จ: '+err.message, 'error'),
                { enableHighAccuracy: true, timeout: 15000 }
            );
        };

        render();

        return () => { ['blSave','blClear','blUseHere'].forEach(k => delete window[k]); };
    }
};
