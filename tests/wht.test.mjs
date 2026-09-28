// ภาษีหัก ณ ที่จ่ายแบบ PEAK — ตัวเลขทุกเคสมาจากผลจริงของ PEAK Payroll งวด ก.ย. 2569
// ถ้าเทสต์นี้พัง = ยอดภาษีในใบเงินเดือนเราจะไม่ตรงกับ PEAK
import {
    calcMonthlyWHT, progressiveTax, recordTaxLines, recordIncome401,
    buildYTD, taxMonthsFor, resolveAllowances,
} from '../js/lib/wht.js';
import { makeChecker } from './extract.mjs';

const check = makeChecker();

// ── A: GM00001 — ไม่มีประกันสังคม มีภาษี ──────────────────────────────────────
{
    const r = calcMonthlyWHT({
        lines: recordTaxLines({ baseSalary: 51906 }),
        ytd: { income401: 240000, taxWithheld: 1666.71, monthsPaid: 8 },
        taxMonths: 12,
        allowances: { personal: 60000, socialSecurity: 0 },
    });
    check('A: n = 12 − 8 = 4', r.n, 4);
    check('A: เงินได้ 40(1) = 240,000 + 51,906 × 4', r.income401, 447624);
    check('A: ค่าใช้จ่ายชนเพดาน 100,000', r.expense, 100000);
    check('A: เงินได้สุทธิ', r.netIncome, 287624);
    check('A: ภาษีทั้งปี', r.annualTax, 6881.2);
    check('A: ภาษีเดือนนี้ = (6,881.20 − 1,666.71) ÷ 4', r.monthlyWHT, 1303.62);
}

// ── B: MK00001 ─────────────────────────────────────────────────────────────
{
    const r = calcMonthlyWHT({
        lines: recordTaxLines({ baseSalary: 48094 }),
        ytd: { income401: 240000, taxWithheld: 1666.71, monthsPaid: 8 },
        allowances: { socialSecurity: 0 },   // ผู้มีเงินได้ว่าง → 60,000 อัตโนมัติ
    });
    check('B: เงินได้สุทธิ', r.netIncome, 272376);
    check('B: ภาษีทั้งปี', r.annualTax, 6118.8);
    check('B: ภาษีเดือนนี้', r.monthlyWHT, 1113.02);
}

// ── C: AC00001 — มีคอมมิชชั่น + กยศ. + ประกันสังคม ไม่เสียภาษี ────────────────
{
    const rec = { baseSalary: 15183, earningCommission: 1311.40, otherDeduct: 1140, deductSSO: 750 };
    const base = { lines: recordTaxLines(rec), ytd: { income401: 96119.02, taxWithheld: 0, monthsPaid: 8 } };

    const fixed = calcMonthlyWHT({ ...base, allowances: { personal: 60000, socialSecurity: 9000 } });
    check('C: คอมมิชชั่นบวกครั้งเดียว กยศ.ลดเงินได้', fixed.income401, 157022.42);
    check('C: ค่าใช้จ่าย 50% ไม่ถึงเพดาน', fixed.expense, 78511.21);
    check('C: ค่าลดหย่อน 60,000 + ประกันสังคม 9,000', fixed.allowanceTotal, 69000);
    check('C: เงินได้สุทธิ', fixed.netIncome, 9511.21);
    check('C: ไม่เสียภาษี', fixed.monthlyWHT, 0);

    // ประกันสังคมอัตโนมัติ: หักจริงสะสม 8 × 750 + 750 × 4 = 9,000 เท่ากับที่ PEAK กรอกไว้
    const auto = calcMonthlyWHT({ ...base, ytd: { ...base.ytd, sso: 6000 }, allowances: {} });
    check('C: ประกันสังคมอัตโนมัติได้ 9,000 เท่า PEAK', auto.allowances.socialSecurity, 9000);
    check('C: เงินได้สุทธิเท่ากันทั้งสองแบบ', auto.netIncome, 9511.21);
}

// ── อัตราก้าวหน้า ─────────────────────────────────────────────────────────────
check('เงินได้สุทธิ ≤ 150,000 ยกเว้น', progressiveTax(150000).tax, 0);
check('500,000 → 27,500', progressiveTax(500000).tax, 27500);
check('1,000,000 → 115,000', progressiveTax(1000000).tax, 115000);
check('6,000,000 → 1,265,000 + 35% ของ 1,000,000', progressiveTax(6000000).tax, 1615000);

// ── หักเกินไปแล้ว → เดือนนี้ 0 ไม่คืนผ่านเงินเดือน ─────────────────────────────
check('ภาษีติดลบ → 0', calcMonthlyWHT({
    lines: { salary: 20000 }, ytd: { income401: 160000, taxWithheld: 5000, monthsPaid: 8 },
}).monthlyWHT, 0);

// ── ธ.ค. หรือเดือนเกิน → n ไม่ต่ำกว่า 1 หักส่วนค้างให้ครบ ─────────────────────
check('จ่ายครบ 12 เดือนแล้ว → n = 1', calcMonthlyWHT({
    lines: { salary: 50000 }, ytd: { income401: 550000, monthsPaid: 12 },
}).n, 1);

// ── YTD ──────────────────────────────────────────────────────────────────────
check('เงินได้ใบเงินเดือน = เงินเดือน + เพิ่ม − ค่าปรับ − หักอื่นๆ',
      recordIncome401({ baseSalary: 15000, earningHourly: 500, otherEarning: 1000, deductLeave: 200, otherDeduct: 300, deductSSO: 750 }),
      16000);
{
    const ytd = buildYTD(
        [{ baseSalary: 30000, deductTax: 200, deductSSO: 750 }, { baseSalary: 30000, deductTax: 210.5, deductSSO: 750 }],
        { year: 2026, income401: 150000, tax: 1000, sso: 3750, months: 5 }, 2026);
    check('YTD = ยอดยกมา + งวดที่สรุปแล้ว', ytd,
          { income401: 210000, income402: 0, taxWithheld: 1410.5, sso: 5250, monthsPaid: 7 });
    check('ยอดยกมาคนละปี → ไม่นับ',
          buildYTD([], { year: 2025, income401: 150000, months: 5 }, 2026).monthsPaid, 0);
}

// ── เข้างานกลางปี ─────────────────────────────────────────────────────────────
check('เข้างานปีก่อน → 12 เดือน', taxMonthsFor('2024-03-01', 2026), 12);
check('เข้างาน ก.ค. ปีนี้ → 6 เดือน', taxMonthsFor('2026-07-15', 2026), 6);
check('ไม่มีวันเริ่มงาน → 12 เดือน', taxMonthsFor('', 2026), 12);

// ── ค่าลดหย่อน ───────────────────────────────────────────────────────────────
check('ไม่กรอกอะไรเลย → ผู้มีเงินได้ 60,000 + ประกันสังคมอัตโนมัติ',
      resolveAllowances(undefined, 9000).total, 69000);
check('กรอกประกันสังคมเอง → ใช้ตัวเลขที่กรอก',
      resolveAllowances({ socialSecurity: 5000, lifeInsurance: 10000 }, 9000).total, 75000);

check.done('WHT แบบ PEAK');
