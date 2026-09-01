# 🚀 دليل نشر نظام H-HR

هذا الدليل يشرح كيفية نشر النظام على خدمات الاستضافة المختلفة.

---

## 📋 قبل البدء

تأكد من توفر:
- [ ] حساب على خدمة الاستضافة
- [ ] حساب على خدمة قاعدة البيانات
- [ ] نطاق مخصص (اختياري)
- [ ] شهادة SSL (تلقائياً في معظم الخدمات)

---

## 1️⃣ الخيار الأول: Railway (⭐ الأسهل والأفضل)

### المميزات:
- ✅ تطبيق سهل جداً (5 دقائق)
- ✅ قاعدة بيانات PostgreSQL مرفقة
- ✅ SSL تلقائي
- ✅ سعر رخيص ($5-10/شهر)

### الخطوات:

#### 1. إنشاء حساب Railway
```
👉 اذهب إلى https://railway.app
اختر "Deploy with GitHub"
وافق على الأذونات
```

#### 2. ربط مستودع GitHub

```
اختر: "Create a new project"
اختر: "Deploy from GitHub repo"
اختر مستودعك
```

#### 3. إضافة قاعدة البيانات

```
اضغط: "Add Service"
اختر: "PostgreSQL"
سيتم إنشاء قاعدة بيانات جديدة تلقائياً
```

#### 4. تكوين متغيرات البيئة

في لوحة Railway:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<سيتم ملؤه تلقائياً من PostgreSQL>
ALLOWED_ORIGINS=<نطاقك>.railway.app
DEFAULT_ADMIN_PASSWORD=Admin@123
```

#### 5. النشر

```
يتم النشر تلقائياً عند رفع الكود إلى GitHub
⏳ الانتظار 2-3 دقائق
✅ زيارة: https://<project-name>.railway.app
```

**التكلفة**: $5-10/شهر

---

## 2️⃣ الخيار الثاني: Render

### المميزات:
- ✅ مجاني (حتى حدود معينة)
- ✅ PostgreSQL مجاني
- ✅ سهل التشغيل

### الخطوات:

#### 1. إنشاء حساب
```
👉 اذهب إلى https://render.com
سجل الدخول بـ GitHub
```

#### 2. إنشاء Web Service

```
اضغط: "New+" > "Web Service"
اختر مستودعك
Fill the form:
  - Name: h-hr
  - Environment: Node
  - Build Command: npm ci
  - Start Command: npm start
```

#### 3. إضافة PostgreSQL

```
اضغط: "New+" > "PostgreSQL"
اسم: h-hr-db
استخدم الإعدادات الافتراضية
```

#### 4. ربط قاعدة البيانات

في Web Service:
```
Environment Variables:
NODE_ENV=production
DATABASE_URL=<من إعدادات PostgreSQL>
```

**التكلفة**: مجاني (مع تحديدات)

---

## 3️⃣ الخيار الثالث: Heroku (الخيار التقليدي)

### الخطوات:

#### 1. تثبيت Heroku CLI

```bash
# ماك
brew tap heroku/brew && brew install heroku

# ويندوز
choco install heroku

# لينكس
curl https://cli-assets.heroku.com/install.sh | sh
```

#### 2. تسجيل الدخول

```bash
heroku login
```

#### 3. إنشاء تطبيق

```bash
heroku create h-hr-app
```

#### 4. إضافة قاعدة البيانات

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### 5. تعيين متغيرات البيئة

```bash
heroku config:set NODE_ENV=production
heroku config:set DEFAULT_ADMIN_PASSWORD=Admin@123
heroku config:set ALLOWED_ORIGINS=h-hr-app.herokuapp.com
```

#### 6. النشر

```bash
git push heroku main
```

#### 7. تشغيل الإعداد

```bash
heroku run npm run setup-db
```

**التكلفة**: $7-50/شهر

---

## 4️⃣ الخيار الرابع: Docker + خادم خاص (VPS)

### للمستخدمين المتقدمين

#### المتطلبات:
- VPS (DigitalOcean, Linode, AWS, إلخ)
- Docker و Docker Compose

#### الخطوات:

##### 1. إنشاء VPS

```bash
DigitalOcean: $6/شهر (الخادم)
  + قاعدة البيانات: مجاني (على نفس الخادم)
```

##### 2. الاتصال بالخادم

```bash
ssh root@<IP_ADDRESS>
```

##### 3. تثبيت Docker

```bash
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

##### 4. استنساخ المشروع

```bash
git clone https://github.com/your-repo/h-hr.git
cd h-hr
```

