require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const { pool, testConnection, checkConnection } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

app.set("trust proxy", 1); // ضروري خلف Railway/Render/أي proxy عشان rate-limit و IP الصحيح

// =========================================
// MIDDLEWARE
// =========================================

const allowedOrigins = process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== "*"
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
    : true; // true = يسمح بأي أصل (مناسب أثناء الإعداد الأول)

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
});

// حد للطلبات لمنع إساءة الاستخدام (لا يؤثر على الاستخدام الطبيعي)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "طلبات كثيرة جداً، حاول بعد قليل" },
});
app.use("/api/", apiLimiter);

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =========================================
// STATIC
// =========================================
app.use(express.static(path.join(__dirname, "public")));

// =========================================
// HEALTH CHECK
// =========================================
app.get("/api/health", async (req, res) => {
    try {
        const isConnected = await checkConnection();
        if (!isConnected) {
            return res.status(503).json({ success: false, message: "قاعدة البيانات غير متاحة", database: "disconnected" });
        }
        const result = await pool.query("SELECT NOW() AS time");
        res.json({
            success: true,
            message: "الخادم وقاعدة البيانات يعملان بشكل صحيح",
            database: "connected",
            time: result.rows[0].time,
            environment: NODE_ENV,
        });
    } catch (error) {
        console.error("HEALTH ERROR:", error);
        res.status(500).json({ success: false, error: NODE_ENV === "production" ? "Internal Server Error" : error.message });
    }
});

// =========================================
// GET /api/db — إرجاع قاعدة البيانات كاملة
// كل استعلام يستخدم AS صريحة لضمان تطابق 100% مع أسماء الحقول
// التي تتوقعها الواجهة الأمامية (index.html)
// =========================================
app.get("/api/db", async (req, res) => {
    const client = await pool.connect();
    try {
        const [
            branches, employees, attendance, schedules, tasks,
            leaveRequests, transactions, disciplinary, payrollClosings,
            notifications, securityAlerts, auditLog, settingsRows
        ] = await Promise.all([
            client.query(`SELECT id, name, address, lat, lng, radius, created_at AS "createdAt"
                          FROM branches ORDER BY created_at`),

            client.query(`SELECT id, username, password_hash AS "passwordHash", password_salt AS "salt",
                          name, role, branch_id AS "branchId", position, phone,
                          monthly_salary AS "monthlySalary", hire_date AS "hireDate", active,
                          annual_leave_balance AS "annualLeaveBalance",
                          registered_device AS "registeredDevice",
                          active_login_device_sig AS "activeLoginDeviceSig",
                          active_session_token AS "activeSessionToken",
                          active_session_at AS "activeSessionAt",
                          failed_attempts AS "failedAttempts",
                          locked_until AS "lockedUntil",
                          created_at AS "createdAt"
                          FROM employees ORDER BY created_at`),

            client.query(`SELECT id, employee_id AS "employeeId", branch_id AS "branchId",
                          date, to_char(clock_in, 'HH24:MI') AS "clockIn",
                          to_char(clock_out, 'HH24:MI') AS "clockOut",
                          clock_in_loc AS "clockInLoc", clock_out_loc AS "clockOutLoc",
                          device_sig AS "deviceSig", manual_by AS "manualBy", notes
                          FROM attendance ORDER BY date DESC LIMIT 20000`),

            client.query(`SELECT id, employee_id AS "employeeId", date,
                          shift_type AS "shiftType", to_char(shift_start, 'HH24:MI') AS "shiftStart",
                          to_char(shift_end, 'HH24:MI') AS "shiftEnd", notes
                          FROM schedules ORDER BY date DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", title, description, status,
                          frequency, due_date AS "dueDate", assigned_date AS "assignedDate",
                          completed_at AS "completedAt"
                          FROM tasks ORDER BY created_at DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", leave_type AS "leaveType",
                          from_date AS "fromDate", to_date AS "toDate", days, reason, status,
                          decided_by AS "decidedBy", decided_at AS "decidedAt",
                          requested_at AS "requestedAt"
                          FROM leave_requests ORDER BY requested_at DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", type, amount, reason, date,
                          month, status, is_auto AS "isAuto", auto_ref AS "autoRef"
                          FROM transactions ORDER BY date DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", type, description,
                          penalty_amount AS "penaltyAmount", date, month, issued_by AS "issuedBy"
                          FROM disciplinary ORDER BY date DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", month,
                          base_salary AS "baseSalary", overtime_total AS "overtimeTotal",
                          advances_total AS "advancesTotal", deductions_total AS "deductionsTotal",
                          penalties_total AS "penaltiesTotal", net_pay AS "netPay", status,
                          closed_by AS "closedBy", auto, closed_at AS "closedAt"
                          FROM payroll_closings ORDER BY month DESC`),

            client.query(`SELECT id, employee_id AS "employeeId", title, body, type,
                          is_read AS "read", created_at AS "createdAt"
                          FROM notifications ORDER BY created_at DESC LIMIT 3000`),

            client.query(`SELECT id, type, employee_id AS "employeeId", username,
                          branch_id AS "branchId", detail, severity, acknowledged,
                          created_at AS "createdAt"
                          FROM security_alerts ORDER BY created_at DESC LIMIT 2000`),

            client.query(`SELECT id, actor_id AS "actorId", actor_name AS "actorName",
                          action, detail, created_at AS "createdAt"
                          FROM audit_log ORDER BY created_at DESC LIMIT 2000`),

            client.query(`SELECT setting_key, setting_value FROM settings`),
        ]);

        const settings = {};
        settingsRows.rows.forEach((row) => {
            try { settings[row.setting_key] = JSON.parse(row.setting_value); }
            catch { settings[row.setting_key] = row.setting_value; }
        });

        res.json({
            success: true,
            db: {
                schemaVersion: 3,
                settings: Object.assign({
                    companyName: "Mura",
                    overtimeRate: 1.5,
                    lateGraceMinutes: 15,
                    allowedUnpaidAbsences: 0,
                    payrollAutoCloseDay: 3,
                    defaultAnnualLeave: 21,
                }, settings),
                branches: branches.rows,
                employees: employees.rows,
                attendance: attendance.rows,
                schedules: schedules.rows,
                tasks: tasks.rows,
                leaveRequests: leaveRequests.rows,
                transactions: transactions.rows,
                disciplinary: disciplinary.rows,
                payrollClosings: payrollClosings.rows,
                notifications: notifications.rows,
                securityAlerts: securityAlerts.rows,
                auditLog: auditLog.rows,
            },
        });
    } catch (error) {
        console.error("GET /api/db ERROR:", error);
        res.status(500).json({ success: false, error: NODE_ENV === "production" ? "Database Error" : error.message });
    } finally {
        client.release();
    }
});

