#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const crypto = require("crypto");

// دوال التشفير
function randomSaltHex() {
    return crypto.randomBytes(16).toString('hex');
}

async function hashPassword(password, saltHex) {
    return new Promise((resolve, reject) => {
        const salt = Buffer.from(saltHex, 'hex');
        crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, derivedKey) => {
            if (err) reject(err);
            resolve(derivedKey.toString('hex'));
        });
    });
}

async function makeCredential(plainPassword) {
    const salt = randomSaltHex();
    const passwordHash = await hashPassword(plainPassword, salt);
    return { salt, passwordHash };
}

async function setup() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log("🔄 جاري الاتصال بقاعدة البيانات...\n");
        await client.connect();
        console.log("✅ تم الاتصال بنجاح\n");

        // قراءة ملف Schema
        console.log("📋 جاري إنشاء الجداول...");
        const schemaPath = path.join(__dirname, "schema.sql");
        const schema = fs.readFileSync(schemaPath, "utf8");

        // تنفيذ الـ Schema
        await client.query(schema);
        console.log("✅ تم إنشاء الجداول بنجاح\n");

        // إنشاء بيانات افتراضية
        console.log("📝 جاري إنشاء البيانات الأولية...\n");

        // إنشاء فرع افتراضي
        const branchId = crypto.randomUUID();
        await client.query(
            "INSERT INTO branches (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [branchId, "الفرع الرئيسي", ""]
        );

        // إنشاء مسؤول افتراضي
        const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin@123";
        const adminCred = await makeCredential(adminPassword);

        await client.query(
            `INSERT INTO employees (
                id, username, password_hash, password_salt, name, role, branch_id, 
                position, monthly_salary, hire_date, active, annual_leave_balance
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (username) DO NOTHING`,
            [
                crypto.randomUUID(),
                "admin",
                adminCred.passwordHash,
                adminCred.salt,
                "مدير النظام",
                "super_admin",
                null,
                "مدير عام",
                0,
                new Date().toISOString().split('T')[0],
                true,
                0
            ]
        );

        // إدراج إعدادات افتراضية
        const defaultSettings = [
            ["companyName", JSON.stringify(process.env.DEFAULT_COMPANY_NAME || "Mura")],
            ["overtimeRate", JSON.stringify(1.5)],
            ["lateGraceMinutes", JSON.stringify(15)],
            ["allowedUnpaidAbsences", JSON.stringify(0)],
            ["payrollAutoCloseDay", JSON.stringify(3)],
            ["defaultAnnualLeave", JSON.stringify(21)]
        ];

        for (const [key, value] of defaultSettings) {
            await client.query(
                "INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [key, value]
            );
        }

        console.log("✅ تم إنشاء البيانات الأولية\n");
        console.log("=====================================");
        console.log("📊 ملخص الإعداد:");
        console.log("=====================================");
        console.log("✔ الجداول: تم إنشاؤها");
        console.log("✔ حساب الإدمن: admin");
        console.log(`✔ كلمة المرور: ${adminPassword}`);
        console.log(`✔ اسم الشركة: ${process.env.DEFAULT_COMPANY_NAME || "Mura"}`);
        console.log("=====================================\n");

        console.log("🎉 تم إعداد قاعدة البيانات بنجاح!\n");
        console.log("⚠️  تعليمات مهمة:");
        console.log("1. غيّر كلمة المرور الافتراضية عند أول استخدام");
        console.log("2. لا تستخدم كلمات مرور ضعيفة في الإنتاج");
        console.log("3. استخدم متغيرات البيئة المأمونة\n");

    } catch (error) {
        console.error("❌ فشل إعداد قاعدة البيانات:");
        console.error(error.message);
        process.exitCode = 1;

    } finally {
        await client.end();
        console.log("تم إغلاق الاتصال بقاعدة البيانات");
    }
}

// تشغيل الإعداد
setup();
