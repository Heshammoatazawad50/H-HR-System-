# 🔐 دليل الأمان - H-HR

أفضل الممارسات الأمنية لحماية نظام الموارد البشرية.

---

## 📋 قائمة الأمان الأساسية

### 🚨 الأولويات العالية (يجب تنفيذها قبل الإنتاج)

- [ ] تغيير كلمة المرور الافتراضية
- [ ] تفعيل HTTPS/SSL
- [ ] تعيين `ALLOWED_ORIGINS` الصحيح
- [ ] إعداد firewall مناسب
- [ ] تفعيل نسخ احتياطية أسبوعية

### ⚠️ الأولويات المتوسطة

- [ ] إعداد مراقبة الأمان
- [ ] تفعيل تسجيل العمليات
- [ ] حماية كلمات المرور الضعيفة
- [ ] تحديث المكتبات بانتظام

### ℹ️ الأولويات المنخفضة

- [ ] إعداد HSTS
- [ ] إعداد نسخ احتياطية يومية
- [ ] تحليل السجلات منتظمة

---

## 🔑 إدارة كلمات المرور

### ✅ أفضل الممارسات

#### 1. كلمات مرور قوية
```
يجب أن تحتوي على:
✓ 8 أحرف على الأقل
✓ أحرف كبيرة (A-Z)
✓ أحرف صغيرة (a-z)
✓ أرقام (0-9)
✓ رموز خاصة (!@#$%^&*)

مثال صحيح: Admin@2024! ✅
مثال خاطئ: admin123 ❌
```

#### 2. تخزين آمن لكلمات المرور

```javascript
// النظام يستخدم تشفير آمن
// PBKDF2-SHA256 مع ملح عشوائي
// 100,000 تكرار (iterations)

const crypto = require('crypto');

function hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 100000, 32, 'sha256', 
            (err, derivedKey) => {
                if (err) reject(err);
                resolve(derivedKey.toString('hex'));
            }
        );
    });
}
```

#### 3. تغيير كلمات المرور الدورية

```sql
-- أجبر الموظفين على تغيير كلمة المرور كل 90 يوم
ALTER TABLE employees ADD COLUMN 
last_password_change TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- تحقق من تاريخ آخر تغيير
SELECT 
    id, 
    username,
    CURRENT_TIMESTAMP - last_password_change AS days_since_change
FROM employees
WHERE CURRENT_TIMESTAMP - last_password_change > interval '90 days'
ORDER BY last_password_change;
```

---

## 🔒 الأمان على مستوى الخادم

### 1. متغيرات البيئة الآمنة

```env
# ❌ خاطئ - كلمات مرور ضعيفة
DATABASE_PASSWORD=password123
ADMIN_PASSWORD=admin

# ✅ صحيح - كلمات مرور قوية
DATABASE_PASSWORD=P@ssw0rd2024!Secure#Database
ADMIN_PASSWORD=Adm!n@2024$Secure
ALLOWED_ORIGINS=https://yourdomain.com
```

### 2. حماية الملفات الحساسة

```bash
# تعديل صلاحيات الملفات
chmod 600 .env
chmod 600 .env.production
chmod 600 credentials.json

# تأكد من أن .env مدرج في .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### 3. عدم كشف معلومات الخادم

```javascript
// في server.js - إخفاء تفاصيل الخطأ في الإنتاج
const errorHandler = (err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal Server Error',
        // لا تكشف:
        // ❌ stack trace
        // ❌ اسم الملف
        // ❌ رقم السطر
        // ❌ بيانات قاعدة البيانات
    });
};
```

---

## 🛡️ HTTPS و SSL

### تفعيل HTTPS (إلزامي للإنتاج)

#### على Railway:
```
تلقائي - لا شيء للقيام به ✅
```

#### على خادم VPS:
```bash
# استخدم Let's Encrypt (مجاني)
sudo apt-get install certbot python3-certbot-nginx

# احصل على شهادة
sudo certbot --nginx -d yourdomain.com
```

#### إعادة توجيه HTTP إلى HTTPS:

```javascript
// في server.js
app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
        next();
    }
});
```

---

## 🚫 منع الهجمات الشائعة

### 1. منع XSS (Cross-Site Scripting)

```javascript
// في server.js
app.use((req, res, next) => {
    // منع تنفيذ سكريبتات غير موثوقة
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
```

```html
<!-- في HTML - استخدم textContent بدل innerHTML -->
// ❌ خاطئ
element.innerHTML = userInput;

// ✅ صحيح
element.textContent = userInput;
```

### 2. منع CSRF (Cross-Site Request Forgery)

```javascript
// في server.js
const csrf = require('csurf');
const session = require('express-session');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true, // HTTPS فقط
        httpOnly: true, // لا يمكن الوصول من JavaScript
        sameSite: 'Strict' // منع الطلب من مواقع أخرى
    }
}));

