# ระบบบันทึกข้อมูลอากาศยาน (Aircraft Data Management System)

## 📋 คำอธิบาย
ระบบจัดการข้อมูลอากาศยานแบบ HTML5 Static ที่แสดงข้อมูลอากาศยาน เครื่องยนต์ และใบพัดของกองทัพอากาศไทย

## ✨ คุณสมบัติ
- 📊 แสดงข้อมูลอากาศยานพร้อม Progress Bar
- 🔍 รายละเอียดครบถ้วนของแต่ละอากาศยาน
- 📱 Responsive Design รองรับทุกอุปกรณ์
- 🎨 UI/UX ที่สวยงามและใช้งานง่าย
- 🔄 โหลดข้อมูลจากไฟล์ JSON โดยอัตโนมัติ

## 🚀 วิธีใช้งาน

### วิธีที่ 1: ใช้ Live Server (แนะนำ)
1. เปิด VS Code
2. ติดตั้ง Extension "Live Server" (ถ้ายังไม่มี)
3. คลิกขวาที่ `index.html`
4. เลือก "Open with Live Server"
5. เว็บไซต์จะเปิดใน browser โดยอัตโนมัติ

### วิธีที่ 2: เปิดไฟล์โดยตรง
1. Double-click ที่ `index.html`
2. หรือลากไฟล์ไปวางใน browser

## 📁 โครงสร้างไฟล์

```
ระบบบึนทึกข้อมูลอากาศยาน/
├── index.html                    # หน้าหลัก HTML5
├── styles.css                    # CSS หลัก
├── script.js                     # JavaScript หลัก
├── favicon.ico                   # Icon เว็บไซต์
├── aircraft-data.json            # ข้อมูลสำรอง
├── updated-aircraft-data.json    # ข้อมูลหลัก
├── README.md                     # คู่มือนี้
└── img/                          # รูปภาพ
    ├── Caravan.jpg
    ├── Casa_NC212i.jpg
    ├── CN235.jpg
    ├── SuperKingAir350.jpg
    ├── engine.jpg
    └── propeller.jpeg
```

## 📊 ข้อมูลที่แสดง

### อากาศยาน
- รหัสอากาศยาน
- รุ่น (Model)
- หมายเลขเครื่อง (S/N)
- ชั่วโมงบิน (Flight Hours)
- ข้อมูล Overhaul และ TBO

### เครื่องยนต์
- รุ่นเครื่องยนต์
- หมายเลขเครื่องยนต์
- ชั่วโมงการทำงาน
- Hot Section Inspection (HSI)
- Time Between Overhaul (TBO)

### ใบพัด
- รุ่นใบพัด
- หมายเลขใบพัด
- ชั่วโมงการทำงาน
- ข้อมูล Overhaul

## 🎨 คุณสมบัติ UI/UX

- **Responsive Design**: ใช้งานได้ทั้งบน Desktop, Tablet และ Mobile
- **Progress Bars**: แสดงสถานะ TBO และ HSI แบบ visual
- **Modal Windows**: แสดงรายละเอียดแบบ popup
- **Loading States**: แสดงสถานะการโหลดข้อมูล
- **Error Handling**: จัดการข้อผิดพลาดอย่างเหมาะสม

## 🔧 การปรับแต่ง

### เปลี่ยนข้อมูล
แก้ไขไฟล์ `updated-aircraft-data.json` หรือ `aircraft-data.json`

### เปลี่ยนสี Theme
แก้ไขไฟล์ `styles.css` ในส่วน CSS Variables:
```css
:root {
    --primary-color: #2c5aa0;
    --secondary-color: #34495e;
    --accent-color: #3498db;
    --success-color: #27ae60;
    --warning-color: #f39c12;
    --danger-color: #e74c3c;
}
```

### เพิ่มรูปภาพอากาศยาน
1. เพิ่มรูปใน folder `img/`
2. แก้ไข function `getAircraftImage()` ใน `script.js`

## 🌐 Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📝 หมายเหตุ
- ระบบนี้ทำงานแบบ Static ไม่ต้องใช้ Server
- ข้อมูลโหลดจากไฟล์ JSON ในเครื่อง
- เหมาะสำหรับการนำเสนอและ Demo

## 🔄 การอัปเดตข้อมูล
1. แก้ไขไฟล์ JSON
2. Refresh หน้าเว็บ (F5)
3. ข้อมูลใหม่จะแสดงทันที

---
**พัฒนาโดย:** ระบบบันทึกข้อมูลอากาศยาน  
**เวอร์ชัน:** HTML5 Static Version  
**อัปเดตล่าสุด:** ${new Date().toLocaleDateString('th-TH')}