// =========================================
// PUT /api/db — حفظ قاعدة البيانات كاملة
// الفرونت إند يبعت كل الـ DB في كل مرة (persist())، فبنعمل UPSERT
// لكل عنصر، وبعدين نحذف من الجداول القابلة للحذف أي صف مش موجود
// في المصفوفة المرسلة (مزامنة حذف حقيقية بدل تراكم بيانات ميتة).
// =========================================
app.put("/api/db", async (req, res) => {
    const client = await pool.connect();
    const DB = req.body;

    if (!DB || typeof DB !== "object") {
        client.release();
        return res.status(400).json({ success: false, error: "Invalid database payload" });
    }

    try {
        await client.query("BEGIN");

        // ---------- SETTINGS ----------
        if (DB.settings) {
            for (const [key, value] of Object.entries(DB.settings)) {
                await client.query(
                    `INSERT INTO settings (setting_key, setting_value, updated_at)
                     VALUES ($1, $2, CURRENT_TIMESTAMP)
                     ON CONFLICT (setting_key) DO UPDATE SET
                       setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP`,
                    [key, JSON.stringify(value)]
                );
            }
        }

        // ---------- BRANCHES (upsert فقط هنا؛ الحذف الفعلي في آخر الترانزاكشن) ----------
        const branchIds = [];
        for (const b of DB.branches || []) {
            branchIds.push(b.id);
            await client.query(
                `INSERT INTO branches (id, name, address, lat, lng, radius, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                   name=EXCLUDED.name, address=EXCLUDED.address, lat=EXCLUDED.lat,
                   lng=EXCLUDED.lng, radius=EXCLUDED.radius, updated_at=CURRENT_TIMESTAMP`,
                [b.id, b.name, b.address || null, b.lat ?? null, b.lng ?? null, b.radius ?? 100]
            );
        }

        // ---------- EMPLOYEES (بدون حذف — النظام يعطّل بدل ما يحذف) ----------
        for (const e of DB.employees || []) {
            await client.query(
                `INSERT INTO employees (
                    id, username, password_hash, password_salt, name, role, branch_id, position,
                    phone, monthly_salary, hire_date, active, annual_leave_balance,
                    registered_device, active_login_device_sig, active_session_token,
                    active_session_at, failed_attempts, locked_until, updated_at
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    username=EXCLUDED.username, password_hash=EXCLUDED.password_hash,
                    password_salt=EXCLUDED.password_salt, name=EXCLUDED.name, role=EXCLUDED.role,
                    branch_id=EXCLUDED.branch_id, position=EXCLUDED.position, phone=EXCLUDED.phone,
                    monthly_salary=EXCLUDED.monthly_salary, hire_date=EXCLUDED.hire_date,
                    active=EXCLUDED.active, annual_leave_balance=EXCLUDED.annual_leave_balance,
                    registered_device=EXCLUDED.registered_device,
                    active_login_device_sig=EXCLUDED.active_login_device_sig,
                    active_session_token=EXCLUDED.active_session_token,
                    active_session_at=EXCLUDED.active_session_at,
                    failed_attempts=EXCLUDED.failed_attempts, locked_until=EXCLUDED.locked_until,
                    updated_at=CURRENT_TIMESTAMP`,
                [
                    e.id, e.username, e.passwordHash, e.salt, e.name, e.role, e.branchId || null,
                    e.position || null, e.phone || null, e.monthlySalary || 0, e.hireDate || null,
                    e.active ?? true, e.annualLeaveBalance || 0,
                    e.registeredDevice ? JSON.stringify(e.registeredDevice) : null,
                    e.activeLoginDeviceSig || null, e.activeSessionToken || null,
                    e.activeSessionAt ?? null, e.failedAttempts || 0, e.lockedUntil ?? null,
                ]
            );
        }

        // ---------- ATTENDANCE ----------
        const attendanceIds = [];
        for (const a of DB.attendance || []) {
            attendanceIds.push(a.id);
            await client.query(
                `INSERT INTO attendance (
                    id, employee_id, branch_id, date, clock_in, clock_out,
                    clock_in_loc, clock_out_loc, device_sig, manual_by, notes, updated_at
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
                 ON CONFLICT (employee_id, date) DO UPDATE SET
                    id = EXCLUDED.id, branch_id=EXCLUDED.branch_id, clock_in=EXCLUDED.clock_in,
                    clock_out=EXCLUDED.clock_out, clock_in_loc=EXCLUDED.clock_in_loc,
                    clock_out_loc=EXCLUDED.clock_out_loc, device_sig=EXCLUDED.device_sig,
                    manual_by=EXCLUDED.manual_by, notes=EXCLUDED.notes, updated_at=CURRENT_TIMESTAMP`,
                [
                    a.id, a.employeeId, a.branchId || null, a.date, a.clockIn || null, a.clockOut || null,
                    a.clockInLoc ? JSON.stringify(a.clockInLoc) : null,
                    a.clockOutLoc ? JSON.stringify(a.clockOutLoc) : null,
                    a.deviceSig || null, a.manualBy || null, a.notes || null,
                ]
            );
        }
        await client.query(`DELETE FROM attendance WHERE NOT (id = ANY($1::uuid[]))`, [attendanceIds]);

        // ---------- SCHEDULES ----------
        const scheduleIds = [];
        for (const s of DB.schedules || []) {
            scheduleIds.push(s.id);
            await client.query(
                `INSERT INTO schedules (id, employee_id, date, shift_type, shift_start, shift_end, notes, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
                 ON CONFLICT (employee_id, date) DO UPDATE SET
                    id=EXCLUDED.id, shift_type=EXCLUDED.shift_type, shift_start=EXCLUDED.shift_start,
                    shift_end=EXCLUDED.shift_end, notes=EXCLUDED.notes, updated_at=CURRENT_TIMESTAMP`,
                [s.id, s.employeeId, s.date, s.shiftType || null, s.shiftStart || null, s.shiftEnd || null, s.notes || null]
            );
        }
        await client.query(`DELETE FROM schedules WHERE NOT (id = ANY($1::uuid[]))`, [scheduleIds]);

        // ---------- TASKS ----------
        const taskIds = [];
        for (const t of DB.tasks || []) {
            taskIds.push(t.id);
            await client.query(
                `INSERT INTO tasks (id, employee_id, title, description, status, frequency, due_date, assigned_date, completed_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    title=EXCLUDED.title, description=EXCLUDED.description, status=EXCLUDED.status,
                    frequency=EXCLUDED.frequency, due_date=EXCLUDED.due_date,
                    assigned_date=EXCLUDED.assigned_date, completed_at=EXCLUDED.completed_at,
                    updated_at=CURRENT_TIMESTAMP`,
                [t.id, t.employeeId, t.title, t.description || null, t.status || "قيد التنفيذ",
                 t.frequency || null, t.dueDate || null, t.assignedDate || null, t.completedAt || null]
            );
        }
        await client.query(`DELETE FROM tasks WHERE NOT (id = ANY($1::uuid[]))`, [taskIds]);

        // ---------- LEAVE REQUESTS (بدون حذف) ----------
        for (const l of DB.leaveRequests || []) {
            await client.query(
                `INSERT INTO leave_requests (id, employee_id, leave_type, from_date, to_date, days, reason, status, decided_by, decided_at, requested_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    leave_type=EXCLUDED.leave_type, from_date=EXCLUDED.from_date, to_date=EXCLUDED.to_date,
                    days=EXCLUDED.days, reason=EXCLUDED.reason, status=EXCLUDED.status,
                    decided_by=EXCLUDED.decided_by, decided_at=EXCLUDED.decided_at, updated_at=CURRENT_TIMESTAMP`,
                [l.id, l.employeeId, l.leaveType || null, l.fromDate, l.toDate, l.days || 0,
                 l.reason || null, l.status || "معلقة", l.decidedBy || null, l.decidedAt || null,
                 l.requestedAt || new Date().toISOString()]
            );
        }

        // ---------- TRANSACTIONS ----------
        const txIds = [];
        for (const t of DB.transactions || []) {
            txIds.push(t.id);
            await client.query(
                `INSERT INTO transactions (id, employee_id, type, amount, reason, date, month, status, is_auto, auto_ref, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    type=EXCLUDED.type, amount=EXCLUDED.amount, reason=EXCLUDED.reason,
                    date=EXCLUDED.date, month=EXCLUDED.month, status=EXCLUDED.status,
                    is_auto=EXCLUDED.is_auto, auto_ref=EXCLUDED.auto_ref, updated_at=CURRENT_TIMESTAMP`,
                [t.id, t.employeeId, t.type, t.amount || 0, t.reason || null, t.date,
                 t.month || (t.date ? String(t.date).slice(0, 7) : null), t.status || "معلق",
                 t.isAuto || false, t.autoRef || null]
            );
        }
        await client.query(`DELETE FROM transactions WHERE NOT (id = ANY($1::uuid[]))`, [txIds]);

        // ---------- DISCIPLINARY ----------
        const discIds = [];
        for (const d of DB.disciplinary || []) {
            discIds.push(d.id);
            await client.query(
                `INSERT INTO disciplinary (id, employee_id, type, description, penalty_amount, date, month, issued_by, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    type=EXCLUDED.type, description=EXCLUDED.description,
                    penalty_amount=EXCLUDED.penalty_amount, date=EXCLUDED.date,
                    month=EXCLUDED.month, issued_by=EXCLUDED.issued_by, updated_at=CURRENT_TIMESTAMP`,
                [d.id, d.employeeId, d.type, d.description || null, d.penaltyAmount || 0, d.date,
                 d.month || (d.date ? String(d.date).slice(0, 7) : null), d.issuedBy || null]
            );
        }
        await client.query(`DELETE FROM disciplinary WHERE NOT (id = ANY($1::uuid[]))`, [discIds]);

        // ---------- PAYROLL CLOSINGS ----------
        const payrollIds = [];
        for (const p of DB.payrollClosings || []) {
            payrollIds.push(p.id);
            await client.query(
                `INSERT INTO payroll_closings (id, employee_id, month, base_salary, overtime_total, advances_total, deductions_total, penalties_total, net_pay, status, closed_by, auto, closed_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP)
                 ON CONFLICT (employee_id, month) DO UPDATE SET
                    id=EXCLUDED.id, base_salary=EXCLUDED.base_salary, overtime_total=EXCLUDED.overtime_total,
                    advances_total=EXCLUDED.advances_total, deductions_total=EXCLUDED.deductions_total,
                    penalties_total=EXCLUDED.penalties_total, net_pay=EXCLUDED.net_pay,
                    status=EXCLUDED.status, closed_by=EXCLUDED.closed_by, auto=EXCLUDED.auto,
                    closed_at=EXCLUDED.closed_at, updated_at=CURRENT_TIMESTAMP`,
                [p.id, p.employeeId, p.month, p.baseSalary || 0, p.overtimeTotal || 0,
                 p.advancesTotal || 0, p.deductionsTotal || 0, p.penaltiesTotal || 0, p.netPay || 0,
                 p.status || "مقفول", p.closedBy || null, p.auto || false,
                 p.closedAt || new Date().toISOString()]
            );
        }
        await client.query(`DELETE FROM payroll_closings WHERE NOT (id = ANY($1::uuid[]))`, [payrollIds]);

        // ---------- NOTIFICATIONS (بدون حذف) ----------
        for (const n of DB.notifications || []) {
            await client.query(
                `INSERT INTO notifications (id, employee_id, title, body, type, is_read, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    is_read=EXCLUDED.is_read, updated_at=CURRENT_TIMESTAMP`,
                [n.id, n.employeeId, n.title, n.body || null, n.type || null,
                 n.read ?? n.isRead ?? false, n.createdAt || new Date().toISOString()]
            );
        }

        // ---------- SECURITY ALERTS (بدون حذف) ----------
        for (const s of DB.securityAlerts || []) {
            await client.query(
                `INSERT INTO security_alerts (id, type, employee_id, username, branch_id, detail, severity, acknowledged, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET
                    acknowledged=EXCLUDED.acknowledged, updated_at=CURRENT_TIMESTAMP`,
                [s.id, s.type, s.employeeId || null, s.username || null, s.branchId || null,
                 s.detail || null, s.severity || "medium", s.acknowledged || false,
                 s.createdAt || new Date().toISOString()]
            );
        }

        // ---------- AUDIT LOG (append-only، بدون تحديث أو حذف) ----------
        for (const a of DB.auditLog || []) {
            await client.query(
                `INSERT INTO audit_log (id, actor_id, actor_name, action, detail, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6)
                 ON CONFLICT (id) DO NOTHING`,
                [a.id, a.actorId || null, a.actorName || "نظام", a.action || null,
                 a.detail || null, a.createdAt || new Date().toISOString()]
            );
        }

        // ---------- BRANCHES DELETE (آخر خطوة عمداً) ----------
        // بعد ما كل الجداول اللي بتشاور على branch_id (employees, attendance,
        // security_alerts) اتحدّثت فوق، دلوقتي حذف أي فرع مش موجود في القائمة
        // آمن 100%: ON DELETE SET NULL هيصفّر branch_id تلقائياً بدل ما يطلع error.
        await client.query(`DELETE FROM branches WHERE NOT (id = ANY($1::uuid[]))`, [branchIds]);

        await client.query("COMMIT");
        res.json({ success: true, message: "تم حفظ البيانات بنجاح" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("PUT /api/db ERROR:", error);
        res.status(500).json({ success: false, error: NODE_ENV === "production" ? "Database Error" : error.message });
    } finally {
        client.release();
    }
});

// =========================================
// SPA FALLBACK
// =========================================
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================================
// ERROR HANDLING
// =========================================
app.use((err, req, res, next) => {
    console.error("UNHANDLED ERROR:", err);
    res.status(500).json({ success: false, error: NODE_ENV === "production" ? "Internal Server Error" : err.message });
});

// =========================================
// START
// =========================================
const server = app.listen(PORT, "0.0.0.0", async () => {
    console.log(`\n🚀 خادم H-HR يعمل على المنفذ ${PORT}`);
    console.log(`📍 البيئة: ${NODE_ENV}\n`);
    const ok = await testConnection();
    if (!ok) console.error("❌ تحذير: قاعدة البيانات غير متصلة عند الإقلاع!");
});

process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully");
    server.close(() => { pool.end(); process.exit(0); });
});

module.exports = app;