app.use(csrf());
```

### 3. منع SQL Injection

```javascript
// ❌ خاطئ - عرضة للهجوم
const query = `SELECT * FROM employees WHERE id = ${req.params.id}`;

// ✅ صحيح - استخدام parameterized queries
const query = `SELECT * FROM employees WHERE id = $1`;
client.query(query, [req.params.id]);
```

### 4. منع Brute Force

```javascript
// قفل الحساب بعد محاولات فاشلة
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 دقيقة

async function checkLoginAttempts(username) {
    const employee = await pool.query(
        'SELECT failed_attempts, locked_until FROM employees WHERE username = $1',
        [username]
    );
    
    if (employee.rows[0]?.locked_until > new Date()) {
        throw new Error('Account is locked. Try again later.');
    }
    
    if (employee.rows[0]?.failed_attempts >= MAX_ATTEMPTS) {
        await pool.query(
            'UPDATE employees SET locked_until = $1 WHERE username = $2',
            [new Date(Date.now() + LOCK_TIME), username]
        );
        throw new Error('Account locked due to multiple failed attempts');
    }
}
```

---

## 🔐 نظام الجلسات (Sessions)

### إعدادات آمنة للجلسات

```javascript
// مدة الجلسة
const SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // 12 ساعة

// تحقق من انتهاء الجلسة
app.use((req, res, next) => {
    if (req.session?.lastActivity) {
        const now = Date.now();
        if (now - req.session.lastActivity > SESSION_TIMEOUT) {
            req.session.destroy();
            return res.status(401).json({
                success: false,
                error: 'Session expired. Please login again.'
            });
        }
    }
    req.session.lastActivity = Date.now();
    next();
});
```

---

## 🚨 تسجيل الأمان (Audit Logging)

### تسجيل جميع العمليات الحساسة

```sql
-- جدول تسجيل العمليات موجود بالفعل
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES employees(id),
    actor_name VARCHAR(150),
    action VARCHAR(255),
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- سجل العمليات الحساسة:
-- ✓ تسجيل الدخول
-- ✓ تغيير كلمات المرور
-- ✓ حذف الموظفين
-- ✓ تعديل الرواتب
-- ✓ منح الصلاحيات
```

### تفعيل سجل العمليات

```javascript
// في كل عملية حساسة
async function logAction(actorId, action, detail) {
    await pool.query(
        `INSERT INTO audit_log (actor_id, actor_name, action, detail)
         VALUES ($1, $2, $3, $4)`,
        [actorId, actorName, action, detail]
    );
}

// أثناء تسجيل الدخول
await logAction(employee.id, 'LOGIN', `Logged in from IP: ${req.ip}`);

// أثناء تعديل الراتب
await logAction(admin.id, 'UPDATE_SALARY', 
    `Changed salary for ${employee.name} from ${oldSalary} to ${newSalary}`);
```

---

## 🛡️ مراقبة الأمان

### تنبيهات أمنية

```sql
-- جدول التنبيهات الأمنية موجود
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100),
    employee_id UUID REFERENCES employees(id),
    username VARCHAR(100),
    detail TEXT,
    severity VARCHAR(20), -- low, medium, high
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### تنبيهات يجب تفعيلها

