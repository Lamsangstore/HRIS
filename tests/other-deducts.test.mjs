// หักอื่นๆ ประจำ (otherDeducts) — ฟอร์มพนักงาน + ใบเงินเดือน
import { JSDOM } from 'jsdom';
import { slice, makeChecker } from './extract.mjs';

const check = makeChecker();

// ── ฝั่งฟอร์มพนักงาน ─────────────────────────────────────────────────────────
{
    const code = slice('// ── หักอื่นๆ ประจำ (otherDeducts)', '// preview รูปเมื่อเลือกไฟล์');
    const w = new JSDOM(`<div id="f-od-list"></div><span id="f-od-total"></span>`,
                        { runScripts: 'outside-only' }).window;
    w.eval(code);

    w.empRenderOtherDeducts([{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}]);
    check('โหลดรายการหักประจำของพนักงานมาแสดงครบ',
          w.empReadOtherDeducts(), [{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}]);
    check('รวมยอดถูกต้อง', w.document.getElementById('f-od-total').textContent, '฿1,140.00');

    w.empAddOtherDeduct();
    check('กดเพิ่ม → มีแถวใหม่บนจอ', w.empReadOtherDeductRows().length, 3);
    check('แถวว่างไม่ถูกบันทึกลงฐานข้อมูล', w.empReadOtherDeducts().length, 2);

    // เคยพัง: ปุ่มลบใช้ index จากตัวอ่านที่กรองแถวว่างทิ้ง ทำให้ลบผิดแถว
    w.empRemoveOtherDeduct(0);
    check('ลบแถวแรกได้ถูกตัว แม้มีแถวว่างคั่นอยู่', w.empReadOtherDeducts(), [{label:'เงินกู้',amount:940}]);

    w.empRenderOtherDeducts([]);
    check('ไม่มีรายการ → บันทึกเป็น array ว่าง', w.empReadOtherDeducts(), []);
    check('ไม่มีรายการ → ยอดรวม 0', w.document.getElementById('f-od-total').textContent, '฿0.00');

    w.empRenderOtherDeducts([{label:'ค่า "พิเศษ" x', amount:50}]);
    check('ชื่อรายการมี quote แล้ว markup ไม่พัง', w.empReadOtherDeducts(), [{label:'ค่า "พิเศษ" x',amount:50}]);

    w.empRenderOtherDeducts([{label:'a',amount:33.33},{label:'b',amount:66.67}]);
    check('ทศนิยมรวมแล้วไม่เพี้ยน', w.document.getElementById('f-od-total').textContent, '฿100.00');
}

// ── ฝั่งใบเงินเดือน ──────────────────────────────────────────────────────────
{
    const code = slice('// ── รายการหักอื่นๆ ในใบเงินเดือน', 'window.prRecalc = ');
    const w = new JSDOM(`<div id="pr-od-list"></div>`, { runScripts: 'outside-only' }).window;
    w.sEl = (id) => w.document.getElementById(id);
    w.prRecalc = () => {};   // ทดสอบเฉพาะการจัดการรายการ ไม่รวมการคำนวณเงิน
    w.eval(code);
    const html = () => w.document.getElementById('pr-od-list').innerHTML;

    w.prOdRender([{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}], true);
    check('งวด draft: โหลด snapshot มาครบ', w.prOdRows(), [{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}]);
    check('งวด draft: มีปุ่มลบ', /prOdRemove\(/.test(html()), true);
    check('งวด draft: ช่องกรอกไม่ถูกล็อก', /readonly/.test(html()), false);

    w.prOdAdd();
    check('งวด draft: เพิ่มรายการเฉพาะงวดนี้ได้', w.prOdRows().length, 3);
    w.prOdRemove(1);
    check('งวด draft: ลบรายการที่ 2 ได้ถูกตัว', w.prOdRows().map(r => r.label), ['ค่าชุดฟอร์ม','']);

    w.prOdRender([{label:'เงินกู้',amount:940}], false);
    check('งวดที่ปิดแล้ว: ช่องถูกล็อก readonly', /readonly/.test(html()), true);
    check('งวดที่ปิดแล้ว: ไม่มีปุ่มลบ', /prOdRemove\(/.test(html()), false);
}

// ── ใบเก่าที่มีแต่ยอดรวม ยังไม่มีรายการย่อย ──────────────────────────────────
// เคยพัง: เปิดใบเก่าแล้ว prRecalc รวมจาก list ว่างได้ 0 ทับยอดเดิมทิ้ง
// (ใบของ ฟาง งวด 6/2026 หักอื่นๆ 1,140 → รวมหักเพี้ยนจาก 1,765 เหลือ 625)
{
    const snippet = slice('// ใบเก่าที่บันทึกก่อนมีรายการย่อย', 'prOdRender(odInit, isDraft);');
    const odInit = (r) => new Function('r', snippet + '; return odInit;')(r);

    check('ใบเก่ามียอด 1140 ไม่มีรายการย่อย → กู้ยอดกลับมาเป็น 1 รายการ',
          odInit({otherDeduct: 1140}), [{label:'หักอื่นๆ', amount:1140}]);
    check('ใบใหม่ที่มีรายการย่อยแล้ว → ใช้ของเดิม ไม่แตะ',
          odInit({otherDeduct:1140, otherDeductItems:[{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}]}),
          [{label:'ค่าชุดฟอร์ม',amount:200},{label:'เงินกู้',amount:940}]);
    check('ใบที่ไม่มีหักอื่นๆ เลย → list ว่าง', odInit({otherDeduct: 0}), []);
    check('ใบเก่าที่ไม่มี field นี้เลย → list ว่าง', odInit({}), []);
    check('มี array ว่าง + มียอด → กู้ยอดกลับ', odInit({otherDeduct:500, otherDeductItems:[]}), [{label:'หักอื่นๆ',amount:500}]);
    check('ยอดเก็บมาเป็น string → แปลงเป็นตัวเลข', odInit({otherDeduct:'1140'}), [{label:'หักอื่นๆ',amount:1140}]);

    const dOther = odInit({otherDeduct:1140}).reduce((s,it) => s + it.amount, 0);
    check('รวมหัก = ประกันสังคม 625 + หักอื่นๆ 1140 ต้องได้ 1765 ตรงกับหน้ารายการ', 625 + dOther, 1765);
}

check.done('หักอื่นๆ');
