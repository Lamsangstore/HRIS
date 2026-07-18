// หน้า "อนุมัติการลา" (หัวหน้า/admin)
//
// ย้ายออกมาจาก app.html — โค้ดเหมือนเดิมทุกบรรทัด
// โหลดแบบ dynamic import ตอนผู้ใช้เปิดหน้านี้เท่านั้น (ดู PAGE_MODULES ใน app.html)
//
// scheduleCache / balanceCache เป็นแคชเฉพาะหน้านี้ (ไม่มีใครนอกหน้าใช้) จึงย้ายมาด้วยได้

import { getLeaveTypeInfo, colorVariants } from '../lib/leave-types.js?v=20260717b';
import { hoursToDisplay, balanceToDisplay, getDayWorkHours } from '../lib/leave-hours.js?v=20260717b';
import { STATUS_MAP } from '../lib/status-map.js?v=20260717b';

export default {
    title: 'อนุมัติการลา',
    html: `
<style>
.req-card { transition: all .2s; }
.req-card:hover { box-shadow: 0 4px 20px -4px rgba(0,0,0,.1); }
</style>
<div class="p-6 lg:p-8 max-w-7xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-black text-zinc-800 uppercase tracking-tight">อนุมัติการลา</h2>
      <p class="text-sm text-zinc-400 font-medium mt-0.5">ตรวจสอบและอนุมัติคำขอลาของพนักงาน</p>
    </div>
    <div class="flex gap-2">
      <select id="filter-status" onchange="filterRequests()" class="border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
        <option value="pending">รอการอนุมัติ</option>
        <option value="approved">อนุมัติแล้ว</option>
        <option value="rejected">ไม่อนุมัติ</option>
        <option value="all">ทั้งหมด</option>
      </select>
      <select id="filter-branch" onchange="filterRequests()" class="border-2 border-zinc-200 rounded-xl px-4 py-2 text-sm font-bold focus:border-yellow-500 focus:outline-none">
        <option value="">ทุกสาขา</option>
        <option>สำนักงานใหญ่</option>
        <option>สาขาพิจิตร (เนินปอ)</option>
      </select>
    </div>
  </div>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-yellow-600" id="stat-pending">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">รอการอนุมัติ</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-green-600" id="stat-approved">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">อนุมัติแล้ว (เดือนนี้)</p>
    </div>
    <div class="bg-white rounded-2xl border border-zinc-200 p-5 text-center">
      <p class="text-3xl font-black text-red-600" id="stat-rejected">-</p>
      <p class="text-xs text-zinc-400 font-bold uppercase mt-1">ไม่อนุมัติ (เดือนนี้)</p>
    </div>
  </div>
  <div id="mgmt-request-list" class="space-y-4">
    <div class="text-center py-16 text-zinc-300"><i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i><p class="font-bold text-sm">กำลังโหลด...</p></div>
  </div>
</div>

<!-- Approve/Reject modal -->
<div id="action-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 hidden">
  <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeActionModal()"></div>
  <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
    <div id="action-modal-header" class="px-8 py-5">
      <h3 id="action-modal-title" class="font-black text-white text-lg">-</h3>
      <p id="action-modal-sub" class="text-[10px] font-bold uppercase tracking-widest mt-0.5">-</p>
    </div>
    <div class="p-8 space-y-4">
      <div id="action-detail-box" class="bg-zinc-50 rounded-xl p-4 text-sm space-y-1.5 border border-zinc-200"></div>
      <div>
        <label class="block text-sm font-bold text-zinc-700 mb-1">หมายเหตุ (ถึงพนักงาน)</label>
        <textarea id="action-note" rows="2" placeholder="เหตุผลการอนุมัติ/ไม่อนุมัติ..." class="w-full border-2 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:border-yellow-500 focus:outline-none resize-none"></textarea>
      </div>
      <div class="flex gap-3">
        <button onclick="closeActionModal()" class="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black rounded-xl transition-all text-sm">ยกเลิก</button>
        <button id="action-confirm-btn" class="flex-1 py-3 font-black rounded-xl transition-all text-sm text-white" onclick="confirmAction()">ยืนยัน</button>
      </div>
    </div>
  </div>
</div>`,

    init: async (user, profile, db, APP_ID) => {
        if (profile.role !== 'admin' && profile.role !== 'manager') {
            navigateTo('home'); return;
        }
        const { collection, doc, onSnapshot, updateDoc, setDoc, getDocs, query, orderBy, where, getDoc }
            = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

        // balance cache — โหลดครั้งเดียวต่อ uid
        const balanceCache = {};
        async function getEmpBalance(uid) {
            if (balanceCache[uid]) return balanceCache[uid];
            const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', uid));
            balanceCache[uid] = snap.exists() ? snap.data() : {};
            return balanceCache[uid];
        }
        // invalidate cache เมื่อ approve/cancel เพื่อ force reload
        function invalidateBalance(uid) { delete balanceCache[uid]; }

        let allRequests = [], pendingAction = null;

        const unsub = onSnapshot(
            query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests'), orderBy('createdAt', 'desc')),
            async snap => {
                allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const uids = [...new Set(allRequests.map(r => r.uid).filter(Boolean))];
                await Promise.all(uids.map(uid => getEmpSchedule(uid)));
                updateStats();
                filterRequests();
            }
        );

        function updateStats() {
            const now = newDateTH();
            const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            document.getElementById('stat-pending').textContent  = allRequests.filter(r => r.status === 'pending').length;
            document.getElementById('stat-approved').textContent = allRequests.filter(r => r.status === 'approved' && r.createdAt?.startsWith(thisMonth)).length;
            document.getElementById('stat-rejected').textContent = allRequests.filter(r => r.status === 'rejected' && r.createdAt?.startsWith(thisMonth)).length;
        }

        // ── schedule cache & display helper ──────────────────
        const scheduleCache = {};
        async function getEmpSchedule(uid) {
            if (scheduleCache[uid]) return scheduleCache[uid];
            try {
                const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'work_schedules', uid));
                const s = snap.exists() ? snap.data() : { workStart:'08:00', workEnd:'17:00', breakMinutes:60 };
                scheduleCache[uid] = s;
                return s;
            } catch { return { workStart:'08:00', workEnd:'17:00', breakMinutes:60 }; }
        }
        function dispHoursForReq(r) {
            const s = scheduleCache[r.uid];
            return hoursToDisplay(r.totalHours, s || null);
        }

        // ประกาศแบบ function เพื่อให้ hoist ได้ — onSnapshot อาจ callback ทันที
        // (Firestore มี cache ในเครื่อง) ถ้าใช้ const/arrow จะ ReferenceError
        // แล้วรายการไม่ render ทั้งที่ตัวเลขสถิติขึ้นแล้ว
        function filterRequests() {
            const st  = document.getElementById('filter-status')?.value;
            const br  = document.getElementById('filter-branch')?.value;
            let filtered = allRequests;
            if (st !== 'all') filtered = filtered.filter(r => r.status === st);
            if (br) filtered = filtered.filter(r => r.branch === br);
            renderRequests(filtered);
        }
        window.filterRequests = filterRequests;

        function renderRequests(list) {
            const el = document.getElementById('mgmt-request-list');
            if (!el) return;
            if (!list.length) {
                el.innerHTML = `<div class="text-center py-16 text-zinc-300">
                    <i class="fa-regular fa-folder-open text-5xl mb-3"></i>
                    <p class="font-bold text-sm">ไม่มีคำขอในหมวดนี้</p>
                </div>`; return;
            }
            const avatarUrl = (r) => r.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.employeeName)}&background=f4f4f5&color=27272a&bold=true`;
            el.innerHTML = list.map(r => {
                const t  = getLeaveTypeInfo(r.type);
                const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                const cv = colorVariants(t.color);
                const isPending = r.status === 'pending';
                const dateRange = r.startDate === r.endDate ? fmtDate(r.startDate) : `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`;
                const timeRange = r.isHourly ? ` เวลา ${r.startTime}–${r.endTime}` : ' (เต็มวัน)';
                return `
                <div class="req-card bg-white rounded-2xl border border-zinc-200 p-5 lg:p-6">
                  <div class="flex flex-col lg:flex-row gap-4">
                    <div class="flex items-center gap-4 lg:w-56 shrink-0">
                      <img src="${avatarUrl(r)}" onerror="handleImgError(this)" data-name="${r.employeeName||''}" class="w-12 h-12 rounded-2xl object-cover border border-zinc-200">
                      <div class="min-w-0">
                        <p class="font-black text-zinc-800 text-sm truncate">${r.employeeName}</p>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">${r.employeeCode || ''}</p>
                        <p class="text-[10px] text-zinc-400">${r.branch || ''}</p>
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${cv.badge}">
                          <i class="fa-solid ${t.icon}"></i> ${t.label}
                        </span>
                        <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${st.badge}">
                          <i class="fa-solid ${st.icon} mr-1"></i>${st.label}
                        </span>
                        <span class="ml-auto font-black text-zinc-800">${dispHoursForReq(r)}</span>
                      </div>
                      <p class="text-sm font-bold text-zinc-600">${dateRange}${timeRange}</p>
                      <p class="text-xs text-zinc-400 mt-1 line-clamp-2">${r.reason}</p>
                      ${r.attachment ? `<a href="${r.attachment}" target="_blank" class="text-xs text-yellow-600 hover:text-yellow-700 font-bold mt-1 inline-flex items-center gap-1"><i class="fa-solid fa-paperclip"></i> ดูเอกสารแนบ</a>` : ''}
                      ${r.approverNote ? `<p class="text-xs text-zinc-500 mt-1 bg-zinc-50 px-3 py-1.5 rounded-lg border"><i class="fa-solid fa-comment mr-1 text-zinc-400"></i>${r.approverNote}</p>` : ''}
                    </div>
                    ${isPending ? `
                    <div class="flex lg:flex-col gap-2 shrink-0 justify-end">
                      <button onclick="openActionModal('${r.id}','approve')"
                        class="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all uppercase tracking-widest shadow-sm">
                        <i class="fa-solid fa-check"></i> อนุมัติ
                      </button>
                      <button onclick="openActionModal('${r.id}','reject')"
                        class="inline-flex items-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border-2 border-red-200 hover:border-red-500 font-black px-5 py-2.5 rounded-xl text-xs transition-all uppercase tracking-widest">
                        <i class="fa-solid fa-xmark"></i> ไม่อนุมัติ
                      </button>
                    </div>` : r.status === 'approved' ? `
                    <div class="flex lg:flex-col gap-2 shrink-0 justify-end items-end">
                      <div class="text-right">
                        <p class="text-[10px] text-zinc-400 font-bold uppercase">อนุมัติโดย</p>
                        <p class="text-xs font-bold text-zinc-600">${r.approvedBy || '-'}</p>
                        <p class="text-[10px] text-zinc-400">${r.approvedAt ? fmtDate(r.approvedAt) : ''}</p>
                      </div>
                      <button onclick="mgrCancelLeave('${r.id}')"
                        class="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white border-2 border-orange-200 hover:border-orange-500 font-black px-4 py-2 rounded-xl text-[10px] transition-all uppercase tracking-widest">
                        <i class="fa-solid fa-rotate-left"></i> ยกเลิก (คืนสิทธิ์)
                      </button>
                    </div>` : `
                    <div class="shrink-0 text-right">
                      <p class="text-[10px] text-zinc-400 font-bold uppercase">ดำเนินการโดย</p>
                      <p class="text-xs font-bold text-zinc-600">${r.approvedBy || '-'}</p>
                      <p class="text-[10px] text-zinc-400">${r.approvedAt ? fmtDate(r.approvedAt) : ''}</p>
                    </div>`}
                  </div>
                </div>`;
            }).join('');
        }

        window.openActionModal = async (id, action) => {
            const r = allRequests.find(x => x.id === id);
            if (!r) return;
            pendingAction = { id, action };
            const isApprove = action === 'approve';
            const header = document.getElementById('action-modal-header');
            if (header) header.className = `px-8 py-5 ${isApprove ? 'bg-green-600' : 'bg-red-600'}`;
            const title = document.getElementById('action-modal-title');
            if (title) title.textContent = isApprove ? '✅ อนุมัติคำขอลา' : '❌ ไม่อนุมัติคำขอลา';
            const sub = document.getElementById('action-modal-sub');
            if (sub) sub.textContent = isApprove ? 'Approve Leave Request' : 'Reject Leave Request';

            const box = document.getElementById('action-detail-box');
            if (box) {
                // แสดง detail เบื้องต้นก่อน
                const sched = scheduleCache[r.uid] || null;
                const reqHrsDisplay = dispHoursForReq(r);
                box.innerHTML = `
                    <div class="flex justify-between"><span class="text-zinc-400">พนักงาน</span><span class="font-bold">${r.employeeName}</span></div>
                    <div class="flex justify-between"><span class="text-zinc-400">ประเภท</span><span class="font-bold">${r.typeName}</span></div>
                    <div class="flex justify-between"><span class="text-zinc-400">วันที่</span><span class="font-bold">${fmtDate(r.startDate)}${r.startDate !== r.endDate ? ' – '+fmtDate(r.endDate) : ''}</span></div>
                    <div class="flex justify-between"><span class="text-zinc-400">จำนวนที่ขอ</span><span class="font-bold text-yellow-600">${reqHrsDisplay}</span></div>
                    <div id="quota-loading" class="text-center py-2 text-zinc-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังโหลดโควต้า...</div>`;

                // โหลด balance แบบ async แล้วอัปเดต
                try {
                    const bal  = await getEmpBalance(r.uid);
                    const hpd  = sched ? getDayWorkHours(sched) : 8;
                    const tid  = r.type;
                    const isTrackable = ['sick','personal','vacation'].includes(tid);
                    const loadingEl = document.getElementById('quota-loading');
                    if (!loadingEl) return; // modal ปิดไปแล้ว

                    if (isTrackable) {
                        const b       = bal[tid] || {};
                        const totalH  = b.totalHours != null ? b.totalHours : (getLeaveTypeInfo(tid).maxDays * hpd);
                        const usedH   = b.usedHours  || 0;
                        const remH    = Math.max(0, totalH - usedH);
                        const reqH    = r.totalHours || 0;
                        const afterH  = Math.max(0, remH - reqH);
                        const pct     = totalH > 0 ? Math.min(100, Math.round(usedH/totalH*100)) : 0;
                        const willExceed = reqH > remH;
                        const barColor   = willExceed ? 'bg-red-400' : pct > 80 ? 'bg-orange-400' : 'bg-green-400';

                        loadingEl.outerHTML = `
                            <div class="mt-2 pt-2 border-t border-zinc-200 space-y-1.5">
                              <p class="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">โควต้า${r.typeName}</p>
                              <div class="flex justify-between text-xs">
                                <span class="text-zinc-500">ใช้ไปแล้ว</span>
                                <span class="font-bold">${balanceToDisplay(usedH, sched)}</span>
                              </div>
                              <div class="flex justify-between text-xs">
                                <span class="text-zinc-500">คงเหลือก่อนอนุมัติ</span>
                                <span class="font-bold ${willExceed ? 'text-red-600' : 'text-green-600'}">${balanceToDisplay(remH, sched)}</span>
                              </div>
                              <div class="w-full bg-zinc-200 rounded-full h-1.5 my-1">
                                <div class="h-1.5 rounded-full ${barColor} transition-all" style="width:${pct}%"></div>
                              </div>
                              <div class="flex justify-between text-xs">
                                <span class="text-zinc-500">หลังอนุมัติจะเหลือ</span>
                                <span class="font-black ${willExceed ? 'text-red-600' : 'text-zinc-800'}">${balanceToDisplay(afterH, sched)}</span>
                              </div>
                              ${willExceed ? `<div class="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
                                <p class="text-xs text-red-700 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>โควต้าไม่พอ! ขาดอีก ${balanceToDisplay(reqH - remH, sched)}</p>
                              </div>` : ''}
                            </div>`;
                    } else {
                        loadingEl.outerHTML = `<p class="text-xs text-zinc-400 text-center pt-1">ประเภทนี้ไม่นับโควต้า</p>`;
                    }
                } catch(e) {
                    const loadingEl = document.getElementById('quota-loading');
                    if (loadingEl) loadingEl.outerHTML = `<p class="text-xs text-red-400 text-center pt-1">โหลดโควต้าไม่ได้</p>`;
                }
            }

            const btn = document.getElementById('action-confirm-btn');
            if (btn) {
                btn.className = `flex-1 py-3 font-black rounded-xl transition-all text-sm text-white ${isApprove ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'}`;
                btn.textContent = isApprove ? 'ยืนยันการอนุมัติ' : 'ยืนยันการไม่อนุมัติ';
            }
            document.getElementById('action-note').value = '';
            document.getElementById('action-modal')?.classList.remove('hidden');
        };

        window.closeActionModal = () => {
            document.getElementById('action-modal')?.classList.add('hidden');
            pendingAction = null;
        };

        window.confirmAction = async () => {
            if (!pendingAction) return;
            const { id, action } = pendingAction;
            const note = document.getElementById('action-note')?.value.trim();
            const btn = document.getElementById('action-confirm-btn');
            btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
            try {
                const r = allRequests.find(x => x.id === id);
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests', id), {
                    status: action === 'approve' ? 'approved' : 'rejected',
                    approvedBy: profile.name,
                    approvedAt: new Date().toISOString(),
                    approverNote: note || '',
                });
                if (action === 'approve' && r) {
                    const tid = r.type;
                    if (['sick','personal','vacation','maternity','ordain','military'].includes(tid)) {
                        const balRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', r.uid);
                        const balSnap = await getDoc(balRef);
                        const bal = balSnap.exists() ? balSnap.data() : {};
                        const prev = (bal[tid]?.usedHours) || 0;
                        const newUsed = Math.round((prev + (r.totalHours || 0)) * 100) / 100;
                        // ใช้ dotted path เพื่อ update แค่ usedHours ไม่แตะ totalHours
                        if (balSnap.exists()) {
                            await updateDoc(balRef, { [`${tid}.usedHours`]: newUsed });
                        } else {
                            // doc ยังไม่มี — สร้างใหม่ โดยใช้ hpd จาก schedule จริง
                            const empSched2 = scheduleCache[r.uid] || { workStart:'08:00', workEnd:'17:00', breakMinutes:60 };
                            const hpd2 = getDayWorkHours(empSched2);
                            const defaultTotal = Math.round(getLeaveTypeInfo(tid).maxDays * hpd2 * 100) / 100;
                            await setDoc(balRef, { [tid]: { totalHours: defaultTotal, usedHours: newUsed } }, { merge: true });
                        }
                        invalidateBalance(r.uid);
                    }
                }
                showToast(action === 'approve' ? '✅ อนุมัติคำขอลาแล้ว' : '❌ ไม่อนุมัติคำขอลา', action === 'approve' ? 'success' : 'info');
                // แจ้งพนักงานผ่าน LINE
                if (r) notifyEmployeeLeaveResult(r, action, profile.name, note).catch(()=>{});
                closeActionModal();
            } catch (e) { showToast('❌ ' + e.message, 'error'); }
            finally { btn.disabled = false; }
        };

        // แก้: ย้าย mgrCancelLeave ออกจาก return cleanup มาไว้ที่นี่
        // ให้ถูก register เป็น window function ได้ทันทีตอน init
        window.mgrCancelLeave = async (id) => {
            const r = allRequests.find(x => x.id === id);
            if (!r) return;
            if (!confirm(`ยกเลิกการลาของ "${r.employeeName}" และคืนสิทธิ์ ${r.totalHours} ชม. ใช่หรือไม่?`)) return;
            try {
                await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_requests', id), {
                    status: 'cancelled',
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: profile.name,
                    cancelNote: 'ยกเลิกโดยหัวหน้า'
                });
                const leaveKey = ['sick','personal','vacation'].includes(r.type) ? r.type : null;
                if (leaveKey && r.totalHours > 0) {
                    const balRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leave_balances', r.uid);
                    const bs = await getDoc(balRef);
                    if (bs.exists()) {
                        const bal = bs.data();
                        const newUsed = Math.max(0, (bal[leaveKey]?.usedHours || 0) - r.totalHours);
                        await updateDoc(balRef, { [leaveKey + '.usedHours']: newUsed });
                    }
                }
                invalidateBalance(r.uid);
                showToast('✅ ยกเลิกการลาและคืนสิทธิ์แล้ว', 'success');
            } catch(e) { showToast('❌ ' + e.message, 'error'); }
        };

        function fmtDate(ds) {
            if (!ds) return '-';
            // รองรับทั้ง 'YYYY-MM-DD' และ full ISO timestamp จาก Firestore
            const d = ds.length === 10 ? new Date(ds+'T12:00:00+07:00') : new Date(ds);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
        }

        return () => {
            unsub();
            // แก้: เพิ่ม mgrCancelLeave เข้า cleanup ด้วย
            ['filterRequests','openActionModal','closeActionModal','confirmAction','mgrCancelLeave'].forEach(k => delete window[k]);
        };
    }
};
