// เงินสมทบประกันสังคม ม.33 (ฝั่งลูกจ้าง 5%)
//
// เพดานค่าจ้างปรับขึ้นเป็นระยะตามโรดแมปสำนักงานประกันสังคม
// ใช้วันที่ของงวด (วันสิ้นงวด) เลือกเพดาน → งวดเก่าคำนวณใหม่ได้ยอดเดิม
//   ก่อน 2569        เพดาน 15,000 → สูงสุด 750
//   2569–2571        เพดาน 17,500 → สูงสุด 875
//   2572–2574        เพดาน 20,000 → สูงสุด 1,000
//   2575 เป็นต้นไป    เพดาน 23,000 → สูงสุด 1,150
export const SSO_RATE = 0.05;

export const SSO_WAGE_CEILINGS = [
    { from: '',           ceiling: 15000 },
    { from: '2026-01-01', ceiling: 17500 },
    { from: '2029-01-01', ceiling: 20000 },
    { from: '2032-01-01', ceiling: 23000 },
];

// date = 'YYYY-MM-DD' (ค.ศ.) — ว่าง/ไม่ระบุ = ใช้เพดานล่าสุดที่มีผลวันนี้
export function ssoWageCeiling(date) {
    const d = date || new Date().toISOString().slice(0, 10);
    let c = SSO_WAGE_CEILINGS[0].ceiling;
    for (const s of SSO_WAGE_CEILINGS) if (d >= s.from) c = s.ceiling;
    return c;
}

export function calcSSO(wage, date) {
    const w = Math.max(0, Number(wage) || 0);
    return Math.round(Math.min(w, ssoWageCeiling(date)) * SSO_RATE);
}
