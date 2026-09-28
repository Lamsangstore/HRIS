// ภาษีหัก ณ ที่จ่าย (ภ.ง.ด.1) แบบเดียวกับ PEAK Payroll
//
// หลักการ: ทุกงวดประมาณเงินได้ทั้งปีใหม่ → คิดภาษีทั้งปี → ลบภาษีที่หักไปแล้ว
// → เฉลี่ยส่วนที่เหลือตามจำนวนเดือนที่เหลือ (รวมเดือนนี้)
//
//   เงินได้ 40(1) = YTD + (เงินเดือน × n) + เงินเพิ่มเดือนนี้ − เงินหักเดือนนี้
//   ภาษีเดือนนี้  = (ภาษีทั้งปี − ภาษีที่หักแล้ว YTD) ÷ (เดือนที่หักภาษี − เดือนที่จ่ายแล้ว)
//
// เฉพาะ "เงินเดือน" ที่ถูกคูณ n — คอมมิชชั่น/OT/โบนัส บวกครั้งเดียว เหมือน PEAK
// ตัวเลขตรวจกับผลจริงของ PEAK งวด ก.ย. 2569 แล้ว — ดู tests/wht.test.mjs
//
// ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด ไม่แตะ Firestore/DOM

export const TAX_BRACKETS = [
    [150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15],
    [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35],
];

export const EXPENSE_RATE = 0.5;
export const EXPENSE_CAP = 100000;
export const PERSONAL_ALLOWANCE = 60000;

// ค่าลดหย่อนต่อปี — ชื่อช่องตามแท็บ "ข้อมูลค่าลดหย่อน" ของ PEAK
// socialSecurity = null/ว่าง → อัตโนมัติจากยอดหักประกันสังคมจริง (YTD + เดือนนี้ × n)
export const ALLOWANCE_FIELDS = [
    ['personal',        'ผู้มีเงินได้'],
    ['spouse',          'คู่สมรส'],
    ['parents',         'อุปการะเลี้ยงดูบิดามารดา'],
    ['children',        'บุตร'],
    ['lifeInsurance',   'เบี้ยประกันชีวิต'],
    ['healthInsurance', 'เบี้ยประกันสุขภาพ'],
    ['providentFund',   'เงินสะสมกองทุนสำรองเลี้ยงชีพ'],
    ['socialSecurity',  'เงินสมทบกองทุนประกันสังคม'],
    ['mutualFund',      'กองทุนรวม'],
    ['other',           'อื่นๆ'],
];

export const round2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
const num = v => Number(v) || 0;

/** ภาษีตามอัตราก้าวหน้า พร้อมรายละเอียดทีละขั้น (เฉพาะขั้นที่เงินได้ไปถึง) */
export function progressiveTax(netIncome) {
    let tax = 0, lower = 0;
    const breakdown = [];
    for (const [upper, rate] of TAX_BRACKETS) {
        const portion = Math.max(0, Math.min(netIncome, upper) - lower);
        const t = round2(portion * rate);
        breakdown.push({ from: lower, to: upper, rate, amount: round2(portion), tax: t });
        tax += t;
        if (netIncome <= upper) break;
        lower = upper;
    }
    return { tax: round2(tax), breakdown };
}

// ── แปลงใบเงินเดือนของเรา → รายการตามฐานภาษีของ PEAK ─────────────────────────
// ตรงกับคอลัมน์ที่ export ไป PEAK (prXLSX) และการตั้งค่ารายการใน PEAK ตอนนี้:
//   SAL  baseSalary        40(1) คูณ n
//   COM  earningCommission 40(1)
//   OT   earningHourly     40(1)
//   R004 earningDaily      40(1)
//   R003 otherEarning      40(1)
//   FN   deductLeave       40(1) → ลดเงินได้
//   STL  otherDeduct       40(1) → ลดเงินได้   (PEAK ตั้งไว้แบบนี้ จึงทำตามเพื่อให้ยอดตรงกัน)
//   WHT, SSF               ไม่รวม (ประกันสังคมไปอยู่ในค่าลดหย่อนแทน)
export function recordTaxLines(r) {
    return {
        salary: num(r.baseSalary),
        add401: num(r.earningCommission) + num(r.earningHourly) + num(r.earningDaily) + num(r.otherEarning),
        sub401: num(r.deductLeave) + num(r.otherDeduct),
        add402: 0,
        sub402: 0,
        sso:    num(r.deductSSO),
    };
}

/** เงินได้ 40(1) ที่ "จ่ายจริง" ของใบเงินเดือนหนึ่งใบ — ใช้รวมเป็น YTD */
export function recordIncome401(r) {
    const l = recordTaxLines(r);
    return round2(l.salary + l.add401 - l.sub401);
}

/**
 * ยอดสะสมตั้งแต่ต้นปีภาษี จากใบเงินเดือนของงวดที่ "สรุปแล้ว" ก่อนงวดนี้ + ยอดยกมา
 * opening = emp.taxOpening = { year, income401, income402, tax, sso, months }
 * ใช้ยอดยกมาเฉพาะเมื่อปีตรงกับปีภาษีของงวดนี้ (ขึ้นปีใหม่ = เริ่มนับ 0)
 */
