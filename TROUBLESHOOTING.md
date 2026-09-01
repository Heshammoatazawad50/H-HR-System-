# 🔧 دليل استكشاف الأخطاء - H-HR

حل شامل لأكثر المشاكل شيوعاً في النظام.

---

## 🚨 مشاكل الاتصال بقاعدة البيانات

### ❌ المشكلة: "Connection refused"

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**الأسباب الممكنة:**
- قاعدة البيانات غير مشغلة
- المنفذ خاطئ
- البيانات في `.env` خاطئة

**✅ الحل:**

#### 1. اختبر تشغيل PostgreSQL

**على macOS:**
```bash
brew services list
# إذا كانت متوقفة
brew services start postgresql@15
```

**على ويندوز:**
```bash
# من Services:
Services > PostgreSQL > Start
```

**على لينكس:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

#### 2. اختبر الاتصال

```bash
psql postgresql://username:password@localhost:5432/h-hr-db
```

إذا نجح، سترى:
```
psql (15.0)
Type "help" for help.

h-hr-db=#
```

#### 3. تحقق من متغيرات البيئة

```bash
# اعرض المحتوى الحالي
cat .env

# تأكد من وجود هذه السطور:
NODE_ENV=production
DATABASE_URL=postgresql://username:password@localhost:5432/h-hr-db
PORT=3000
```

#### 4. أعد بناء التطبيق

```bash
# أوقف الخادم (Ctrl+C)
# ثم أعد التثبيت
npm install
npm run setup-db
npm start
```

---

### ❌ المشكلة: "Connection timeout"

```
Error: connect timeout after 10000ms
```

**الحل:**

```bash
# 1. اختبر سرعة الاتصال
ping hostname

# 2. اختبر الاتصال المباشر
telnet hostname 5432

# 3. في الخدمات السحابية، تحقق من firewall
# في Railway/Neon/أي خدمة، تأكد من السماح بالوصول
```

---

### ❌ المشكلة: "Authentication failed"

```
Error: password authentication failed for user "username"
```

**الحل:**

```bash
# 1. تحقق من اسم المستخدم وكلمة المرور
# في قاعدة البيانات نفسها
psql -U postgres

# 2. غيّر كلمة المرور إذا كنت بحاجة
ALTER USER username WITH PASSWORD 'new_password';

# 3. حدّث .env
DATABASE_URL=postgresql://username:new_password@localhost:5432/h-hr-db
```

---

### ❌ المشكلة: "Database does not exist"

```
Error: database "h-hr-db" does not exist
```

**الحل:**

```bash
# 1. أنشئ قاعدة البيانات
createdb -U postgres h-hr-db

# 2. أو من داخل psql
psql -U postgres
CREATE DATABASE "h-hr-db";

# 3. أعد تشغيل setup
npm run setup-db
```

---

## 🌐 مشاكل الخادم والشبكة

### ❌ المشكلة: "Port already in use"

```
Error: listen EADDRINUSE: address already in use :::3000
```

**الحل:**

#### الطريقة 1: تغيير المنفذ

```bash
# في .env
PORT=3001
# أو
npm start -- --port 3001
```

#### الطريقة 2: إيقاف العملية التي تستخدم المنفذ

**على ماك/لينكس:**
```bash
# ابحث عن العملية
lsof -i :3000

# أوقفها
kill -9 <PID>
```

**على ويندوز:**
```bash
# ابحث عن العملية
netstat -ano | findstr :3000

# أوقفها
taskkill /PID <PID> /F
```

---

### ❌ المشكلة: "ERR_CONNECTION_REFUSED"

```
Failed to fetch from http://localhost:3000
```

**الحل:**

```bash
# 1. تأكد من تشغيل الخادم
npm start

# 2. اختبر الاتصال
curl http://localhost:3000/api/health

# 3. إذا كان المنفذ مختلف
curl http://localhost:3001/api/health
```

---

### ❌ المشكلة: "CORS Error"

```
Access to XMLHttpRequest at 'http://api.example.com' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**الحل:**

```bash
# في .env
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# عند الإنتاج
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**إذا كان الخطأ يستمر:**

