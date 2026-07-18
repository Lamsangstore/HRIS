// หน้า "หนังสือรับรอง"
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ใช้ showToast / newDateTH ซึ่งเป็น global บน window

export default {
    title: 'หนังสือรับรอง',
    html: `
<div class="p-6 lg:p-8 max-w-3xl mx-auto">
  <div class="mb-8">
    <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">หนังสือรับรอง</h2>
    <p class="text-sm text-zinc-400 font-medium mt-0.5">ออกหนังสือรับรองการทำงาน / เงินเดือน แล้วพิมพ์หรือบันทึกเป็น PDF</p>
  </div>

  <div class="bg-white rounded-2xl border border-zinc-200 p-6 mb-6">
    <label class="block text-sm font-bold text-zinc-700 mb-3">เลือกประเภทหนังสือรับรอง</label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button id="cert-type-work" onclick="certSelect('work')"
        class="p-4 rounded-xl border-2 border-yellow-500 bg-yellow-50 text-left transition-all">
        <i class="fa-solid fa-briefcase text-yellow-600 mb-1 block text-lg"></i>
        <p class="text-sm font-black text-zinc-800">หนังสือรับรองการทำงาน</p>
        <p class="text-xs text-zinc-400 mt-0.5">ระบุตำแหน่ง วันที่เริ่มงาน (ไม่ระบุเงินเดือน)</p>
      </button>
      <button id="cert-type-salary" onclick="certSelect('salary')"
        class="p-4 rounded-xl border-2 border-zinc-200 text-left transition-all hover:border-yellow-400">
        <i class="fa-solid fa-money-bill-wave text-zinc-400 mb-1 block text-lg"></i>
        <p class="text-sm font-black text-zinc-800">หนังสือรับรองเงินเดือน</p>
        <p class="text-xs text-zinc-400 mt-0.5">ระบุตำแหน่ง + อัตราเงินเดือนปัจจุบัน</p>
      </button>
    </div>
    <div class="mt-4">
      <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">วัตถุประสงค์ (แสดงท้ายหนังสือ — ไม่บังคับ)</label>
      <input type="text" id="cert-purpose" placeholder="เช่น เพื่อใช้ประกอบการยื่นขอสินเชื่อ"
        class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-yellow-500 focus:outline-none">
    </div>
    <button onclick="certPrint()"
      class="mt-5 w-full bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black py-3.5 rounded-xl transition-all text-sm uppercase tracking-widest shadow-md">
      <i class="fa-solid fa-print mr-2"></i> พิมพ์ / บันทึกเป็น PDF
    </button>
    <p class="text-[10px] text-zinc-400 text-center mt-2">ในหน้าต่างพิมพ์ เลือก "Save as PDF" เพื่อบันทึกเป็นไฟล์</p>
  </div>

  <div class="bg-zinc-50 rounded-2xl border border-zinc-200 p-4">
    <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3"><i class="fa-solid fa-eye mr-1"></i> ตัวอย่าง</p>
    <div id="cert-preview" class="bg-white border border-zinc-200 rounded-xl p-6 sm:p-10 text-sm leading-7 text-zinc-800 shadow-inner"></div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        let certType = 'work';

        const COMPANY = {
            name: 'Lamsang Group',
            address: 'สำนักงานใหญ่ จังหวัดพิจิตร',
        };

        function thDateLong(ds) {
            const d = ds ? new Date(ds + 'T12:00:00+07:00') : newDateTH();
            return d.toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Bangkok' });
        }

        function buildCertHtml() {
            const isSalary = certType === 'salary';
            const purpose = document.getElementById('cert-purpose')?.value.trim();
            const salaryTxt = profile.baseSalary
                ? Number(profile.baseSalary).toLocaleString('th-TH') + ' บาท/เดือน'
                : '- (ไม่มีข้อมูลในระบบ)';
            const startTxt = profile.startDate ? thDateLong(profile.startDate) : '-';
            const title = isSalary ? 'หนังสือรับรองเงินเดือน' : 'หนังสือรับรองการทำงาน';
            return `
                <div style="text-align:center;margin-bottom:24px;">
                    <p style="font-size:1.3em;font-weight:900;letter-spacing:0.05em;">${COMPANY.name}</p>
                    <p style="font-size:0.85em;color:#71717a;">${COMPANY.address}</p>
                </div>
                <p style="text-align:center;font-size:1.15em;font-weight:800;margin-bottom:28px;text-decoration:underline;text-underline-offset:6px;">${title}</p>
                <p style="text-indent:3em;">
                    หนังสือฉบับนี้ออกให้เพื่อรับรองว่า <b>${profile.name}</b>
                    ${profile.idCard ? `เลขประจำตัวประชาชน ${profile.idCard}` : ''}
                    ${profile.employeeCode ? `รหัสพนักงาน ${profile.employeeCode}` : ''}
                    เป็นพนักงานของ ${COMPANY.name} จริง
                    โดยปฏิบัติงานในตำแหน่ง <b>${profile.position || '-'}</b>
                    สังกัด${profile.branch || 'สำนักงานใหญ่'}
                    ตั้งแต่วันที่ ${startTxt} จนถึงปัจจุบัน
                    ${isSalary ? `ได้รับอัตราเงินเดือนปัจจุบัน <b>${salaryTxt}</b>` : ''}
                </p>
                ${purpose ? `<p style="text-indent:3em;margin-top:12px;">หนังสือรับรองฉบับนี้ออกให้เพื่อ${purpose}</p>` : ''}
                <p style="text-indent:3em;margin-top:12px;">ออกให้ ณ วันที่ ${thDateLong()}</p>
                <div style="margin-top:64px;text-align:right;padding-right:32px;">
                    <p>ลงชื่อ ........................................................</p>
                    <p style="margin-top:8px;">( ........................................................ )</p>
                    <p style="margin-top:4px;">ผู้มีอำนาจลงนาม / ฝ่ายทรัพยากรบุคคล</p>
                </div>`;
        }

        function renderPreview() {
            const el = document.getElementById('cert-preview');
            if (el) el.innerHTML = buildCertHtml();
        }

        window.certSelect = (type) => {
            certType = type;
            const w = document.getElementById('cert-type-work');
            const s = document.getElementById('cert-type-salary');
            const on  = ['border-yellow-500','bg-yellow-50'];
            const off = ['border-zinc-200'];
            if (w && s) {
                if (type === 'work') {
                    w.classList.add(...on); w.classList.remove(...off);
                    s.classList.remove(...on); s.classList.add(...off);
                } else {
                    s.classList.add(...on); s.classList.remove(...off);
                    w.classList.remove(...on); w.classList.add(...off);
                }
            }
            renderPreview();
        };

        window.certPrint = () => {
            const titleTxt = certType === 'salary' ? 'หนังสือรับรองเงินเดือน' : 'หนังสือรับรองการทำงาน';
            const win = window.open('about:blank', '_blank');
            if (!win) { showToast('เบราว์เซอร์บล็อกป๊อปอัป — กรุณาอนุญาตก่อน', 'error'); return; }
            const wd = win.document;
            wd.title = titleTxt + ' - ' + (profile.name || '');
            const style = wd.createElement('style');
            style.textContent = '@page { size: A4; margin: 25mm 20mm; } body { font-family: Sarabun, TH Sarabun New, Tahoma, sans-serif; font-size: 16px; line-height: 1.9; color: #18181b; }';
            wd.head.appendChild(style);
            wd.body.innerHTML = buildCertHtml();
            setTimeout(() => { try { win.focus(); win.print(); } catch(_) {} }, 600);
        };

        document.getElementById('cert-purpose')?.addEventListener('input', renderPreview);
        renderPreview();

        return () => { ['certSelect','certPrint'].forEach(k => delete window[k]); };
    }
};
