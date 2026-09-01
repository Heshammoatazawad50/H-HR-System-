require("dotenv").config();
const { Pool, types } = require("pg");

// =====================================================
// معالجة أنواع البيانات الرقمية
// =====================================================
// حقول active_session_at و locked_until مخزّنة كـ BIGINT (epoch ms)
// افتراضياً pg يرجّعها كـ string لتفادي فقدان الدقة، نحولها هنا لرقم
// صريح لأن قيم الوقت (milliseconds) آمنة تماماً ضمن حدود JS Number.
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10))); // int8/BIGINT

// حقول DECIMAL/NUMERIC (الرواتب، الإحداثيات، المبالغ...) يرجعها pg كنص افتراضياً
// عشان الفرونت إند بيستخدم دوال زي .toFixed() مباشرة عليها، لازم تكون أرقام حقيقية
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val))); // numeric/decimal

// حقول DATE يحوّلها pg افتراضياً لكائن Date UTC، وعند تحويله لـ JSON يطلع
// "2026-09-05T00:00:00.000Z" بدل "2026-09-05" فتنكسر مقارنات النصوص
// (مثال: isOnApprovedLeave بتقارن dateStr >= l.fromDate كنصوص). نخليه نص خام.
types.setTypeParser(1082, (val) => val); // date

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
    console.error("⚠️  خطأ غير متوقع في اتصال قاعدة البيانات:", err.message);
});

async function testConnection() {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        console.log("✅ PostgreSQL متصل بنجاح —", result.rows[0].now);
        return true;
    } catch (error) {
        console.error("❌ فشل الاتصال بـ PostgreSQL:", error.message);
        return false;
    }
}

async function checkConnection() {
    try {
        await pool.query("SELECT 1");
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = { pool, testConnection, checkConnection };