##### 5. تحضير متغيرات البيئة

```bash
nano .env
# أدخل بيانات قاعدة البيانات الآمنة
```

##### 6. تشغيل Docker Compose

```bash
docker-compose up -d
docker-compose exec app npm run setup-db
```

##### 7. إعداد Nginx كـ Reverse Proxy

```bash
# تثبيت Nginx
sudo apt-get update
sudo apt-get install nginx

# إنشاء ملف إعداد
sudo nano /etc/nginx/sites-available/h-hr
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

##### 8. تفعيل SSL بـ Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**التكلفة**: $6-20/شهر

---

## 5️⃣ الخيار الخامس: AWS (للشركات الكبيرة)

### الخدمات المستخدمة:
- **ECS**: تشغيل التطبيق (Docker)
- **RDS**: قاعدة البيانات PostgreSQL
- **ALB**: موازن الحمل
- **Route 53**: النطاق

### التكلفة:
$50-200/شهر (حسب الحمل)

### الخطوات:

1. إنشاء حساب AWS
2. إنشاء RDS (PostgreSQL)
3. تحزيم التطبيق كـ Docker image
4. رفع الصورة على ECR
5. إنشاء ECS task و service
6. إعداد Route 53 و CloudFront

> اطلب من فريق DevOps لمساعدتك

---

## ✅ قائمة التحقق بعد النشر

### الأمان:
- [ ] تفعيل HTTPS/SSL
- [ ] تغيير كلمة المرور الافتراضية
- [ ] تعيين `ALLOWED_ORIGINS` الصحيح
- [ ] إخفاء تفاصيل الخطأ في الإنتاج

### الأداء:
- [ ] اختبار سرعة الموقع
- [ ] تفعيل CDN (اختياري)
- [ ] إعداد caching

### المراقبة:
- [ ] إعداد تنبيهات الأخطاء
- [ ] مراقبة استهلاك البيانات
- [ ] تفعيل السجلات التفصيلية

### النسخ الاحتياطية:
- [ ] جدولة نسخ احتياطية يومية
- [ ] اختبار استعادة النسخة الاحتياطية

---

## 🔄 تحديث التطبيق

### عند Railway/Render/Heroku:

```bash
# 1. تطوير محلياً
git add .
git commit -m "Add new feature"
git push

# 2. يتم النشر تلقائياً
```

### على VPS مخصص:

```bash
# تحميل التحديثات
git pull origin main

# إعادة بناء Docker
docker-compose down
docker-compose up -d

# تنفيذ الترحيلات (إن وجدت)
docker-compose exec app npm run migrate
```

---

## 🐛 استكشاف الأخطاء

### الخطأ: "502 Bad Gateway"

**الحل:**
- تحقق من لوحة التحكم من الخدمة
- اعرض السجلات: `docker-compose logs app`
- تأكد من اتصال قاعدة البيانات

### الخطأ: "ربط الوصول مرفوض" (CORS)

**الحل:**
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### خطأ في قاعدة البيانات

**الحل:**
```bash
# اختبر الاتصال
psql $DATABASE_URL -c "SELECT 1"

# أعد الإعداد
docker-compose exec app npm run setup-db
```

---

## 📞 الدعم والمساعدة

### عند مواجهة مشاكل:

1. **اعرض السجلات:**
   ```bash
   docker-compose logs app
   docker-compose logs postgres
   ```

2. **اختبر الاتصال:**
   ```bash
   docker-compose exec app npm run setup-db
   curl http://localhost:3000/api/health
   ```

3. **اطلب الدعم:**
   - ضمّن الرسالة الخطأ الكاملة
   - أرسل screenshot من المشكلة

---

## 💡 نصائح مهمة

1. **استخدم نطاق مخصص:**
   - أرخص من الأنطقة الفرعية
   - احترافي أكثر
   - أفضل للـ SEO

2. **فعّل HTTPS:**
   - جميع الخدمات توفره مجاناً
   - ضروري للأمان

3. **استخدم CDN:**
   - Cloudflare مجاني
   - يحسّن السرعة والأمان

4. **مراقبة الأداء:**
   - استخدم Uptime Robot للتنبيهات
   - راقب استهلاك الموارد

---

## 🎯 الخطوات التالية

```
1. اختر خدمة الاستضافة المناسبة
2. اتبع خطوات النشر
3. اختبر التطبيق
4. أخبر الموظفين بـ URL الجديد
```

---

**نصيحة ذهبية:** ابدأ بـ Railway أو Render لسهولتهم، ثم انتقل إلى VPS مخصص عندما يزداد العدد.

---