```bash
# امسح cache المتصفح
# اضغط: F12 > Application > Storage > Clear Site Data

# أو في خاصية الخصوصية
Ctrl+Shift+Delete > تصفح البيانات المخزنة مؤقتاً
```

---

## 🔐 مشاكل تسجيل الدخول والأمان

### ❌ المشكلة: "Username or password incorrect"

**الحل:**

```bash
# 1. تحقق من البيانات
# اسم المستخدم الافتراضي: admin
# كلمة المرور الافتراضية: Admin@123

# 2. إذا نسيت كلمة المرور، أعد الإعداد
npm run setup-db

# 3. أو من قاعدة البيانات مباشرة
psql -U postgres -d h-hr-db

UPDATE employees SET password_hash = '...', password_salt = '...' 
WHERE username = 'admin';
```

---

### ❌ المشكلة: "Account is locked"

```
حسابك مقفول لمدة 15 دقيقة بعد 5 محاولات خاطئة
```

**الحل:**

**الطريقة 1: الانتظار**
- انتظر 15 دقيقة

**الطريقة 2: من قاعدة البيانات**
```sql
UPDATE employees 
SET failed_attempts = 0, locked_until = NULL
WHERE username = 'admin';
```

---

### ❌ المشكلة: "Invalid Token"

```
Error: Invalid authentication token
```

**الحل:**

```bash
# 1. امسح البيانات المحفوظة محلياً
# F12 > Application > Local Storage > Clear All

# 2. سجّل الدخول مرة أخرى
```

---

## 📊 مشاكل البيانات والعمليات

### ❌ المشكلة: "No data displayed"

```
الصفحات فارغة بدون بيانات
```

**الحل:**

```bash
# 1. اختبر أن البيانات موجودة
psql -U postgres -d h-hr-db

SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM attendance;

# 2. إذا كانت فارغة، أدخل بيانات تجريبية
INSERT INTO employees (id, username, password_hash, password_salt, name, role, active)
VALUES (gen_random_uuid(), 'test', '...', '...', 'موظف تجريبي', 'employee', true);

# 3. في المتصفح
# Ctrl+Shift+Delete > امسح البيانات المخزنة مؤقتاً
```

---

### ❌ المشكلة: "Data not saving"

```
البيانات لا تُحفظ عند التعديل
```

**الحل:**

```bash
# 1. اختبر الحفظ من API
curl -X PUT http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d '{"employees":[...]}'

# 2. اختبر أن قاعدة البيانات متاحة
psql -U postgres -d h-hr-db

# 3. تحقق من الصلاحيات
SELECT * FROM information_schema.role_table_grants 
WHERE table_schema = 'public';
```

---

### ❌ المشكلة: "Duplicate key error"

```
Error: duplicate key value violates unique constraint
```

**الحل:**

```bash
# 1. ابحث عن التكرار
SELECT username, COUNT(*) 
FROM employees 
GROUP BY username 
HAVING COUNT(*) > 1;

# 2. احذف التكرار
DELETE FROM employees 
WHERE id NOT IN (
  SELECT MIN(id) FROM employees GROUP BY username
);

# 3. حاول التحديث مرة أخرى
```

---

## 💾 مشاكل النسخ الاحتياطية والاستعادة

### ❌ المشكلة: "Backup failed"

**الحل:**

```bash
# 1. تحقق من المساحة الخالية
df -h

# 2. أنشئ نسخة احتياطية يدوياً
pg_dump $DATABASE_URL > backup.sql

# 3. ضغط النسخة
gzip backup.sql
```

---

### ❌ المشكلة: "Cannot restore backup"

**الحل:**

```bash
# 1. تحقق من أن قاعدة البيانات فارغة
dropdb h-hr-db
createdb h-hr-db

# 2. استعد من النسخة الاحتياطية
psql h-hr-db < backup.sql

# 3. أو من ملف مضغوط
gunzip -c backup.sql.gz | psql h-hr-db
```

---

## 🎨 مشاكل واجهة المستخدم

### ❌ المشكلة: "Page not loading"

```
الصفحة بيضاء أو قائمة بيضاء
```

**الحل:**

