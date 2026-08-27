# ขั้นตอนหลังแก้โค้ด

## 1. ก่อน push

```bash
npm test          # 137 เคส — syntax, import/export, role guard, สูตรคำนวณ
```

**ถ้าแก้อะไรใน `js/`** ต้อง bump `ASSET_V` ใน `app.html` (ค้นหา `const ASSET_V`)
เปลี่ยนเป็นวันที่วันนี้ + ตัวอักษร เช่น `20260718a` แล้วแทนที่ทุกที่:

```bash
OLD=20260718a; NEW=20260719a
grep -rl "$OLD" app.html js/ | xargs sed -i '' "s/$OLD/$NEW/g"
node tests/asset-version.test.mjs --update   # บันทึก hash ใหม่
npm test
```

ไม่ bump = เบราว์เซอร์พนักงานใช้ไฟล์เก่าปนใหม่ → หน้าขาวทั้งแอป
`npm test` จะฟ้องถ้าแก้ไฟล์ใน `js/` แล้วลืม bump

## 1.5 ทดสอบ Firestore rules

```bash
npm run test:rules   # ต้องมี Java: brew install openjdk
```

รันทุกครั้งที่แก้ `firestore.rules` — ทดสอบด้วยสิทธิ์พนักงานธรรมดา
(ทดสอบด้วย admin ไม่มีความหมาย เพราะ `isManager()` ผ่านเกือบทุกกฎ)

## 2. หลัง deploy — เช็ค 5 นาที

เทสต์จับได้แค่เรื่องโครงสร้าง **ไม่ได้เปิดหน้าจริง** บั๊กที่หลุดไป production
ทั้งสองครั้งเป็นแบบที่เทสต์ผ่านแต่หน้าพัง จึงต้องกดดูจริง

เปิดแอป **กด Cmd+Shift+R หนึ่งครั้ง** แล้วไล่กดเมนู โดยเฉพาะหน้าที่เพิ่งแก้:

| ตรวจอะไร | ที่ควรเห็น |
|---|---|
| หน้าเปิดได้ | ไม่ขึ้น "ไม่สามารถโหลดหน้านี้ได้" |
| **ข้อมูลขึ้นจริง** | ไม่ใช่ว่างเปล่าทั้งที่มีข้อมูล ← บั๊กที่เคยหลุด 2 ครั้ง |
| Console (F12) | ไม่มี error สีแดง |

จุดที่เคยพังและควรดูทุกครั้ง:
- **อนุมัติการลา** → เลือก "ทั้งหมด" ต้องเห็นรายการ (เคยว่างทั้งที่ตัวเลขขึ้น)
- **ประเมินผลงาน** → เลือกรอบแล้วต้องเห็นคะแนน
- **จัดการเงินเดือน** → เลือกงวดที่จ่ายแล้ว ต้องเห็นรายชื่อ + ยอดเงิน

## 3. ถ้าพัง

- `does not provide an export named ...` → ลืม bump `ASSET_V` หรือ bump ไม่ครบ
- `X is not defined` → หน้าใน `js/pages/` เรียกของที่อยู่ใน scope `app.html`
  ต้อง `window.X = X` ใน app.html หรือย้ายไป `js/lib/` แล้ว import
- หน้าเปิดได้แต่ข้อมูลว่าง → ฟังก์ชันที่ callback เรียก ประกาศทีหลังแบบ
  `window.fn = () => {}` (ไม่ hoist) เปลี่ยนเป็น `function fn() {}` แล้ว assign ทีหลัง

## Cloud Functions (แจ้งเตือน LINE)

การส่ง LINE ทุกทาง (แจ้งลา / อนุมัติ / ส่งสลิป) วิ่งผ่าน callable `sendLine`
ใน `functions/index.js` — เบราว์เซอร์ไม่ได้ถือ token แล้ว

ต้องเปิด **Blaze plan** (ผูกบัตร) ถึงจะ deploy functions ได้ ฟรี 2 ล้าน invocation/เดือน
ที่ปริมาณเท่านี้ค่าใช้จ่ายเกือบเป็นศูนย์ — ตั้ง Budget Alert ที่ ฿100 กันเหนียว

ครั้งแรก (หรือทุกครั้งที่ rotate token):

```bash
npx firebase functions:secrets:set LINE_TOKEN --project hris-21093
```

deploy:

```bash
npx firebase deploy --only functions --project hris-21093
```

**ลำดับตอน deploy ครั้งแรก:** ตั้ง secret → deploy functions → push โค้ดหน้าเว็บ →
deploy rules ท้ายสุด (rules ปิด `app_config` read ซึ่งเป็นทางเก่า ถ้า deploy ก่อน
เบราว์เซอร์ที่ยังใช้โค้ดเก่าค้างอยู่จะส่ง LINE ไม่ได้ระหว่างรอ)

ถ้าหน้าเว็บขึ้น "ยังไม่ได้ deploy Cloud Function sendLine" = function ไม่ได้อยู่ที่
region `asia-southeast1` หรือยังไม่ได้ deploy ดู log:

```bash
npx firebase functions:log --only sendLine --project hris-21093
```

## Firestore

```bash
npx firebase deploy --only firestore:rules   --project hris-21093
npx firebase deploy --only firestore:indexes --project hris-21093
```

เพิ่ม query ที่มีทั้ง `where()` และ `orderBy()` → ต้องเพิ่ม index ใน
`firestore.indexes.json` ด้วย ไม่งั้น query นั้นพังเงียบๆ

ดูเรื่องความปลอดภัยที่ [SECURITY.md](SECURITY.md)
