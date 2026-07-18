// ประเภทการลา + สีของแต่ละประเภท
//
// maxDays คือค่า default ของบริษัท ไม่ใช่สิทธิ์จริงของพนักงานคนไหน
// สิทธิ์จริงอยู่ที่ leave_balances/{uid}.<type>.totalHours ซึ่ง admin แก้รายคนได้
// อย่าเอา maxDays ไปแสดงเป็นสิทธิ์ตรงๆ (เคยพลาดมาแล้ว — modal บอก 10 วัน
// ทั้งที่การ์ดบอก 15 วัน เพราะอ่านคนละแหล่ง)

export const LEAVE_TYPES = [
    { id: 'sick',      label: 'ลาป่วย',                   icon: 'fa-kit-medical',      color: 'red',    maxDays: 30 },
    { id: 'personal',  label: 'ลากิจ',                    icon: 'fa-briefcase',         color: 'blue',   maxDays: 6  },
    { id: 'vacation',  label: 'ลาพักร้อน',                icon: 'fa-umbrella-beach',    color: 'green',  maxDays: 10 },
    { id: 'maternity', label: 'ลาคลอด',                   icon: 'fa-baby',              color: 'pink',   maxDays: 98 },
    { id: 'ordain',    label: 'ลาบวช',                    icon: 'fa-om',                color: 'orange', maxDays: 15 },
    { id: 'military',  label: 'ลาเพื่อรับราชการทหาร',     icon: 'fa-shield-halved',     color: 'slate',  maxDays: 60 },
    { id: 'other',     label: 'อื่นๆ',                    icon: 'fa-ellipsis',          color: 'zinc',   maxDays: 0  },
];
export function getLeaveTypeInfo(id) { return LEAVE_TYPES.find(t => t.id === id) || LEAVE_TYPES[LEAVE_TYPES.length - 1]; }
export function colorVariants(color) {
    const map = {
        red:    { bg:'bg-red-100',    text:'text-red-700',    badge:'bg-red-100 text-red-700'     },
        blue:   { bg:'bg-blue-100',   text:'text-blue-700',   badge:'bg-blue-100 text-blue-700'   },
        green:  { bg:'bg-green-100',  text:'text-green-700',  badge:'bg-green-100 text-green-700' },
        pink:   { bg:'bg-pink-100',   text:'text-pink-700',   badge:'bg-pink-100 text-pink-700'   },
        orange: { bg:'bg-orange-100', text:'text-orange-700', badge:'bg-orange-100 text-orange-700'},
        slate:  { bg:'bg-slate-100',  text:'text-slate-700',  badge:'bg-slate-100 text-slate-700' },
        zinc:   { bg:'bg-zinc-100',   text:'text-zinc-700',   badge:'bg-zinc-100 text-zinc-700'   },
        yellow: { bg:'bg-yellow-100', text:'text-yellow-700', badge:'bg-yellow-100 text-yellow-700'},
    };
    return map[color] || map.zinc;
}
