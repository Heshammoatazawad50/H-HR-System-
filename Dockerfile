# المرحلة الأولى: البناء
FROM node:20-alpine AS builder

WORKDIR /app

# نسخ ملفات الحزم
COPY package*.json ./

# تثبيت المتطلبات
RUN npm ci --only=production

# المرحلة الثانية: التشغيل
FROM node:20-alpine

WORKDIR /app

# متغيرات البيئة الافتراضية
ENV NODE_ENV=production
ENV PORT=3000

# نسخ node_modules من مرحلة البناء
COPY --from=builder /app/node_modules ./node_modules

# نسخ ملفات التطبيق
COPY package*.json ./
COPY server.js .
COPY database.js .
COPY setup-db.js .
COPY schema.sql .
COPY index.html ./public/
COPY public/ ./public/

# إنشاء مجلد public إذا لم يكن موجوداً
RUN mkdir -p public

# كشف المنفذ
EXPOSE 3000

# تشغيل صحي
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# تشغيل التطبيق
CMD ["node", "server.js"]
