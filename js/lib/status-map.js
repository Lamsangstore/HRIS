// สถานะของใบลา/คำขอ — ป้ายสีและไอคอนที่ใช้ร่วมกันทุกหน้า
// ต้องเป็นชุดเดียวกัน ไม่งั้นสถานะเดียวกันจะขึ้นคนละสีคนละคำในแต่ละหน้า

export const STATUS_MAP = {
    pending:   { label: 'รอการอนุมัติ', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-200', icon: 'fa-clock'        },
    approved:  { label: 'อนุมัติแล้ว',  badge: 'bg-green-100 text-green-800 border border-green-200',   icon: 'fa-circle-check' },
    rejected:  { label: 'ไม่อนุมัติ',   badge: 'bg-red-100 text-red-700 border border-red-200',         icon: 'fa-circle-xmark' },
    cancelled: { label: 'ยกเลิก',        badge: 'bg-zinc-100 text-zinc-600 border border-zinc-200',       icon: 'fa-ban'          },
};
