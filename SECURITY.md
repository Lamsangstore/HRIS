# ความปลอดภัย — สิ่งที่ต้องทำด้วยมือ

โค้ดส่วนที่แก้ได้แก้แล้ว แต่เหลืออีก 3 อย่างที่ต้องทำในคอนโซล **ทำตามลำดับนี้**

---

## 1. Rotate LINE channel access token — ด่วนที่สุด

token เดิมเคย hardcode อยู่ใน `app.html` และ repo นี้เป็น **public** บน GitHub
ถือว่า**หลุดแล้ว** ใครก็เอาไปส่งข้อความในนาม LINE OA ของบริษัทได้

ลบออกจากโค้ดเฉยๆ ไม่พอ — token ยังอยู่ใน git history ย้อนกลับไปอ่านได้

1. LINE Developers Console → Messaging API → Channel access token → **Issue new / Revoke เดิม**
2. เอา token ใหม่ใส่ Firestore ที่:
   `artifacts/bizhris-phichit/public/data/app_config/line`
   ฟิลด์: `channelAccessToken` (string)
3. ทดสอบว่าแจ้งเตือน LINE ยังทำงาน

ถ้ายังไม่ได้ทำข้อ 2 ระบบจะขึ้น error ชัดเจนว่ายังไม่ได้ตั้งค่า (ไม่เงียบหาย)

## 2. เปลี่ยน repo เป็น private

GitHub → Settings → General → Danger Zone → Change visibility → Private

## 3. Deploy Firestore rules

**นี่คือด่านเดียวที่กันข้อมูลจริง** ตอนนี้ Email/Password provider เปิดอยู่ และ Firebase
API key อ่านได้จากหน้าเว็บ แปลว่า **คนนอกสมัครบัญชีเข้ามาในโปรเจกต์เองได้**
ถ้า rules ปัจจุบันเป็น `allow read, write: if request.auth != null` = คนแปลกหน้าอ่าน
เงินเดือน เลขบัตรประชาชน และเลขบัญชีธนาคารของพนักงานทุกคนได้

```bash
npx firebase login
npx firebase deploy --only firestore:rules --project hris-21093
```

ก่อน deploy จริง ลองที่ Firebase Console → Firestore → Rules → **Playground** ก่อน
และดูรายละเอียดในหัวไฟล์ [`firestore.rules`](firestore.rules)

**ผลข้างเคียงที่ต้องรู้ก่อน deploy:** แจ้งเตือน LINE ตอนพนักงานยื่นใบลา / ตอกบัตร
นอกพื้นที่ จะหยุดทำงาน เพราะโค้ดต้องอ่าน `users` ทั้ง collection จากเบราว์เซอร์
พนักงานเพื่อหา LINE ID ของหัวหน้า ซึ่ง rules ใหม่บล็อกไว้ (ใบลายังส่งได้ปกติ
หัวหน้ายังเห็นในแอป แค่ไม่มี LINE เด้ง) แก้ได้ด้วยข้อ 4

---

## 4. ยังเหลือ: ย้าย LINE ไป Cloud Function

ตอนนี้เบราว์เซอร์พนักงานเป็นคนยิง LINE เอง เครื่องเขาจึงต้องอ่าน token ได้
=> **พนักงานที่เปิด DevTools ยังก๊อป token ไปได้อยู่** การย้ายมา Firestore แค่ปิดรู
ที่หลุดสู่ GitHub สาธารณะ ยังไม่ได้แก้ที่ต้นเหตุ

ย้ายการยิง LINE ไปหลัง Cloud Function จะได้ทั้งสองอย่าง:
- token อยู่ฝั่งเซิร์ฟเวอร์ ไม่มีใครเห็น → เปลี่ยน `app_config` read เป็น `false` ได้
- function อ่าน `users` ด้วยสิทธิ์ admin → แจ้งเตือนกลับมาทำงาน โดยไม่ต้องเปิด
  `users` ให้พนักงานอ่าน

ต้องเปิด Blaze plan

## 5. ยังเหลือ: รหัสผ่านของพนักงานเดิม

พนักงานใหม่ถูกบังคับตั้งรหัสใหม่ตอนล็อกอินครั้งแรกแล้ว แต่**คนที่มีอยู่เดิมยังใช้
`123456` อยู่** — ใครรู้อีเมลเพื่อนร่วมงานก็เข้าดูสลิปเงินเดือนเขาได้

วิธีบังคับ: หน้า **เพิ่ม/แก้ไขพนักงาน** → เลือกพนักงาน → ติ๊ก
**"บังคับตั้งรหัสผ่านใหม่ตอนล็อกอินครั้งถัดไป"** → บันทึก
(ทำให้ครบทุกคนที่ยังไม่เคยเปลี่ยนรหัส)

---

## หมายเหตุ: Firebase API key ไม่ใช่ความลับ

`apiKey` ใน `firebaseConfig` เปิดเผยได้ตามปกติของ Firebase ไม่ต้องซ่อน
สิ่งที่กันข้อมูลคือ Firestore rules ไม่ใช่การซ่อน key
