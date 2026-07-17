# ความปลอดภัย — สิ่งที่ต้องทำด้วยมือ

โค้ดส่วนที่แก้ได้แก้แล้ว ที่เหลือต้องทำในคอนโซล **ทำตามลำดับนี้**

---

## 0. Deploy Firestore rules — ด่วนที่สุด 🔴

rules เดิมเป็นแบบนี้:

```
match /artifacts/{appId}/public/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

`{document=**}` = ทุกอย่างใต้ `public/` ซึ่งคือข้อมูลทั้งระบบ และเงื่อนไขมีแค่
"ล็อกอินอะไรก็ได้" — เนื่องจาก Email/Password provider เปิดอยู่ และ API key อ่านได้
จาก `app.html` ที่เสิร์ฟ public แปลว่า **ใครก็สมัครบัญชีเองแล้วอ่าน/แก้เงินเดือน
เลขบัตรประชาชน เลขบัญชีธนาคาร ของพนักงานทุกคนได้**

บล็อก `users/{userId}` ที่เจาะจงกว่าไม่ได้ช่วยอะไร — **rules เป็น OR ไม่ใช่ override**
ถ้าบล็อกไหนอนุญาตก็จบ บล็อกที่แคบกว่าไม่ได้จำกัดบล็อกที่กว้างกว่า

วิธี deploy อยู่ที่ข้อ 3 ทำข้อนี้ก่อนเพื่อน

หลัง deploy: เช็ค [Authentication → Users](https://console.firebase.google.com/project/hris-21093/authentication/users)
ว่ามีบัญชีแปลกปลอมที่ไม่ใช่พนักงานไหม

## 1. Rotate LINE channel access token

token เดิมเคย hardcode อยู่ใน `app.html` ซึ่งเสิร์ฟเป็นไฟล์ static ที่ใครเปิดเว็บก็โหลดได้
**ถือว่าหลุดแล้ว** ใครก็เอาไปส่งข้อความในนาม LINE OA ของบริษัทได้

ลบออกจากโค้ดเฉยๆ ไม่พอ — ยังอยู่ใน git history ย้อนกลับไปอ่านได้

1. LINE Developers Console → Messaging API → Channel access token → **Issue new + Revoke เดิม**
2. เอา token ใหม่ใส่ Firestore — **doc นี้ยังไม่มี ต้องสร้างเอง** (ตั้งใจ ไม่ให้ token ผ่าน git):

   ไป [Firestore Data](https://console.firebase.google.com/project/hris-21093/firestore/data)
   → `artifacts` → `bizhris-phichit` → `public` → `data`
   → **Start collection** ชื่อ `app_config`
   → Document ID: `line` (พิมพ์เอง อย่ากด Auto-ID)
   → Field: `channelAccessToken` · string · วาง token ใหม่

3. ทดสอบด้วยการส่งสลิปทาง LINE สักครั้ง

ถ้ายังไม่ได้ทำข้อ 2 ระบบจะขึ้น error ชัดเจนว่ายังไม่ได้ตั้งค่า (ไม่เงียบหาย)

## 2. เปลี่ยน repo เป็น private — ไม่ต้องรีบ

**ช่วยได้น้อยกว่าที่คิด** เพราะแอปคือ `app.html` ที่เสิร์ฟเป็นไฟล์ static — ใครเปิด
`https://lamsangstore.github.io/HRIS/app.html` ก็ได้ซอร์สทั้งไฟล์อยู่แล้ว ซอร์ส public
ตลอดมาไม่ว่า repo จะ private หรือไม่ ทำ private ช่วยแค่ซ่อน git history เท่านั้น

และมีค่าใช้จ่ายแฝง: **GitHub Pages ใช้ได้กับ public repo เท่านั้นบนแพลนฟรี**
กด private ปุ๊บเว็บล่มทันที ทางเลือก:

| ทางเลือก | ค่าใช้จ่าย |
|---|---|
| อยู่กับ Pages + repo public | ฟรี — ไม่ต้องทำอะไร |
| ย้ายไป Firebase Hosting แล้วค่อย private | ฟรี (อยู่ในแพลน Spark ที่ใช้อยู่) |
| ซื้อ GitHub Team | $4/user/เดือน |

ถ้าจะย้าย: `npx firebase init hosting` (public dir = `.`) แล้ว
`npx firebase deploy --only hosting --project hris-21093`

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

**ต้องทำหลัง deploy:** ไปหน้า **เพิ่ม/แก้ไขพนักงาน** → แท็บ **รายชื่อ & แก้ไขข้อมูล**
→ กดปุ่ม **"ซิงค์ไดเรกทอรี"** หนึ่งครั้ง

เพราะแจ้งเตือน LINE ต้องหา LINE ID ของหัวหน้า ซึ่งเดิมอ่านจาก `users` ทั้ง collection
(= ต้องเปิดเงินเดือนทุกคนให้พนักงานอ่าน) ตอนนี้ย้ายไปอ่านจาก `directory` ที่มีแค่
ชื่อ/role/lineId แทน แต่พนักงานเดิมยังไม่มี doc ใน `directory` จนกว่าจะกดปุ่มนี้
— **ไม่กด = แจ้งเตือน LINE เงียบ**

---

## 4. ยังเหลือ: ย้าย LINE ไป Cloud Function (ยังไม่ทำ)

ตอนนี้เบราว์เซอร์พนักงานเป็นคนยิง LINE เอง เครื่องเขาจึงต้องอ่าน token ได้
=> **พนักงานที่เปิด DevTools ยังก๊อป token ไปใช้ได้** การย้ายมา Firestore แค่ปิดรู
ที่หลุดสู่คนนอก ยังไม่ได้แก้ที่ต้นเหตุ

ความเสี่ยงที่เหลือ: พนักงานเอา token ไปส่งข้อความในนาม LINE OA ของบริษัท
(ทำได้แค่ส่งข้อความ อ่านข้อมูลใน Firestore ไม่ได้ — rules กันอยู่)

ถ้าจะแก้ให้จบ: ย้ายการยิง LINE ไปหลัง Cloud Function โดยใช้ **Firestore trigger**
(`onDocumentCreated('leave_requests/{id}')` → หา manager → ยิง LINE) ไม่ใช่ให้เบราว์เซอร์
เรียก — จะได้ทั้ง token ที่ปลอดภัยและไม่ต้องมี `directory`

- token เก็บด้วย `firebase functions:secrets:set LINE_TOKEN` → `app_config` read เป็น `false` ได้
- function อ่าน `users` ด้วยสิทธิ์ admin → ลบ `directory` ทิ้งได้

ต้องเปิด **Blaze plan** (ผูกบัตร) แต่ฟรี 2 ล้าน invocation/เดือน — ที่ขนาดนี้ค่าใช้จ่าย
เกือบเป็นศูนย์ แนะนำตั้ง Budget Alert ที่ ฿100 กันเหนียว

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
