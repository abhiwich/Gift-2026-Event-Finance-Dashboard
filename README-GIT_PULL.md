# Git ตั้งแต่ต้นจน Deploy

คู่มือสำหรับโปรเจกต์ **Gift 2026 Event Finance Dashboard**  
Repo: [abhiwich/Gift-2026-Event-Finance-Dashboard](https://github.com/abhiwich/Gift-2026-Event-Finance-Dashboard.git)  
Branch หลัก: `main`  
Deploy: [Vercel](https://vercel.com/) จาก branch `main`

โปรเจกต์นี้เป็นหน้าเว็บสถิต (HTML + CSS + Vanilla JS) ไม่มี `npm install` และไม่มี build step  
เมื่อ `git push origin main` แล้ว Vercel จะขึ้นเว็บ production ให้อัตโนมัติ

---

## 1. ติดตั้งเครื่องมือครั้งแรก

ต้องมี:

- [Git](https://git-scm.com/)
- บัญชี [GitHub](https://github.com/)
- บัญชี [Vercel](https://vercel.com/) ที่ผูกกับ GitHub แล้ว
- สิทธิ์เข้า repo นี้
- Python 3 (สำหรับเปิดเว็บบนเครื่อง)

ตรวจว่า Git พร้อมใช้:

```bash
git --version
```

ตั้งชื่อและอีเมลครั้งแรกของเครื่อง (ถ้ายังไม่เคยตั้ง):

```bash
git config --global user.name "ชื่อของคุณ"
git config --global user.email "อีเมลที่ใช้กับ GitHub"
```

---

## 2. ดึงโปรเจกต์ลงเครื่อง (clone)

ถ้ายังไม่มีโฟลเดอร์โปรเจกต์:

```bash
cd ~/Documents/Development
git clone https://github.com/abhiwich/Gift-2026-Event-Finance-Dashboard.git
cd Gift-2026-Event-Finance-Dashboard
```

ถ้ามีโฟลเดอร์อยู่แล้ว และอยากผูกกับ GitHub:

```bash
cd /path/to/Tripat-Dashboard
git remote add origin https://github.com/abhiwich/Gift-2026-Event-Finance-Dashboard.git
git pull origin main
```

ตรวจ remote:

```bash
git remote -v
```

ต้องเห็น `origin` ชี้ไปที่ repo ด้านบน

---

## 3. ทำงานรายวัน: ดึงของล่าสุดก่อนแก้

ทุกครั้งก่อนลงมือแก้โค้ด ให้ดึง `main` ล่าสุด:

```bash
git checkout main
git pull origin main
```

คำสั่งที่ใช้บ่อย:

| คำสั่ง | ความหมาย |
|--------|----------|
| `git status` | ดูไฟล์ที่เปลี่ยน |
| `git pull` | ดึงของจาก GitHub มาลงเครื่อง |
| `git diff` | ดูรายละเอียดที่แก้ |
| `git log --oneline` | ดูประวัติ commit |

ถ้า `git pull` แล้วมี conflict แปลว่าไฟล์เดียวกันถูกแก้ทั้งบนเครื่องและบน GitHub  
เปิดไฟล์นั้น หาเครื่องหมาย `<<<<<<<` `=======` `>>>>>>>` เลือกข้อความที่ถูก แล้ว:

```bash
git add ชื่อไฟล์
git commit -m "แก้ conflict"
```

---

## 4. แก้โค้ด แล้วส่งขึ้น GitHub

### 4.1 ตรวจไฟล์ที่เปลี่ยน

```bash
git status
git diff
```

### 4.2 เลือกไฟล์เข้า commit

เพิ่มเฉพาะไฟล์งาน ไม่ใส่ `.env` หรือไฟล์ลับ:

```bash
git add DESIGN_SPEC.md index.html css/ js/
```

หรือเพิ่มทั้งหมดที่เปลี่ยน:

```bash
git add .
```

### 4.3 สร้าง commit

```bash
git commit -m "อธิบายสั้น ๆ ว่าทำไมถึงเปลี่ยน"
```

ตัวอย่างข้อความ:

- `แก้รูปแบบตัวเลขรายจ่ายให้เหมือนรายรับ`
- `ลบตัวกรองวันที่ และดึงชีตทุก 5 วินาที`

### 4.4 ส่งขึ้น GitHub

```bash
git push origin main
```

ครั้งแรกของเครื่องนี้ ถ้า Git บอกให้ตั้ง upstream:

```bash
git push -u origin main
```

---

## 5. ปัญหาที่พบบ่อยตอน push

### `src refspec main does not match any`

แปลว่า branch `main` ยังไม่มี commit เลย Git จึงยังไม่มี `main` ให้ส่ง

แก้โดยทำ commit แรกก่อน แล้วค่อย push:

```bash
git add DESIGN_SPEC.md css/ index.html js/
git commit -m "Add Gift 2026 Event Finance Dashboard"
git push -u origin main
```

อย่า `git push` ตอนที่ `git status` ยังขึ้น `No commits yet`

### `failed to push some refs` / `non-fast-forward`

บน GitHub มี commit ที่เครื่องยังไม่มี ให้ดึงก่อน แล้วค่อยส่ง:

```bash
git pull --rebase origin main
git push origin main
```

### ถูกถาม username / password แล้วเข้าไม่ได้

GitHub ไม่รับรหัสผ่านบัญชีแล้ว ใช้ [Personal Access Token](https://github.com/settings/tokens) หรือตั้ง [GitHub CLI](https://cli.github.com/) / SSH แทน

---

## 6. เปิดดูบนเครื่องก่อน Deploy

อย่าเปิด `index.html` ตรง ๆ แบบ `file://` เพราะ `fetch` ไป Google Sheets อาจโดนบล็อก

จากโฟลเดอร์โปรเจกต์:

```bash
python3 -m http.server 8765
```

เปิดเบราว์เซอร์ที่ [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

ตรวจอย่างน้อย:

- การ์ดรายรับ / รายจ่าย / คงเหลือ มีตัวเลข
- กราฟสองอันขึ้น
- ตัวเลขเป็นรูปแบบเต็ม เช่น `24,500` ไม่ใช่ `24.5K`
- ข้อมูลรีเฟรชเองทุก 5 วินาที

ชีตต้องแชร์เป็น **Anyone with the link → Viewer**  
ไม่เช่นนั้นหน้าเว็บจะขึ้นว่าอ่าน Google Sheets ไม่ได้

หยุดเซิร์ฟเวอร์ด้วย `Ctrl + C`

---

## 7. Deploy ขึ้น Vercel

โปรเจกต์นี้ deploy ด้วย **Vercel** โดยดึงโค้ดจาก GitHub branch `main`  
ไม่มี build command เพราะเป็นไฟล์ HTML/CSS/JS พร้อมเปิดได้เลย

### 7.1 เชื่อมโปรเจกต์ครั้งแรก

1. เข้า [vercel.com](https://vercel.com/) แล้วล็อกอินด้วย GitHub
2. กด **Add New… → Project**
3. Import repo `Gift-2026-Event-Finance-Dashboard`
4. ตั้งค่าดังนี้:

| ช่อง | ค่า |
|------|-----|
| Framework Preset | Other |
| Root Directory | `.` |
| Build Command | เว้นว่าง |
| Output Directory | เว้นว่าง |
| Install Command | เว้นว่าง |
| Production Branch | `main` |

5. กด **Deploy**

เมื่อสำเร็จ Vercel จะให้ URL ประมาณ:

```
https://gift-2026-event-finance-dashboard.vercel.app
```

ชื่อจริงดูได้ที่หน้า Project → **Domains**  
ถ้าต้องการโดเมนโรงเรียน ให้เพิ่มที่ **Settings → Domains**

### 7.2 Deploy รอบถัดไป

ไม่ต้องกด Deploy ใหม่บน Vercel แค่ push เข้า `main`:

```bash
git checkout main
git pull origin main
# แก้โค้ด แล้วตรวจบนเครื่อง
git add .
git commit -m "ข้อความ commit"
git push origin main
```

Vercel จะสร้าง deployment ใหม่อัตโนมัติ

- push เข้า `main` → **Production**
- เปิด Pull Request → **Preview URL** สำหรับตรวจก่อนรวมเข้า main

ดูสถานะได้ที่แท็บ **Deployments** ของโปรเจกต์บน Vercel

รอสักครู่ แล้วรีเฟรชหน้าเว็บ (อาจต้อง hard refresh: `Cmd + Shift + R`)

### 7.3 ถ้าไม่ขึ้นหน้าเว็บ

- ที่ Vercel ต้องชี้ Production Branch เป็น `main`
- ไฟล์หลักต้องชื่อ `index.html` อยู่รากโปรเจกต์
- deployment ล่าสุดในแท็บ Deployments ต้องเป็น Ready ไม่ใช่ Error
- ชีต Google ยังแชร์เป็น **Anyone with the link → Viewer**
- ถ้าหน้าขาว ให้ดู **Deployment → Function/Build Logs** ว่าหา `index.html` ไม่เจอหรือไม่

---

## 8. ลำดับงานทั้งวงจร (ย่อ)

```
clone หรือ pull
    ↓
แก้โค้ด
    ↓
เปิด python3 -m http.server แล้วตรวจหน้าเว็บ
    ↓
git add
    ↓
git commit
    ↓
git push origin main
    ↓
Vercel deploy อัตโนมัติ (Production)
```

เริ่มงานวันใหม่ให้จำแค่บรรทัดนี้:

```bash
git pull origin main
```

จบงานแล้วส่งขึ้นเว็บให้จำบรรทัดนี้:

```bash
git add . && git commit -m "ข้อความ" && git push origin main
```
