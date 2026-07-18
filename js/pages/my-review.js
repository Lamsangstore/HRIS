// หน้า "ผลประเมินของฉัน"
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// เกณฑ์ประเมิน import จาก module / isManagerialEmp กับ showToast เป็น global

import { REVIEW_DIMENSIONS, REVIEW_DEFAULT_CRITERIA } from '../lib/review-dimensions.js';
export default {
    title: 'ผลประเมินของฉัน',
    html: `
<style>
.mr-tab { transition: all .2s; }
.mr-tab.active { background:#18181b; color:#eab308; }
</style>
<div class="p-6 lg:p-8 max-w-3xl mx-auto">
  <div class="mb-6">
    <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">ผลประเมินของฉัน</h2>
    <p class="text-sm text-zinc-400 font-medium mt-0.5">ผลประเมินจากหัวหน้า และการประเมินตัวเอง</p>
  </div>

  <div class="flex gap-2 mb-6 bg-zinc-100 p-1 rounded-xl w-fit">
    <button class="mr-tab active text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg" onclick="mrSetTab('received')">ผลจากหัวหน้า</button>
    <button class="mr-tab text-xs font-black uppercase tracking-widest px-5 py-2 rounded-lg text-zinc-500" onclick="mrSetTab('self')">ประเมินตัวเอง</button>
  </div>

  <div id="mr-tab-received">
    <div id="mr-list" class="space-y-4">
      <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-4xl"></i></div>
    </div>
  </div>

  <div id="mr-tab-self" class="hidden">
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 mb-4 flex items-center gap-3">
      <label class="text-xs font-black text-zinc-500 uppercase whitespace-nowrap">รอบประเมิน</label>
      <select id="mr-self-cycle" onchange="mrLoadSelfCycle()" class="flex-1 border-2 border-zinc-200 rounded-xl px-3 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
        <option value="">— เลือกรอบประเมิน —</option>
      </select>
    </div>
    <div id="mr-self-body">
      <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-square-poll-vertical text-5xl mb-3"></i><p class="font-bold text-sm">เลือกรอบประเมินเพื่อประเมินตัวเอง</p></div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        const { collection, doc, getDocs, getDoc, setDoc, query, orderBy, where }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
        const col = name => collection(db,'artifacts',APP_ID,'public','data',name);

        // โหลด review ทั้งหมด (manager + self) ของฉัน
        // query แคบที่ uid ตัวเอง — ถ้าดึงทั้ง collection security rules จะปฏิเสธทั้งคำขอ
        // (rules ไม่ใช่ตัวกรอง) และคะแนนประเมินของคนอื่นก็ไม่ควรหลุดมาถึงเบราว์เซอร์อยู่แล้ว
        const snap = await getDocs(query(col('reviews'), where('uid','==',user.uid)));
        const myReviews = snap.docs.map(d => d.data())
            .filter(r => r.kind !== 'self')
            .sort((a,b) => (b.reviewedAt||'').localeCompare(a.reviewedAt||''));
        const mySelfReviews = {};
        snap.docs.forEach(d => {
            const r = d.data();
            if (r.kind === 'self') mySelfReviews[r.cycleId] = r;
        });

        // โหลด cycles สำหรับประเมินตัวเอง
        const cyclesSnap = await getDocs(query(col('review_cycles'), orderBy('createdAt','desc')));
        const cycles = cyclesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const cycleSel = document.getElementById('mr-self-cycle');
        if (cycleSel) cycles.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id; o.textContent = c.name;
            cycleSel.appendChild(o);
        });

        window.mrSetTab = (tab) => {
            document.getElementById('mr-tab-received')?.classList.toggle('hidden', tab !== 'received');
            document.getElementById('mr-tab-self')?.classList.toggle('hidden', tab !== 'self');
            document.querySelectorAll('.mr-tab').forEach((b, i) => {
                const isActive = (i === 0 && tab === 'received') || (i === 1 && tab === 'self');
                b.classList.toggle('active', isActive);
                b.classList.toggle('text-zinc-500', !isActive);
            });
        };

        // ── ประเมินตัวเอง ────────────────────────────────────────
        let selfTemp = {}, selfMgrOverride = null, selfCurCycle = null;

        function selfDims(cycle) {
            const dims = (cycle && cycle.dimensions) || REVIEW_DIMENSIONS;
            const showMgr = selfMgrOverride != null ? selfMgrOverride : isManagerialEmp(profile);
            return dims.filter(d => !d.managerOnly || showMgr);
        }

        window.mrLoadSelfCycle = () => {
            const cid = document.getElementById('mr-self-cycle')?.value;
            selfCurCycle = cycles.find(c => c.id === cid) || null;
            const body = document.getElementById('mr-self-body');
            if (!body) return;
            if (!selfCurCycle) {
                body.innerHTML = '<div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-square-poll-vertical text-5xl mb-3"></i><p class="font-bold text-sm">เลือกรอบประเมินเพื่อประเมินตัวเอง</p></div>';
                return;
            }
            const existing = mySelfReviews[selfCurCycle.id];
            selfTemp = existing && existing.scores ? { ...existing.scores } : {};
            selfMgrOverride = existing && typeof existing.isManagerial === 'boolean' ? existing.isManagerial : null;
            renderSelf();
        };

        function renderSelf() {
            const body = document.getElementById('mr-self-body');
            if (!body || !selfCurCycle) return;
            const allDims = (selfCurCycle.dimensions) || REVIEW_DIMENSIONS;
            const showMgr = selfMgrOverride != null ? selfMgrOverride : isManagerialEmp(profile);
            const existing = mySelfReviews[selfCurCycle.id];

            const dimsHtml = allDims.map((dim, dIdx) => {
                const visible = !dim.managerOnly || showMgr;
                const itemsHtml = dim.items.map(it => {
                    const key = dim.id + '.' + it.id;
                    const cur = selfTemp[key] || 0;
                    const stars = [1,2,3,4,5].map(n => `
                        <button type="button" onclick="mrSelfSetScore('${key}',${n})"
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
                         <input type="checkbox" ${showMgr?'checked':''} onchange="mrSelfToggleMgr(this.checked)" class="accent-yellow-500">
                         ประเมินมิตินี้
                       </label>`
                    : '';
                return `<div class="mb-4 ${!visible ? 'opacity-60' : ''}">
                    <div class="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-xl border ${dim.color||'bg-zinc-50 border-zinc-200 text-zinc-700'}">
                        <div>
                            <p class="font-black text-xs">${dIdx+1}. ${dim.name}</p>
                            <p class="text-[10px] font-bold opacity-70">${dim.nameEn}${dim.managerOnly ? ' · เฉพาะหัวหน้างาน' : ''}</p>
                        </div>
                        ${mgrToggle}
                    </div>
                    ${visible ? itemsHtml : '<p class="text-center py-3 text-[11px] text-zinc-400">ไม่ประเมินมิตินี้</p>'}
                </div>`;
            }).join('');

            body.innerHTML = `<div class="bg-white rounded-2xl border border-zinc-200 p-5">
                ${existing ? `<div class="bg-green-50 border border-green-200 rounded-xl px-4 py-2 mb-4 text-xs font-bold text-green-700">
                    <i class="fa-solid fa-circle-check mr-1"></i> คุณเคยส่งการประเมินตัวเองในรอบนี้แล้ว — แก้ไขแล้วบันทึกใหม่ได้
                </div>` : `<p class="text-xs text-zinc-400 font-medium mb-4">ให้คะแนนตัวเองตามตรง 1-5 ดาว เพื่อเปรียบเทียบกับมุมมองของหัวหน้า</p>`}
                ${dimsHtml}
                <div class="mt-4">
                    <label class="block text-xs font-bold text-zinc-500 mb-1 uppercase">ความเห็นเพิ่มเติม (จุดแข็ง / สิ่งที่อยากพัฒนา)</label>
                    <textarea id="mr-self-comment" rows="3" class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:border-yellow-500 focus:outline-none resize-none">${existing?.comment || ''}</textarea>
                </div>
                <button onclick="mrSelfSave()" id="mr-self-save"
                    class="w-full mt-4 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black py-3 rounded-xl text-sm uppercase">
                    <i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกการประเมินตัวเอง
                </button>
            </div>`;
        }

        window.mrSelfSetScore = (key, n) => { selfTemp[key] = n; renderSelf(); };
        window.mrSelfToggleMgr = (checked) => { selfMgrOverride = checked; renderSelf(); };

        window.mrSelfSave = async () => {
            if (!selfCurCycle) return;
            const dims = selfDims(selfCurCycle);
            const missing = [];
            dims.forEach(dim => dim.items.forEach(it => {
                const key = dim.id + '.' + it.id;
                if (!selfTemp[key]) missing.push(it.name);
            }));
            if (missing.length) { showToast(`ยังขาดคะแนน: ${missing[0]}${missing.length>1?` (+${missing.length-1} ข้อ)`:''}`, 'error'); return; }
            const dimAvg = {};
            const allVals = [];
            dims.forEach(dim => {
                const vals = dim.items.map(it => selfTemp[dim.id + '.' + it.id] || 0);
                dimAvg[dim.id] = Math.round(vals.reduce((s,v)=>s+v,0) / vals.length * 100) / 100;
                allVals.push(...vals);
            });
            const avg = Math.round(allVals.reduce((s,v)=>s+v,0) / allVals.length * 100) / 100;
            const isManagerial = selfMgrOverride != null ? selfMgrOverride : isManagerialEmp(profile);
            const btn = document.getElementById('mr-self-save');
            btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังบันทึก...';
            try {
                const payload = {
                    cycleId: selfCurCycle.id, cycleName: selfCurCycle.name,
                    uid: user.uid, employeeName: profile.name, employeeCode: profile.employeeCode || '',
                    branch: profile.branch || '', position: profile.position || '',
                    dimensions: dims, scores: { ...selfTemp }, dimAvg, avg, isManagerial,
                    comment: document.getElementById('mr-self-comment')?.value.trim() || '',
                    kind: 'self',
                    reviewedBy: profile.name, reviewedAt: new Date().toISOString(),
                };
                await setDoc(doc(db,'artifacts',APP_ID,'public','data','reviews', `${selfCurCycle.id}_${user.uid}_self`), payload);
                mySelfReviews[selfCurCycle.id] = payload;
                showToast('✅ บันทึกการประเมินตัวเองแล้ว', 'success');
                renderSelf();
            } catch(e) { showToast('❌ '+e.message, 'error'); }
            finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกการประเมินตัวเอง'; }
        };

        const el = document.getElementById('mr-list');
        if (el) {
            if (!myReviews.length) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300">
                    <i class="fa-regular fa-folder-open text-5xl mb-3"></i>
                    <p class="font-bold text-sm">ยังไม่มีผลประเมิน</p>
                </div>`;
            } else {
                // กลุ่ม manager reviews ตาม cycleId — ถ้ามีหลายหัวหน้าประเมิน จะเห็นพร้อมกัน
                const byCycle = {};
                myReviews.forEach(r => {
                    if (!byCycle[r.cycleId]) byCycle[r.cycleId] = { cycleName: r.cycleName, list: [] };
                    byCycle[r.cycleId].list.push(r);
                });

                el.innerHTML = Object.entries(byCycle).map(([cid, group]) => {
                    // กั๊ก: ต้องประเมินตัวเองในรอบเดียวกันก่อนถึงจะดูผลของหัวหน้าได้
                    if (!mySelfReviews[cid]) {
                        return `<div class="bg-white rounded-2xl border border-amber-200 p-8 text-center">
                            <div class="w-16 h-16 mx-auto rounded-full bg-amber-50 flex items-center justify-center mb-3">
                                <i class="fa-solid fa-lock text-2xl text-amber-500"></i>
                            </div>
                            <p class="font-black text-zinc-800 text-sm">${group.cycleName || 'รอบประเมิน'}</p>
                            <p class="text-xs text-zinc-500 mt-1">หัวหน้าประเมินคุณแล้ว <span class="font-black text-amber-700">${group.list.length} คน</span></p>
                            <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-4 max-w-sm mx-auto">
                                <p class="text-xs font-bold text-amber-800 mb-1"><i class="fa-solid fa-circle-info mr-1"></i> ต้องประเมินตัวเองก่อน</p>
                                <p class="text-[11px] text-amber-700 leading-snug">เพื่อให้การประเมินเป็นกลางและตรงจุด คุณต้องประเมินตัวเองในรอบนี้ก่อน ระบบจึงจะเปิดให้ดูผลจากหัวหน้าได้</p>
                            </div>
                            <button onclick="mrSetTab('self');document.getElementById('mr-self-cycle').value='${cid}';mrLoadSelfCycle();"
                                class="mt-4 bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-black px-5 py-2.5 rounded-xl text-xs uppercase">
                                <i class="fa-solid fa-pen mr-1"></i> ไปประเมินตัวเอง
                            </button>
                        </div>`;
                    }
                    return group.list.map(r => {
                    const starRow = (sc) => [1,2,3,4,5].map(n =>
                        `<i class="fa-solid fa-star text-lg ${n <= sc ? 'text-yellow-500' : 'text-zinc-200'}"></i>`).join('');

                    // ใช้ dimensions ใหม่ถ้ามี; ถ้าเป็น review เก่า fallback ไป criteria แบบเดิม
                    let body = '';
                    if (Array.isArray(r.dimensions) && r.dimensions.length) {
                        body = r.dimensions.map((dim, dIdx) => {
                            const dAvg = r.dimAvg && r.dimAvg[dim.id] != null ? r.dimAvg[dim.id] : null;
                            const items = dim.items.map(it => {
                                const key = dim.id + '.' + it.id;
                                const sc = (r.scores && r.scores[key]) || 0;
                                return `<div class="py-2.5 border-b border-zinc-50 last:border-0">
                                    <p class="text-sm font-bold text-zinc-700">${it.name}</p>
                                    <p class="text-[10px] text-zinc-400 leading-snug mb-1.5">${it.desc||''}</p>
                                    <div class="flex items-center gap-1.5">
                                        <span class="flex gap-0.5">${starRow(sc)}</span>
                                        <span class="text-xs font-black text-yellow-600 ml-1">${sc}/5</span>
                                    </div>
                                </div>`;
                            }).join('');
                            return `<div class="mt-4">
                                <div class="flex items-center justify-between gap-2 mb-2 px-3 py-2 rounded-xl border ${dim.color||'bg-zinc-50 border-zinc-200 text-zinc-700'}">
                                    <div class="min-w-0">
                                        <p class="font-black text-xs">${dIdx+1}. ${dim.name}</p>
                                        <p class="text-[10px] font-bold opacity-70">${dim.nameEn||''}</p>
                                    </div>
                                    ${dAvg != null ? `<p class="text-lg font-black shrink-0">${dAvg.toFixed(1)}</p>` : ''}
                                </div>
                                ${items}
                            </div>`;
                        }).join('');
                    } else {
                        const criteria = r.criteria || REVIEW_DEFAULT_CRITERIA;
                        body = criteria.map((c, i) => {
                            const sc = r.scores?.[i] || 0;
                            return `<div class="py-2 border-b border-zinc-50 last:border-0">
                                <p class="text-sm font-bold text-zinc-700 mb-1">${c}</p>
                                <div class="flex items-center gap-1.5">
                                    <span class="flex gap-0.5">${starRow(sc)}</span>
                                    <span class="text-xs font-black text-yellow-600 ml-1">${sc}/5</span>
                                </div>
                            </div>`;
                        }).join('');
                    }

                    const avgColor = r.avg >= 4 ? 'text-green-600' : r.avg >= 3 ? 'text-yellow-600' : 'text-red-500';
                    return `<div class="bg-white rounded-2xl border border-zinc-200 p-6">
                        <div class="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100">
                            <div>
                                <p class="font-black text-zinc-800">${r.cycleName || 'รอบประเมิน'}</p>
                                <p class="text-[10px] text-zinc-400 font-bold">ประเมินโดย ${r.reviewedBy || '-'} · ${r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'}) : ''}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-3xl font-black ${avgColor}">${(r.avg||0).toFixed(1)}</p>
                                <p class="text-[9px] text-zinc-400 font-bold uppercase">เต็ม 5.0</p>
                            </div>
                        </div>
                        ${body}
                        ${r.comment ? `<div class="mt-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                            <p class="text-[10px] font-black text-zinc-400 uppercase mb-1"><i class="fa-solid fa-comment mr-1"></i>ความเห็นจากหัวหน้า</p>
                            <p class="text-sm text-zinc-700">${r.comment}</p>
                        </div>` : ''}
                    </div>`;
                    }).join('');  // close group.list.map
                }).join('');      // close Object.entries.map
            }
        }
        return () => {
            ['mrSetTab','mrLoadSelfCycle','mrSelfSetScore','mrSelfToggleMgr','mrSelfSave'].forEach(k => delete window[k]);
        };
    }
};
