// เกณฑ์ประเมินผลงาน — ใช้ร่วมกันระหว่างหน้า my-review (พนักงานประเมินตัวเอง)
// และ review-admin (หัวหน้าให้คะแนน) ทั้งสองหน้าต้องเห็นเกณฑ์ชุดเดียวกัน

export const REVIEW_DIMENSIONS = [
    {
        id: 'performance',
        name: 'ผลงานและความสำเร็จของงาน',
        nameEn: 'Performance & Deliverables',
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        items: [
            { id: 'quality',   name: 'คุณภาพของงาน',                desc: 'ความถูกต้อง แม่นยำ ประณีต และเรียบร้อยของงานที่ได้รับมอบหมาย' },
            { id: 'quantity',  name: 'ปริมาณงานและความตรงต่อเวลา',  desc: 'ส่งมอบงานได้ตามจำนวนและเสร็จทันกำหนด (Deadline)' },
            { id: 'goals',     name: 'การบรรลุเป้าหมาย',             desc: 'ผลงานจริงเทียบกับ KPIs/OKRs ที่ตกลงกันไว้' },
        ]
    },
    {
        id: 'skills',
        name: 'ทักษะและความเชี่ยวชาญในหน้าที่',
        nameEn: 'Job Knowledge & Skills',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        items: [
            { id: 'knowledge',     name: 'ความรู้ในงานที่ทำ',                       desc: 'เข้าใจกระบวนการ ระบบงาน เครื่องมือ หรือเทคโนโลยีที่ต้องใช้' },
            { id: 'problemSolving', name: 'ทักษะการแก้ปัญหาและการตัดสินใจ',         desc: 'รับมือปัญหาเฉพาะหน้า วิเคราะห์สาเหตุ และหาทางแก้ได้อย่างมีประสิทธิภาพ' },
            { id: 'improvement',    name: 'การปรับปรุงและพัฒนากระบวนการทำงาน',     desc: 'คิดค้นวิธีทำงานใหม่ที่ช่วยลดเวลา ลดต้นทุน หรือเพิ่มประสิทธิภาพ' },
        ]
    },
    {
        id: 'behavior',
        name: 'พฤติกรรมและการทำงานร่วมกับผู้อื่น',
        nameEn: 'Core Values & Collaboration',
        color: 'bg-green-50 border-green-200 text-green-800',
        items: [
            { id: 'teamwork',      name: 'การทำงานเป็นทีมและความร่วมมือ',  desc: 'สนับสนุนเพื่อนร่วมทีม ประสานงานข้ามแผนก เปิดใจรับฟัง' },
            { id: 'communication', name: 'การสื่อสาร',                    desc: 'ชัดเจนในการถ่ายทอดข้อมูล พูด เขียน ประสานงานไม่ทำให้เข้าใจผิด' },
            { id: 'discipline',    name: 'ความรับผิดชอบและวินัยในการทำงาน', desc: 'ตรงต่อเวลา ปฏิบัติตามกฎ ใส่ใจหน้าที่โดยไม่ต้องให้ควบคุมตลอด' },
            { id: 'attitude',      name: 'ทัศนคติและความยืดหยุ่น',         desc: 'เปิดรับสิ่งใหม่ พร้อมเรียนรู้ รับมือกับภาวะกดดันได้ดี' },
        ]
    },
    {
        id: 'management',
        name: 'ทักษะการบริหารจัดการ',
        nameEn: 'Management Skills',
        color: 'bg-purple-50 border-purple-200 text-purple-800',
        managerOnly: true,
        items: [
            { id: 'leadership',  name: 'ความเป็นผู้นำ',                          desc: 'สร้างแรงจูงใจ ผลักดัน และนำทีมไปสู่เป้าหมาย' },
            { id: 'delegation',  name: 'การบริหารจัดการและกระจายงาน',           desc: 'วางแผนงาน จัดลำดับความสำคัญ มอบหมายงานตามศักยภาพ' },
            { id: 'development', name: 'การพัฒนาผู้ใต้บังคับบัญชา',              desc: 'สอนงาน (Coaching) ให้ Feedback สนับสนุนทีมเติบโต' },
        ]
    },
];

// รายชื่อหัวข้อประเมินแบบแบน — ใช้กับ review เก่าที่ยังไม่มีฟิลด์ criteria
export const REVIEW_DEFAULT_CRITERIA = REVIEW_DIMENSIONS.flatMap(dim => dim.items.map(it => it.name));
