// หน้า "สลิปเงินเดือนของฉัน"
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / handleImgError ซึ่งเป็น global บน window

export default {
    title: 'E-Pay Slip',
    html: `
<div class="p-6 lg:p-8 max-w-2xl mx-auto">
  <div class="mb-8">
    <h2 class="text-2xl font-black text-zinc-800 uppercase tracking-tight flex items-center gap-3">
      <span class="w-10 h-10 bg-yellow-500 rounded-2xl flex items-center justify-center shrink-0">
        <i class="fa-solid fa-file-invoice text-zinc-900"></i>
      </span>
      E-Pay Slip
    </h2>
    <p class="text-sm text-zinc-400 font-medium mt-1 ml-[52px]">สลิปเงินเดือนของคุณ</p>
  </div>
  <div id="ps-content">
    <div class="text-center py-20 text-zinc-300">
      <i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i>
      <p class="font-bold text-sm">กำลังโหลด...</p>
    </div>
  </div>
</div>

<!-- Password Modal -->
<div id="ps-pw-modal" class="fixed inset-0 z-[300] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
    <div class="bg-zinc-900 px-7 py-5">
      <h3 class="font-black text-white text-lg flex items-center gap-2">
        <i class="fa-solid fa-lock text-yellow-400"></i> ยืนยันตัวตน
      </h3>
      <p class="text-zinc-400 text-xs mt-1">กรอกรหัสผ่านบัญชีเพื่อเปิดสลิป</p>
    </div>
    <div class="p-7 space-y-4">
      <div class="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
        <i class="fa-brands fa-google-drive text-green-500 text-xl shrink-0"></i>
        <div>
          <p class="font-black text-zinc-800 text-sm">โฟลเดอร์สลิปของคุณ</p>
          <p class="text-[10px] text-zinc-400 mt-0.5">ระบบจะเปิด Google Drive หลังยืนยัน</p>
        </div>
      </div>
      <div>
        <label class="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">รหัสผ่าน</label>
        <input type="password" id="ps-pw-input" placeholder="กรอกรหัสผ่านของคุณ"
          class="w-full border-2 border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-yellow-500 focus:outline-none">
      </div>
      <p id="ps-pw-error" class="hidden text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
        <i class="fa-solid fa-circle-exclamation mr-1"></i>รหัสผ่านไม่ถูกต้อง
      </p>
      <div class="flex gap-3 pt-1">
        <button onclick="psClosePw()" class="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl text-sm transition-all">ยกเลิก</button>
        <button onclick="psConfirmPw()" id="ps-pw-btn"
          class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2">
          <i class="fa-solid fa-unlock"></i> เปิดสลิป
        </button>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        const { collection, query, where, getDocs }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const { getAuth, signInWithEmailAndPassword }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");

        let pendingUrl = null;

        // Enter key handler
        function pwKeyHandler(e) {
            if (e.key === 'Enter' && !document.getElementById('ps-pw-modal')?.classList.contains('hidden')) {
                psConfirmPw();
            }
        }
        document.addEventListener('keydown', pwKeyHandler);

        // ดึง slip record ของ user นี้ (1 record = 1 folder)
        const el = document.getElementById('ps-content');
        try {
            const snap = await getDocs(
                query(collection(db,'artifacts',APP_ID,'public','data','payslips'),
                      where('uid','==',user.uid))
            );

            if (snap.empty) {
                el.innerHTML = `
                <div class="text-center py-24 text-zinc-300">
                  <div class="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-file-circle-xmark text-4xl"></i>
                  </div>
                  <p class="font-black text-zinc-400 text-base">ยังไม่มีสลิปเงินเดือน</p>
                  <p class="text-sm text-zinc-300 mt-1">ทีม HR จะเพิ่มลิงก์โฟลเดอร์ให้คุณในภายหลัง</p>
                </div>`;
                return;
            }

            const s = snap.docs[0].data();
            const av = profile.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=27272a&color=eab308&size=128`;

            el.innerHTML = `
            <div class="bg-white rounded-3xl border-2 border-zinc-100 p-8 flex flex-col items-center text-center gap-5">
              <img src="${av}" onerror="handleImgError(this)" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg">
              <div>
                <p class="font-black text-zinc-800 text-xl">${profile.name}</p>
                <p class="text-sm text-zinc-400 font-medium mt-0.5">${profile.position || profile.role} · ${profile.branch || ''}</p>
              </div>

              <div class="w-full bg-zinc-50 rounded-2xl border border-zinc-200 p-5 flex items-center gap-4">
                <div class="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                  <i class="fa-brands fa-google-drive text-green-500 text-2xl"></i>
                </div>
                <div class="text-left flex-1 min-w-0">
                  <p class="font-black text-zinc-800">โฟลเดอร์สลิปของฉัน</p>
                  <p class="text-xs text-zinc-400 truncate mt-0.5">${s.driveUrl}</p>
                </div>
              </div>

              <div class="w-full bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 text-left">
                <p class="text-xs text-amber-800 font-black flex items-center gap-2">
                  <i class="fa-solid fa-shield-halved text-amber-500"></i>
                  ต้องยืนยันรหัสผ่านก่อนเปิด
                </p>
                <p class="text-[10px] text-amber-600 mt-1">เพื่อความปลอดภัย ระบบจะตรวจสอบตัวตนทุกครั้งที่เปิดสลิป</p>
              </div>

              <button onclick="psOpenPw('${encodeURIComponent(s.driveUrl)}')"
                class="w-full bg-zinc-900 hover:bg-yellow-500 hover:text-zinc-900 text-white font-black py-4 rounded-2xl text-sm transition-all shadow-lg uppercase tracking-widest flex items-center justify-center gap-2">
                <i class="fa-solid fa-lock"></i> ยืนยันรหัสผ่านเพื่อเปิดสลิป
              </button>
            </div>`;

        } catch(e) {
            el.innerHTML = `<div class="text-center py-16 text-zinc-400">
                <i class="fa-solid fa-triangle-exclamation text-3xl mb-3 text-yellow-500"></i>
                <p class="font-bold text-sm">เกิดข้อผิดพลาด: ${e.message}</p>
            </div>`;
        }

        window.psOpenPw = (encodedUrl) => {
            pendingUrl = decodeURIComponent(encodedUrl);
            const inp = document.getElementById('ps-pw-input');
            if (inp) inp.value = '';
            document.getElementById('ps-pw-error')?.classList.add('hidden');
            document.getElementById('ps-pw-modal')?.classList.remove('hidden');
            setTimeout(() => inp?.focus(), 120);
        };

        window.psClosePw = () => {
            document.getElementById('ps-pw-modal')?.classList.add('hidden');
            pendingUrl = null;
        };

        window.psConfirmPw = async () => {
            const pw  = document.getElementById('ps-pw-input')?.value || '';
            if (!pw) return;
            const btn = document.getElementById('ps-pw-btn');
            const err = document.getElementById('ps-pw-error');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            err.classList.add('hidden');
            try {
                await signInWithEmailAndPassword(getAuth(), user.email, pw);
                if (pendingUrl) { if (window.safeOpen) window.safeOpen(pendingUrl); else window.open(pendingUrl, '_blank'); }
                psClosePw();
                showToast('✅ ยืนยันตัวตนสำเร็จ', 'success');
            } catch {
                err.classList.remove('hidden');
                document.getElementById('ps-pw-input')?.select();
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-unlock"></i> เปิดสลิป';
            }
        };

        return () => {
            document.removeEventListener('keydown', pwKeyHandler);
            ['psOpenPw','psClosePw','psConfirmPw'].forEach(k => delete window[k]);
        };
    }
};
