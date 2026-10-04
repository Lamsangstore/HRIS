// สถานะของใบลา/คำขอ — ป้ายสีและไอคอนที่ใช้ร่วมกันทุกหน้า
// ต้องเป็นชุดเดียวกัน ไม่งั้นสถานะเดียวกันจะขึ้นคนละสีคนละคำในแต่ละหน้า

export const STATUS_MAP = {
    pending:   { label: 'รอการอนุมัติ', badge: 'bg-amber-100 text-amber-800 border border-amber-200', icon: 'fa-clock'        },
    approved:  { label: 'อนุมัติแล้ว',  badge: 'bg-green-100 text-green-800 border border-green-200',   icon: 'fa-circle-check' },
    rejected:  { label: 'ไม่อนุมัติ',   badge: 'bg-red-100 text-red-700 border border-red-200',         icon: 'fa-circle-xmark' },
    cancelled: { label: 'ยกเลิก',        badge: 'bg-slate-100 text-slate-600 border border-slate-200',       icon: 'fa-ban'          },
};