```bash
# 1. افتح أدوات المطور (F12)
# 2. اعرض Console للأخطاء
# 3. ابحث عن رسائل Error حمراء

# 4. تحقق من الشبكة (Network tab)
# 5. تأكد من أن /api/db ترجع بيانات

# 6. امسح cache
Ctrl+Shift+Delete > اختر "All time" > امسح
```

---

### ❌ المشكلة: "Arabic text not displaying"

```
النصوص العربية تظهر كـ أحرف غريبة
```

**الحل:**

```html
<!-- في index.html تأكد من وجود -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width">

<!-- وأن النصوص مشفرة بـ UTF-8 -->
```

---

### ❌ المشكلة: "CSS/JS not loading"

```
الموقع بلا أسلوب أو JavaScript لا يعمل
```

**الحل:**

```bash
# 1. تحقق من المسارات في index.html
# يجب أن تكون:
<script src="/js/app.js"></script>
<link rel="stylesheet" href="/css/style.css">

# 2. تأكد من وجود الملفات في مجلد public/
ls -la public/

# 3. أعد بدء الخادم
npm start

# 4. امسح cache المتصفح
```

---

## 🐳 مشاكل Docker

### ❌ المشكلة: "Container fails to start"

```bash
# اعرض السجلات
docker-compose logs app

# تحقق من الصور
docker images

# أعد البناء
docker-compose build --no-cache
docker-compose up -d
```

---

### ❌ المشكلة: "Cannot connect to Docker daemon"

**على ويندوز/ماك:**
```bash
# تأكد من تشغيل Docker Desktop
# ابدأ تطبيق Docker Desktop

# أو أعد التثبيت
```

**على لينكس:**
```bash
sudo systemctl start docker
```

---

## 📈 مشاكل الأداء

### ❌ المشكلة: "Application is slow"

```bash
# 1. اختبر سرعة قاعدة البيانات
psql $DATABASE_URL
EXPLAIN ANALYZE SELECT * FROM attendance LIMIT 100;

# 2. أنشئ فهارس إضافية إذا لزم
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);

# 3. راقب موارد النظام
top
# أو
docker stats
```

---

### ❌ المشكلة: "Out of memory"

```bash
# 1. اعرض الذاكرة المستخدمة
free -h

# 2. أوقف التطبيقات غير الضرورية
# 3. زد ذاكرة النظام أو استأجر خادم أقوى
```

---

## 🆘 الحالات المتقدمة

### استكشاف أخطاء عميقة

```bash
# تشغيل مع سجل تصحيح
DEBUG=* npm start

# أو
NODE_DEBUG=http npm start

# عرض جميع المتغيرات
env | grep DATABASE
env | grep ALLOWED
```

### الوصول إلى قاعدة البيانات

```bash
# تسجيل الدخول كـ admin
psql -U postgres

# اختر قاعدة البيانات
\c h-hr-db

# اعرض الجداول
\dt

# اعرض المستخدمين
\du

# اعرض الإحصائيات
SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name)) 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## 📞 متى تطلب الدعم

اطلب مساعدة إذا:
- ❌ جربت جميع الحلول أعلاه بدون جدوى
- ❌ الخطأ غير مدرج في هذا الدليل
- ❌ المشكلة تؤثر على العمليات الحرجة

### عند طلب الدعم قدّم:

```
1. رسالة الخطأ الكاملة
2. السجلات (logs)
   - docker-compose logs app
   - browser console (F12)
3. خطوات إعادة الإنتاج
4. معلومات البيئة
   - OS (macOS/Windows/Linux)
   - Node version (node -v)
   - npm version (npm -v)
```

---

## ✅ قائمة التحقق قبل طلب الدعم

- [ ] اختبرت الاتصال بقاعدة البيانات
- [ ] تحققت من السجلات (logs)
- [ ] امسحت cache المتصفح
- [ ] أعدت تشغيل الخادم
- [ ] تحققت من متغيرات البيئة
- [ ] جربت على متصفح مختلف
- [ ] اختبرت من جهاز مختلف

---

**نصيحة ذهبية:** تذكر دائماً أن السجلات (logs) هي أفضل صديق لك!

```bash
# عند حدوث خطأ، أول شيء:
docker-compose logs -f app
```

---
