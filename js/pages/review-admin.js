// หน้า "ประเมินผลงาน (หัวหน้า/admin)"
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// ตัวช่วยที่ใช้ร่วมกับหน้าอื่นต้องอยู่บน window ถึงจะเรียกได้จากที่นี่
// (tests/page-deps.test.mjs คอยตรวจให้ว่าไม่มีตัวไหนหลุด)

import { REVIEW_DIMENSIONS, REVIEW_DEFAULT_CRITERIA } from '../lib/review-dimensions.js?v=20260717a';

export default {
    title: 'ประเมินผลงาน',
    html: `
<div class="p-6 lg:p-8 max-w-5xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ประเมินผลงาน</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">สร้างรอบประเมินและให้คะแนนพนักงาน</p>
    </div>
    <div class="flex gap-2">
      <select id="rv-cycle" onchange="rvLoadCycle()" class="border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
        <option value="">— เลือกรอบประเมิน —</option>
      </select>
      <button onclick="rvNewCycle()" class="bg-zinc-900 hover:bg-zinc-800 text-yellow-400 font-black px-4 py-2 rounded-xl text-xs uppercase">
        <i class="fa-solid fa-plus mr-1"></i> รอบใหม่
      </button>
    </div>
  </div>
  <div id="rv-emp-list" class="space-y-3">
    <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-ranking-star text-5xl mb-3"></i><p class="font-bold text-sm">เลือกหรือสร้างรอบประเมินเพื่อเริ่มต้น</p></div>
  </div>
</div>

<!-- Score modal -->
<div id="rv-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="rvCloseModal()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
    <div class="bg-zinc-900 px-5 sm:px-7 py-4 sm:py-5">
      <h3 class="font-black text-white text-base sm:text-lg" id="rv-modal-title">ประเมิน</h3>
      <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5" id="rv-modal-sub">-</p>
    </div>
    <div class="p-4 sm:p-7 space-y-4 max-h-[75vh] overflow-y-auto">
      <div id="rv-criteria"></div>
      <div>
        <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">ความเห็นเพิ่มเติม</label>
        <textarea id="rv-comment" rows="3" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:border-yellow-500 focus:outline-none resize-none" placeholder="จุดเด่น สิ่งที่ควรพัฒนา..."></textarea>
      </div>
      <div class="flex gap-3">
        <button onclick="rvCloseModal()" class="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl text-sm">ยกเลิก</button>
        <button id="rv-save-btn" onclick="rvSave()" class="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black rounded-xl text-sm">บันทึกผลประเมิน</button>
      </div>
    </div>
  </div>
</div>

<!-- Detail (read-only) modal -->
<div id="rv-detail-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="rvCloseDetail()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
    <div class="bg-zinc-900 px-5 sm:px-7 py-4 sm:py-5 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="font-black text-white text-base sm:text-lg" id="rv-detail-title">รายละเอียดผลประเมิน</h3>
        <p class="text-yellow-500 text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate" id="rv-detail-sub">-</p>
      </div>
      <button onclick="rvCloseDetail()" class="text-zinc-400 hover:text-white shrink-0"><i class="fa-solid fa-xmark text-xl"></i></button>
    </div>
    <div class="p-4 sm:p-6 max-h-[75vh] overflow-y-auto" id="rv-detail-body"></div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') { navigateTo('home'); return; }
        const { collection, doc, getDocs, addDoc, setDoc, query, orderBy }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        let cycles = [], currentCycle = null, reviews = {}, selfReviews = {}, scoringUid = null, tempScores = {}, isManagerialOverride = null;

        const isAdmin = profile.role === 'admin';
        const empSnap = await getDocs(col('users'));
        const allEmployees = empSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
            .filter(e => e.name && e.status !== 'resigned')
            .sort((a,b) => a.name.localeCompare(b.name,'th'));

        // manager เห็น:
        //   - ลูกทีมตัวเอง (managerUid === ตน)
        //   - พนักงานที่ยังไม่มีหัวหน้ากำหนดไว้ (managerUid ว่าง) — หลายหัวหน้าประเมินได้
        //   - ตัวเอง (จะถูกซ่อนตอน render เพราะใช้หน้า "ประเมินตัวเอง" แทน)
        // admin เห็นทุกคน
        function canReview(e) {
            if (isAdmin) return true;
            return e.managerUid === user.uid || !e.managerUid;
        }
        const employees = isAdmin
            ? allEmployees
            : allEmployees.filter(e => canReview(e) || e.uid === user.uid);

        // แสดงข้อความถ้า manager ไม่มีพนักงานที่ประเมินได้เลย
        const noTeamWarn = (!isAdmin && employees.filter(e => e.uid !== user.uid).length === 0)
            ? `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-800 font-medium">
                <i class="fa-solid fa-circle-info mr-1"></i>
                ตอนนี้ไม่มีพนักงานที่คุณประเมินได้ — พนักงานที่ Admin ตั้ง "หัวหน้าโดยตรง" เป็นชื่อคุณ จะมาขึ้นที่นี่ พนักงานที่ไม่ได้กำหนดหัวหน้า หัวหน้าทุกคนประเมินได้
            </div>` : '';

        async function loadCycles() {
            const snap = await getDocs(query(col('review_cycles'), orderBy('createdAt','desc')));
            cycles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sel = document.getElementById('rv-cycle');
            if (sel) {
                sel.innerHTML = '<option value="">— เลือกรอบประเมิน —</option>';
                cycles.forEach(c => {
                    const o = document.createElement('option');
                    o.value = c.id; o.textContent = c.name;
                    sel.appendChild(o);
                });
                if (cycles.length) { sel.value = cycles[0].id; }
            }
        }
        await loadCycles();

        window.rvNewCycle = async () => {
            const now = newDateTH();
            const defaultName = `ประเมินผลงาน ${now.getMonth() < 6 ? 'ครึ่งปีแรก' : 'ครึ่งปีหลัง'} ${now.getFullYear()+543}`;
            const name = prompt('ชื่อรอบประเมิน', defaultName);
            if (!name) return;
            try {
                await addDoc(col('review_cycles'), {
                    name: name.trim(), year: now.getFullYear(),
                    dimensions: REVIEW_DIMENSIONS,        // โครงสร้าง 4 มิติ
                    criteria: REVIEW_DEFAULT_CRITERIA,    // backward compat
                    status: 'open',
                    createdAt: new Date().toISOString(), createdBy: profile.name,
                });
                showToast('✅ สร้างรอบประเมินแล้ว', 'success');
                await loadCycles();
                rvLoadCycle();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
        };

        window.rvLoadCycle = async () => {
            const cid = document.getElementById('rv-cycle')?.value;
            currentCycle = cycles.find(c => c.id === cid) || null;
            const el = document.getElementById('rv-emp-list');
            if (!el) return;
            if (!currentCycle) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-ranking-star text-5xl mb-3"></i><p class="font-bold text-sm">เลือกหรือสร้างรอบประเมินเพื่อเริ่มต้น</p></div>`;
                return;
            }
            el.innerHTML = `<div class="text-center py-12 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-3xl"></i></div>`;
            // โหลดผลประเมินของรอบนี้ (manager + self)
            // เก็บเฉพาะของพนักงานในขอบเขต (ตัด review ของหัวหน้าทีมอื่นออก)
            const visibleUids = new Set(employees.map(e => e.uid));
            const snap = await getDocs(col('reviews'));
            // reviews: uid → { reviewerUid: review }  — รองรับหลายหัวหน้าประเมินคนเดียวกัน
            reviews = {};
            selfReviews = {};
            snap.forEach(d => {
                const r = d.data();
                if (r.cycleId !== currentCycle.id) return;
                if (!visibleUids.has(r.uid)) return;
                if (r.kind === 'self') {
                    selfReviews[r.uid] = r;
                } else {
                    if (!reviews[r.uid]) reviews[r.uid] = {};
                    const key = r.reviewerUid || 'legacy';
                    reviews[r.uid][key] = r;
                }
            });
            renderEmpList();
        };

        // ── helpers ───────────────────────────────────────────
        // review ของฉันที่ทำกับพนักงานคนนี้ (รองรับ legacy ที่ไม่มี reviewerUid)
        function myReviewOf(uid) {
            const m = reviews[uid];
            if (!m) return null;
            if (m[user.uid]) return m[user.uid];
            // legacy: ถือว่าเป็นของเราถ้าเราเป็นหัวหน้าโดยตรงของคนนี้
            if (m['legacy']) {
                const e = employees.find(x => x.uid === uid);
                if (e && (e.managerUid === user.uid || isAdmin)) return m['legacy'];
            }
            return null;
        }
        function allReviewsOf(uid) {
            return reviews[uid] ? Object.values(reviews[uid]) : [];
        }
        function avgOfAllReviews(uid) {
            const arr = allReviewsOf(uid);
            if (!arr.length) return null;
            return Math.round(arr.reduce((s,r) => s + (r.avg||0), 0) / arr.length * 100) / 100;
        }

        function renderEmpList() {
            const el = document.getElementById('rv-emp-list');
            if (!el || !currentCycle) return;
            // กันโชว์ "ตัวเอง" ในรายการที่ manager ประเมิน — manager เห็นได้แต่ห้าม "ประเมินตัวเอง" ผ่านหน้านี้
            const list = isAdmin ? employees : employees.filter(e => e.uid !== user.uid);
            // จำนวนคนที่ถูกประเมินแล้ว (อย่างน้อย 1 reviewer)
            const doneCount = list.filter(e => allReviewsOf(e.uid).length > 0).length;
            const selfCount = list.filter(e => selfReviews[e.uid]).length;
            const header = `<div class="bg-zinc-900 rounded-2xl p-4 flex items-center justify-between text-white mb-1 flex-wrap gap-2">
                <p class="font-black text-sm">${currentCycle.name}</p>
                <div class="flex gap-3 text-xs font-bold">
                    <span class="text-yellow-400"><i class="fa-solid fa-clipboard-check mr-1"></i>มีหัวหน้าประเมินแล้ว ${doneCount}/${list.length}</span>
                    <span class="text-blue-300"><i class="fa-solid fa-user-check mr-1"></i>ประเมินตัวเองแล้ว ${selfCount}/${list.length}</span>
                </div>
            </div>` + noTeamWarn;
            if (!list.length) {
                el.innerHTML = header + `<div class="text-center py-12 text-zinc-300 bg-white rounded-2xl border border-zinc-200">
                    <i class="fa-regular fa-folder-open text-4xl mb-3"></i>
                    <p class="font-bold text-sm">ไม่มีพนักงานในขอบเขตของคุณ</p>
                </div>`;
                return;
            }
            el.innerHTML = header + list.map(e => {
                const myR = myReviewOf(e.uid);
                const allRs = allReviewsOf(e.uid);
                const otherRs = allRs.filter(r => (r.reviewerUid || 'legacy') !== (myR ? (myR.reviewerUid || 'legacy') : ''));
                const sv = selfReviews[e.uid];
                const isShared = !e.managerUid;     // พนักงานที่ไม่ได้ระบุหัวหน้า — หลายหัวหน้าประเมินได้
                const avatar = e.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=f4f4f5&color=27272a&bold=true`;
                const scoreColor = v => v >= 4 ? 'text-green-600' : v >= 3 ? 'text-yellow-600' : 'text-red-500';
                const scoreBadge = `<div class="flex gap-3 mr-2 shrink-0">
                    ${myR ? `<div class="text-right">
                         <p class="font-black text-lg ${scoreColor(myR.avg)}">${myR.avg.toFixed(1)}</p>
                         <p class="text-[9px] text-zinc-400 font-bold uppercase">${isAdmin && myR.reviewedBy ? myR.reviewedBy.split(' ')[0] : 'คะแนนของคุณ'}</p>
                       </div>` : ''}
                    ${sv ? `<div class="text-right">
                         <p class="font-black text-lg ${scoreColor(sv.avg)}">${sv.avg.toFixed(1)}</p>
                         <p class="text-[9px] text-zinc-400 font-bold uppercase">ตัวเอง</p>
                       </div>` : ''}
                </div>`;
                const sharedBadge = isShared
                    ? `<span class="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">หลายหัวหน้าประเมินได้</span>` : '';
                const otherCount = otherRs.length;
                const otherBadge = otherCount > 0
                    ? `<span class="text-[9px] font-black bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded" title="${otherRs.map(r=>r.reviewedBy||'').join(', ')}">หัวหน้าอื่นประเมินแล้ว ${otherCount}</span>`
                    : '';
                const detailBtn = (allRs.length || sv)
                    ? `<button onclick="rvOpenDetail('${e.uid}')" title="ดูรายละเอียด"
                          class="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-black w-9 h-9 rounded-xl text-sm shrink-0">
                          <i class="fa-solid fa-eye"></i>
                       </button>`
                    : '';
                const scoreBtn = `<button onclick="rvOpenScore('${e.uid}')"
                    class="${myR ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600' : 'bg-yellow-500 hover:bg-yellow-400 text-zinc-900'} font-black px-3 py-2 rounded-xl text-xs uppercase shrink-0">
                    ${myR ? '<i class="fa-solid fa-pen mr-1"></i>แก้ไข' : '<i class="fa-solid fa-star mr-1"></i>ประเมิน'}
                </button>`;
                return `<div class="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-2 flex-wrap">
                    <img src="${avatar}" onerror="handleImgError(this)" data-name="${e.name}" class="w-11 h-11 rounded-2xl object-cover border border-zinc-200 shrink-0">
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-zinc-800 text-sm truncate">${e.name}</p>
                        <p class="text-[10px] text-zinc-400 font-bold">${e.position || ''} · ${e.branch || ''}</p>
                        <div class="flex gap-1 mt-1 flex-wrap">${sharedBadge}${otherBadge}</div>
                    </div>
                    ${scoreBadge}
                    ${detailBtn}
                    ${scoreBtn}
                </div>`;
            }).join('');
        }

        // ── Detail modal: เปรียบเทียบคะแนนหัวหน้า vs ประเมินตัวเอง ──
        window.rvOpenDetail = (uid) => {
            const emp = employees.find(e => e.uid === uid);
            const allRs = allReviewsOf(uid);     // ทุก review จากทุกหัวหน้า
            const sv = selfReviews[uid];
            if (!emp || (!allRs.length && !sv)) return;
            const tEl = document.getElementById('rv-detail-title');
            const sEl = document.getElementById('rv-detail-sub');
            const bEl = document.getElementById('rv-detail-body');
            if (tEl) tEl.textContent = 'รายละเอียดผลประเมิน: ' + emp.name;
            if (sEl) sEl.textContent = currentCycle.name + (emp.position ? ' · ' + emp.position : '');

            const starsRow = (sc) => [1,2,3,4,5].map(n =>
                `<i class="fa-solid fa-star text-base ${n <= sc ? 'text-yellow-500' : 'text-zinc-200'}"></i>`).join('');
            const scoreColor = v => v >= 4 ? 'text-green-600' : v >= 3 ? 'text-yellow-600' : 'text-red-500';

            // ใช้ dimensions จาก review ที่มี หรือ default
            const dims = (allRs[0] && allRs[0].dimensions) || (sv && sv.dimensions) || REVIEW_DIMENSIONS;

            // คะแนนเฉลี่ยจากทุกหัวหน้า
            const mgrAvgOverall = allRs.length
                ? Math.round(allRs.reduce((s,r) => s + (r.avg||0), 0) / allRs.length * 100) / 100
                : null;

            const summaryHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                    <p class="text-[10px] font-black text-yellow-700 uppercase mb-1"><i class="fa-solid fa-clipboard-check mr-1"></i>หัวหน้าประเมิน ${allRs.length > 1 ? `(เฉลี่ย ${allRs.length} คน)` : ''}</p>
                    ${mgrAvgOverall != null ? `<p class="text-3xl font-black ${scoreColor(mgrAvgOverall)}">${mgrAvgOverall.toFixed(1)}</p>
                             <p class="text-[10px] text-zinc-500 mt-1">${allRs.map(r=>r.reviewedBy||'-').join(' · ')}</p>` : `<p class="text-sm font-bold text-zinc-400 py-3">— ยังไม่ประเมิน —</p>`}
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                    <p class="text-[10px] font-black text-blue-700 uppercase mb-1"><i class="fa-solid fa-user-check mr-1"></i>ประเมินตัวเอง</p>
                    ${sv ? `<p class="text-3xl font-black ${scoreColor(sv.avg)}">${sv.avg.toFixed(1)}</p>
                             <p class="text-[10px] text-zinc-500 mt-1">${sv.reviewedAt ? new Date(sv.reviewedAt).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'}) : ''}</p>` : `<p class="text-sm font-bold text-zinc-400 py-3">— ยังไม่ประเมินตัวเอง —</p>`}
                </div>
            </div>`;

            const dimsHtml = dims.map((dim, dIdx) => {
                const items = dim.items.map(it => {
                    const key = dim.id + '.' + it.id;
                    const sScore = sv?.scores?.[key] || 0;
                    // คะแนนของแต่ละหัวหน้า
                    const mgrRows = allRs.map(r => {
                        const sc = r.scores?.[key] || 0;
                        if (!sc) return '';
                        const diff = (sc && sScore) ? (sc - sScore) : null;
                        const diffBadge = diff > 0
                            ? `<span class="text-[10px] font-black px-2 py-0.5 rounded bg-green-100 text-green-700">+${diff}</span>`
                            : diff < 0
                                ? `<span class="text-[10px] font-black px-2 py-0.5 rounded bg-orange-100 text-orange-700">${diff}</span>`
                                : (diff === 0 ? `<span class="text-[10px] font-black px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">เท่ากัน</span>` : '');
                        return `<div class="flex items-center gap-2 flex-wrap">
                            <span class="text-[10px] font-black text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded shrink-0" title="${r.reviewedBy||''}">${(r.reviewedBy||'หัวหน้า').split(' ')[0]}</span>
                            <span class="flex gap-0.5">${starsRow(sc)}</span>
                            <span class="text-xs font-black text-yellow-600">${sc}/5</span>
                            ${diffBadge ? `<span class="ml-1">${diffBadge}</span>` : ''}
                        </div>`;
                    }).join('');
                    return `<div class="py-3 border-b border-zinc-50 last:border-0">
                        <p class="text-sm font-bold text-zinc-800">${it.name}</p>
                        <p class="text-[10px] text-zinc-400 leading-snug mb-2">${it.desc||''}</p>
                        <div class="space-y-1.5">
                            ${mgrRows}
                            ${sv ? `<div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">ตัวเอง</span>
                                <span class="flex gap-0.5">${starsRow(sScore)}</span>
                                <span class="text-xs font-black text-blue-600">${sScore}/5</span>
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('');
                // คะแนนเฉลี่ยของมิตินี้
                const mDimAvgs = allRs.map(r => r.dimAvg?.[dim.id]).filter(v => v != null);
                const mDimAvg = mDimAvgs.length ? Math.round(mDimAvgs.reduce((s,v)=>s+v,0) / mDimAvgs.length * 100) / 100 : null;
                const sDimAvg = sv?.dimAvg?.[dim.id];
                const dimSummary = (mDimAvg != null || sDimAvg != null)
                    ? `<div class="flex gap-2 text-[10px] font-black shrink-0 flex-wrap">
                          ${mDimAvg != null ? `<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">หัวหน้า ${mDimAvg.toFixed(1)}</span>` : ''}
                          ${sDimAvg != null ? `<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">ตัวเอง ${sDimAvg.toFixed(1)}</span>` : ''}
                      </div>`
                    : '';
                return `<div class="mb-3">
                    <div class="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-xl border ${dim.color||'bg-zinc-50 border-zinc-200 text-zinc-700'} flex-wrap">
                        <div>
                            <p class="font-black text-xs">${dIdx+1}. ${dim.name}</p>
                            <p class="text-[10px] font-bold opacity-70">${dim.nameEn||''}</p>
                        </div>
                        ${dimSummary}
                    </div>
                    ${items}
                </div>`;
            }).join('');

            const mgrCommentsHtml = allRs.filter(r => r.comment).map(r =>
                `<div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p class="text-[10px] font-black text-yellow-700 uppercase mb-1"><i class="fa-solid fa-comment mr-1"></i>ความเห็นจาก ${r.reviewedBy||'หัวหน้า'}</p>
                    <p class="text-sm text-zinc-700">${r.comment}</p>
                </div>`).join('');
            const commentsHtml = mgrCommentsHtml + (sv?.comment ? `<div class="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p class="text-[10px] font-black text-blue-700 uppercase mb-1"><i class="fa-solid fa-comment-dots mr-1"></i>ความเห็นจากพนักงาน</p>
                    <p class="text-sm text-zinc-700">${sv.comment}</p>
                </div>` : '');

            if (bEl) bEl.innerHTML = summaryHtml + dimsHtml + commentsHtml;
            document.getElementById('rv-detail-modal')?.classList.remove('hidden');
        };

        window.rvCloseDetail = () => {
            document.getElementById('rv-detail-modal')?.classList.add('hidden');
        };

        // คืนรายการมิติที่ต้องประเมินจริงสำหรับพนักงานคนนี้
        function effectiveDimensions(emp) {
            const dims = (currentCycle && currentCycle.dimensions) || REVIEW_DIMENSIONS;
            const showMgr = isManagerialOverride != null ? isManagerialOverride : isManagerialEmp(emp);
            return dims.filter(d => !d.managerOnly || showMgr);
        }

        window.rvOpenScore = (uid) => {
            const emp = employees.find(e => e.uid === uid);
            if (!emp || !currentCycle) return;
            // ห้ามประเมินตัวเองจากหน้านี้ (ใช้แท็บ "ประเมินตัวเอง" ในผลประเมินของฉันแทน)
            if (uid === user.uid) {
                showToast('การประเมินตัวเอง ใช้แท็บ "ประเมินตัวเอง" ในหน้า "ผลประเมินของฉัน"', 'info');
                return;
            }
            // กันหัวหน้าทีมอื่นเปิดประเมินผ่าน console
            if (!isAdmin && !canReview(emp)) {
                showToast('คุณไม่ใช่หัวหน้าโดยตรงของพนักงานคนนี้', 'error');
                return;
            }
            scoringUid = uid;
            const existing = myReviewOf(uid);
            tempScores = existing && existing.scores ? { ...existing.scores } : {};
            isManagerialOverride = existing && typeof existing.isManagerial === 'boolean'
                ? existing.isManagerial : null;
            document.getElementById('rv-modal-title').textContent = 'ประเมิน: ' + emp.name;
            document.getElementById('rv-modal-sub').textContent = currentCycle.name + (emp.position ? ' · ' + emp.position : '');
            document.getElementById('rv-comment').value = existing?.comment || '';
            renderCriteria();
            document.getElementById('rv-modal')?.classList.remove('hidden');
        };

        function renderCriteria() {
            const el = document.getElementById('rv-criteria');
            if (!el || !currentCycle) return;
            const emp = employees.find(e => e.uid === scoringUid);
            const allDims = (currentCycle.dimensions) || REVIEW_DIMENSIONS;
            const showMgr = isManagerialOverride != null ? isManagerialOverride : isManagerialEmp(emp);

            const dimsHtml = allDims.map((dim, dIdx) => {
                // ถ้าเป็นมิติบริหารและไม่ต้องประเมิน → ซ่อน body แต่ยังโชว์ header + toggle
                const visible = !dim.managerOnly || showMgr;
                const itemsHtml = dim.items.map(it => {
                    const key = dim.id + '.' + it.id;
                    const cur = tempScores[key] || 0;
                    const stars = [1,2,3,4,5].map(n => `
                        <button type="button" onclick="rvSetScore('${key}',${n})"
                            class="w-11 h-11 rounded-lg text-2xl transition-all active:scale-95 ${n <= cur ? 'text-yellow-500' : 'text-zinc-200 hover:text-yellow-300'}"
                            aria-label="ให้ ${n} ดาว">
                            <i class="fa-solid fa-star pointer-events-none"></i>
                        </button>`).join('');
                    const scoreLabel = cur > 0 ? `<span class="text-xs font-black text-yellow-600">(${cur}/5)</span>` : '<span class="text-[10px] text-zinc-300 font-bold">ยังไม่ให้คะแนน</span>';
                    return `<div class="py-3 border-b border-zinc-100 last:border-0">
                        <p class="text-sm font-bold text-zinc-800">${it.name}</p>
                        <p class="text-[11px] text-zinc-400 mt-0.5 mb-2 leading-snug">${it.desc}</p>
                        <div class="flex items-center gap-1 flex-wrap">${stars}<span class="ml-2">${scoreLabel}</span></div>
                    </div>`;
                }).join('');

                const mgrToggle = dim.managerOnly
                    ? `<label class="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 cursor-pointer">
                         <input type="checkbox" ${showMgr?'checked':''} onchange="rvToggleManagerial(this.checked)" class="accent-yellow-500">
                         ประเมินมิตินี้
                       </label>`
                    : '';

                return `<div class="mb-4 ${!visible ? 'opacity-60' : ''}">
                    <div class="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-xl border ${dim.color}">
                        <div>
                            <p class="font-black text-xs">${dIdx+1}. ${dim.name}</p>
                            <p class="text-[10px] font-bold opacity-70">${dim.nameEn}${dim.managerOnly ? ' · เฉพาะหัวหน้างาน' : ''}</p>
                        </div>
                        ${mgrToggle}
                    </div>
                    ${visible ? itemsHtml : '<p class="text-center py-3 text-[11px] text-zinc-400">ไม่ประเมินมิตินี้สำหรับพนักงานคนนี้</p>'}
                </div>`;
            }).join('');

            el.innerHTML = dimsHtml;
        }

        window.rvSetScore = (key, n) => { tempScores[key] = n; renderCriteria(); };
        window.rvToggleManagerial = (checked) => { isManagerialOverride = checked; renderCriteria(); };

        window.rvCloseModal = () => {
            document.getElementById('rv-modal')?.classList.add('hidden');
            scoringUid = null; tempScores = {}; isManagerialOverride = null;
        };

        window.rvSave = async () => {
            if (!scoringUid || !currentCycle) return;
            const emp = employees.find(e => e.uid === scoringUid);
            if (!emp) return;
            // กันการบันทึกผ่าน console สำหรับ manager ที่ไม่มีสิทธิ์ประเมินพนักงานคนนั้น
            if (!isAdmin && !canReview(emp)) {
                showToast('คุณไม่ใช่หัวหน้าโดยตรงของพนักงานคนนี้', 'error');
                return;
            }
            const dims = effectiveDimensions(emp);
            // เช็คครบทุกข้อในมิติที่ต้องประเมิน
            const missing = [];
            dims.forEach(dim => dim.items.forEach(it => {
                const key = dim.id + '.' + it.id;
                if (!tempScores[key]) missing.push(it.name);
            }));
            if (missing.length) { showToast(`ยังขาดคะแนน: ${missing[0]}${missing.length>1?` (+${missing.length-1} ข้อ)`:''}`, 'error'); return; }

            // คำนวณคะแนนต่อมิติ + เฉลี่ยรวม
            const dimAvg = {};
            const allVals = [];
            dims.forEach(dim => {
                const vals = dim.items.map(it => tempScores[dim.id + '.' + it.id] || 0);
                dimAvg[dim.id] = Math.round(vals.reduce((s,v)=>s+v,0) / vals.length * 100) / 100;
                allVals.push(...vals);
            });
            const avg = Math.round(allVals.reduce((s,v)=>s+v,0) / allVals.length * 100) / 100;
            const isManagerial = isManagerialOverride != null ? isManagerialOverride : isManagerialEmp(emp);

            const btn = document.getElementById('rv-save-btn');
            btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
            try {
                await setDoc(doc(db,'artifacts',APP_ID,'public','data','reviews', `${currentCycle.id}_${scoringUid}_${user.uid}`), {
                    cycleId: currentCycle.id, cycleName: currentCycle.name,
                    uid: scoringUid, employeeName: emp?.name || '', employeeCode: emp?.employeeCode || '',
                    branch: emp?.branch || '', position: emp?.position || '',
                    dimensions: dims,           // มิติที่ใช้ประเมินจริง
                    scores: { ...tempScores },  // คะแนนรายข้อ (key = dimId.itemId)
                    dimAvg,                     // คะแนนเฉลี่ยต่อมิติ
                    avg,                        // คะแนนเฉลี่ยรวม
                    isManagerial,
                    comment: document.getElementById('rv-comment')?.value.trim() || '',
                    reviewedBy: profile.name, reviewerUid: user.uid, reviewedAt: new Date().toISOString(),
                });
                showToast('✅ บันทึกผลประเมินแล้ว', 'success');
                rvCloseModal();
                rvLoadCycle();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
            finally { btn.disabled = false; btn.textContent = 'บันทึกผลประเมิน'; }
        };

        if (cycles.length) rvLoadCycle();

        return () => {
            ['rvNewCycle','rvLoadCycle','rvOpenScore','rvSetScore','rvToggleManagerial','rvCloseModal','rvSave','rvOpenDetail','rvCloseDetail'].forEach(k => delete window[k]);
        };
    }
};