```javascript
// 1. محاولات دخول فاشلة متعددة
async function logFailedLogin(username) {
    await pool.query(
        `INSERT INTO security_alerts (type, username, detail, severity)
         VALUES ($1, $2, $3, $4)`,
        ['FAILED_LOGIN', username, `Failed login attempt for ${username}`, 'medium']
    );
}

// 2. تسجيل دخول من جهاز غير معروف
async function detectUnknownDevice(employeeId, deviceSignature) {
    const existing = await pool.query(
        'SELECT device_signature FROM employees WHERE id = $1',
        [employeeId]
    );
    
    if (existing.rows[0].device_signature !== deviceSignature) {
        await pool.query(
            `INSERT INTO security_alerts (type, employee_id, detail, severity)
             VALUES ($1, $2, $3, $4)`,
            ['UNKNOWN_DEVICE', employeeId, 'Login from unknown device', 'high']
        );
    }
}

// 3. تعديلات سريعة متعددة
async function detectAnomalousActivity(employeeId) {
    const recentChanges = await pool.query(
        `SELECT COUNT(*) FROM audit_log 
         WHERE actor_id = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
        [employeeId]
    );
    
    if (recentChanges.rows[0].count > 10) {
        await pool.query(
            `INSERT INTO security_alerts (type, employee_id, detail, severity)
             VALUES ($1, $2, $3, $4)`,
            ['ANOMALOUS_ACTIVITY', employeeId, 'Suspicious activity detected', 'high']
        );
    }
}
```

---

## 📊 نسخ احتياطية آمنة

### إنشاء نسخة احتياطية

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL=$DATABASE_URL

# إنشاء النسخة
pg_dump $DATABASE_URL | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"

# حذف النسخ القديمة (أكثر من 30 يوم)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# طباعة النتيجة
echo "Backup created: $BACKUP_DIR/backup_$DATE.sql.gz"
```

### جدولة النسخ الاحتياطية

```bash
# في crontab
# كل يوم الساعة 2 صباحاً
0 2 * * * /home/user/backup.sh

# كل ساعة
0 * * * * /home/user/backup.sh
```

### اختبار استعادة النسخة

```bash
# قبل الإنتاج
# اختبر استعادة النسخة بانتظام
pg_restore --create backup.sql.gz -d test_db
```

---

## 🌐 CORS و طلبات الشبكة

### إعدادات CORS الآمنة

```javascript
app.use(cors({
    // قائمة بيضاء للنطاقات المسموحة
    origin: [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://app.yourdomain.com'
    ],
    
    // السماح بالبيانات المعتمدة
    credentials: true,
    
    // الحد من الطرق المسموحة
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    
    // رؤوس مسموحة
    allowedHeaders: ['Content-Type', 'Authorization'],
    
    // مدة التخزين المؤقت
    maxAge: 3600
}));
```

---

## 🔑 إدارة المفاتيح والسرار

### متغيرات البيئة الحساسة

```bash
# تأكد من عدم نسخ هذه في Git
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "credentials.json" >> .gitignore
echo "keys/" >> .gitignore
```

### أمثلة المفاتيح

```env
# قاعدة البيانات
DATABASE_URL=postgresql://...

# كلمات السر
SESSION_SECRET=your-random-secret-key-here-very-long
JWT_SECRET=another-random-secret-key

# API Keys (إن وجدت)
SENDGRID_API_KEY=...
STRIPE_API_KEY=...

# الإعدادات
ALLOWED_ORIGINS=https://yourdomain.com
```

---

## ✅ قائمة التدقيق الأمني

### قبل الإنتاج

- [ ] تم تغيير كلمة المرور الافتراضية
- [ ] تم تفعيل HTTPS
- [ ] تم تعيين ALLOWED_ORIGINS الصحيح
- [ ] تم حذف جميع سجلات التصحيح
- [ ] تم تعطيل وضع التطوير
- [ ] تم إعداد النسخ الاحتياطية
- [ ] تم إعداد مراقبة الأمان
- [ ] تم تحديث جميع المكتبات
- [ ] تم اختبار الأمان من مستخدم عادي

### عملياً يومياً

- [ ] مراجعة السجلات الأمنية
- [ ] التحقق من التنبيهات
- [ ] اختبار العمليات الحساسة
- [ ] مراقبة الأداء والموارد

---

## 📞 الاستجابة للحوادث الأمنية

### عند اكتشاف خرق أمني:

1. **العزل الفوري**
   ```bash
   # أوقف الخادم
   docker-compose down
   
   # منع الوصول إلى قاعدة البيانات
   # تغيير كلمات المرور الفوري
   ```

2. **التحقيق**
   ```bash
   # عرض السجلات
   docker-compose logs app > security_incident.log
   
   # فحص قاعدة البيانات
   psql $DATABASE_URL < audit_check.sql
   ```

3. **الإجراء التصحيحي**
   - إعادة تشغيل النظام
   - تحديث كلمات المرور
   - إخطار المستخدمين

4. **الوقاية**
   - تحديد نقطة الضعف
   - تطبيق إصلاح الأمان
   - اختبار شامل

---

## 📚 موارد إضافية

### معايير الأمان
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [PCI DSS](https://www.pcisecuritystandards.org/)

### أدوات الفحص
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)

---

**تذكر: الأمان عملية مستمرة وليست وجهة نهائية**

---
