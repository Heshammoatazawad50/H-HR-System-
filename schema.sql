-- =====================================================
-- H-HR Database Schema (v3) - متطابق تماماً مع الفرونت إند
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============== الفروع ===============
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    radius INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الموظفون ===============
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    position VARCHAR(150),
    phone VARCHAR(50),
    monthly_salary DECIMAL(12,2) DEFAULT 0,
    hire_date DATE,
    active BOOLEAN DEFAULT TRUE,
    annual_leave_balance DECIMAL(6,2) DEFAULT 0,
    registered_device JSONB,
    active_login_device_sig VARCHAR(255),
    active_session_token VARCHAR(255),
    active_session_at BIGINT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until BIGINT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الحضور والانصراف ===============
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    clock_in_loc JSONB,
    clock_out_loc JSONB,
    device_sig VARCHAR(255),
    manual_by VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- =============== الجداول الأسبوعية ===============
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type VARCHAR(100),
    shift_start TIME,
    shift_end TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- =============== المهام ===============
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'قيد التنفيذ',
    frequency VARCHAR(50),
    due_date DATE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== طلبات الإجازات ===============
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days DECIMAL(6,2) DEFAULT 0,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'معلقة',
    decided_by VARCHAR(150),
    decided_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الحركات المالية ===============
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) DEFAULT 0,
    reason TEXT,
    date DATE NOT NULL,
    month VARCHAR(7),
    status VARCHAR(50) DEFAULT 'معلق',
    is_auto BOOLEAN DEFAULT FALSE,
    auto_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الجزاءات التأديبية ===============
CREATE TABLE IF NOT EXISTS disciplinary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    penalty_amount DECIMAL(12,2) DEFAULT 0,
    date DATE NOT NULL,
    month VARCHAR(7),
    issued_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== تقفيل المرتبات ===============
CREATE TABLE IF NOT EXISTS payroll_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL,
    base_salary DECIMAL(12,2) DEFAULT 0,
    overtime_total DECIMAL(12,2) DEFAULT 0,
    advances_total DECIMAL(12,2) DEFAULT 0,
    deductions_total DECIMAL(12,2) DEFAULT 0,
    penalties_total DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'مقفول',
    closed_by VARCHAR(150),
    auto BOOLEAN DEFAULT FALSE,
    closed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month)
);

-- =============== الإشعارات ===============
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== التنبيهات الأمنية ===============
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    username VARCHAR(100),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    detail TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    acknowledged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== سجل العمليات ===============
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    action VARCHAR(255),
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الإعدادات ===============
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============== الفهارس ===============
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_tasks_employee ON tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id, is_read);
CREATE INDEX IF NOT EXISTS idx_transactions_employee_month ON transactions(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_disciplinary_employee_month ON disciplinary(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_month ON payroll_closings(employee_id, month);
CREATE INDEX IF NOT EXISTS idx_security_alerts_ack ON security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