export function buildYTD(pastRecords, opening, year) {
    const o = opening && num(opening.year) === num(year) ? opening : {};
    const ytd = {
        income401:   num(o.income401),
        income402:   num(o.income402),
        taxWithheld: num(o.tax),
        sso:         num(o.sso),
        monthsPaid:  num(o.months),
    };
    for (const r of pastRecords || []) {
        ytd.income401   += recordIncome401(r);
        ytd.taxWithheld += num(r.deductTax);
        ytd.sso         += num(r.deductSSO);
        ytd.monthsPaid  += 1;
    }
    for (const k of ['income401', 'income402', 'taxWithheld', 'sso']) ytd[k] = round2(ytd[k]);
    return ytd;
}

/**
 * จำนวนเดือนที่หักภาษีในปีนั้น — ปกติ 12
 * เข้างานกลางปี → นับตั้งแต่เดือนที่เข้า (เข้า ก.ค. = 6) ไม่งั้นระบบคิดว่ามีเดือนเหลือ
 * มากเกินจริงแล้วหักภาษีน้อยไป
 */
export function taxMonthsFor(startDate, year) {
    const m = /^(\d{4})-(\d{2})/.exec(startDate || '');
    if (!m || Number(m[1]) !== Number(year)) return 12;
    return 13 - Number(m[2]);
}

/** ค่าลดหย่อนที่ใช้จริง (ต่อปี) — คืนทั้งรายช่องและยอดรวม */
export function resolveAllowances(spec, ssoAuto) {
    const s = spec || {};
    const out = {};
    for (const [k] of ALLOWANCE_FIELDS) out[k] = num(s[k]);
    if (s.personal == null || s.personal === '') out.personal = PERSONAL_ALLOWANCE;
    const ssoIsAuto = s.socialSecurity == null || s.socialSecurity === '';
    if (ssoIsAuto) out.socialSecurity = round2(num(ssoAuto));
    const total = round2(Object.values(out).reduce((a, b) => a + b, 0));
    return { items: out, total, ssoAuto: ssoIsAuto };
}

/**
 * ภาษีหัก ณ ที่จ่ายของเดือนนี้
 *   lines      = recordTaxLines(ใบเงินเดือนงวดนี้)
 *   ytd        = buildYTD(...)
 *   taxMonths  = taxMonthsFor(...) (ปกติ 12)
 *   allowances = emp.taxAllowances (ค่าลดหย่อนต่อปี)
 * คืนตัวแปรทุกตัวไว้แสดงวิธีคิดแบบ PEAK และเก็บเป็น snapshot ในใบเงินเดือน
 */
export function calcMonthlyWHT({ lines, ytd, taxMonths = 12, allowances }) {
    const L = { salary: 0, add401: 0, sub401: 0, add402: 0, sub402: 0, sso: 0, ...lines };
    const Y = { income401: 0, income402: 0, taxWithheld: 0, sso: 0, monthsPaid: 0, ...ytd };
    // เดือนที่เหลือรวมเดือนนี้ — อย่างน้อย 1 เพื่อหักส่วนที่ค้างให้ครบในเดือนนี้
    const n = Math.max(1, num(taxMonths) - num(Y.monthsPaid));

    const income401 = round2(Y.income401 + L.salary * n + L.add401 - L.sub401);
    const income402 = round2(Y.income402 + L.add402 - L.sub402);
    const totalIncome = round2(income401 + income402);
    const expense = Math.min(round2(Math.max(0, totalIncome) * EXPENSE_RATE), EXPENSE_CAP);
    const afterExpense = round2(totalIncome - expense);

    const ssoAuto = Y.sso + L.sso * n;
    const allow = resolveAllowances(allowances, ssoAuto);
    const netIncome = round2(Math.max(0, afterExpense - allow.total));
    const { tax: annualTax, breakdown } = progressiveTax(netIncome);

    const monthly = round2((annualTax - Y.taxWithheld) / n);
    return {
        n, taxMonths: num(taxMonths), monthsPaid: num(Y.monthsPaid),
        ytd: Y, lines: L,
        income401, income402, totalIncome, expense, afterExpense,
        allowances: allow.items, allowanceTotal: allow.total, ssoAuto: allow.ssoAuto,
        netIncome, annualTax, breakdown,
        monthlyWHT: Math.max(0, monthly),
    };
}

/** ผลสรุปที่เก็บลงใบเงินเดือน (ตัด breakdown ที่มี Infinity ออก — Firestore/JSON เก็บไม่ได้) */
export function whtSummary(res) {
    if (!res) return null;
    const pick = ['n', 'taxMonths', 'monthsPaid', 'income401', 'income402', 'totalIncome', 'expense',
        'afterExpense', 'allowanceTotal', 'netIncome', 'annualTax', 'monthlyWHT'];
    const out = Object.fromEntries(pick.map(k => [k, res[k]]));
    out.ytd = { ...res.ytd };
    out.allowances = { ...res.allowances };
    return out;
}
