# WorkForce PostgreSQL Database Schema

The database `workforce_db` uses PostgreSQL 14+ with the `uuid-ossp` extension. Schema migrations are managed through TypeORM.

## Table Definitions

### 1. `users`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `full_name` VARCHAR(150) NOT NULL
- `email` VARCHAR(150) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `role` role_enum NOT NULL DEFAULT 'SUPERVISOR' ('ADMIN', 'SUPERVISOR')
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `last_login_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### 2. `work_sites`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` VARCHAR(150) NOT NULL
- `address` TEXT NOT NULL
- `description` TEXT
- `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### 3. `supervisor_sites`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `work_site_id` UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE
- `assigned_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- UNIQUE(user_id, work_site_id)

### 4. `departments`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` VARCHAR(100) UNIQUE NOT NULL
- `code` VARCHAR(50) UNIQUE
- `description` TEXT
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `created_at`, `updated_at` TIMESTAMPTZ

### 5. `skill_categories`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` VARCHAR(100) UNIQUE NOT NULL
- `description` TEXT
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `created_at`, `updated_at` TIMESTAMPTZ

### 6. `shifts`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `name` VARCHAR(100) NOT NULL
- `start_time` VARCHAR(10) NOT NULL
- `end_time` VARCHAR(10) NOT NULL
- `crosses_midnight` BOOLEAN NOT NULL DEFAULT false
- `description` TEXT
- `is_active` BOOLEAN NOT NULL DEFAULT true
- `created_at`, `updated_at` TIMESTAMPTZ

### 7. `workers`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_code` VARCHAR(50) UNIQUE NOT NULL
- `full_name` VARCHAR(150) NOT NULL
- `phone` VARCHAR(30) NOT NULL
- `email` VARCHAR(150)
- `address` TEXT NOT NULL
- `date_of_birth` DATE
- `gender` VARCHAR(20)
- `joining_date` DATE NOT NULL
- `department_id` UUID REFERENCES departments(id) ON DELETE SET NULL
- `skill_category_id` UUID REFERENCES skill_categories(id) ON DELETE SET NULL
- `employment_type` employment_type_enum NOT NULL DEFAULT 'DAILY_WAGE'
- `status` worker_status_enum NOT NULL DEFAULT 'ACTIVE'
- `emergency_contact` VARCHAR(150)
- `created_at`, `updated_at` TIMESTAMPTZ

### 8. `worker_assignments`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- `work_site_id` UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE
- `shift_id` UUID REFERENCES shifts(id) ON DELETE SET NULL
- `start_date` DATE NOT NULL
- `end_date` DATE
- `role_title` VARCHAR(100)
- `supervisor_id` UUID REFERENCES users(id) ON DELETE SET NULL
- `status` assignment_status_enum NOT NULL DEFAULT 'ACTIVE'
- `created_at`, `updated_at` TIMESTAMPTZ

### 9. `attendance`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- `work_site_id` UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE
- `shift_id` UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT
- `attendance_date` DATE NOT NULL
- `status` attendance_status_enum NOT NULL DEFAULT 'PRESENT'
- `check_in` VARCHAR(10)
- `check_out` VARCHAR(10)
- `overtime_minutes` INT NOT NULL DEFAULT 0
- `remarks` TEXT
- `marked_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `updated_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `finalized_at` TIMESTAMPTZ
- `finalized_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `created_at`, `updated_at` TIMESTAMPTZ
- UNIQUE(worker_id, attendance_date, shift_id)

### 10. `leave_requests`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- `work_site_id` UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE
- `leave_type` leave_type_enum NOT NULL DEFAULT 'CASUAL'
- `start_date` DATE NOT NULL
- `end_date` DATE NOT NULL
- `reason` TEXT NOT NULL
- `status` leave_status_enum NOT NULL DEFAULT 'PENDING'
- `reviewed_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `reviewed_at` TIMESTAMPTZ
- `review_remarks` TEXT
- `created_by` UUID NOT NULL REFERENCES users(id)
- `created_at`, `updated_at` TIMESTAMPTZ

### 11. `wage_rate_history`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- `wage_type` wage_type_enum NOT NULL DEFAULT 'DAILY'
- `rate` NUMERIC(12,2) NOT NULL
- `effective_from` DATE NOT NULL
- `effective_to` DATE
- `changed_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `notes` TEXT
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### 12. `worker_advances`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE
- `amount` NUMERIC(12,2) NOT NULL
- `remaining_balance` NUMERIC(12,2) NOT NULL
- `advance_date` DATE NOT NULL
- `reason` TEXT
- `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
- `approved_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `created_at`, `updated_at` TIMESTAMPTZ

### 13. `payroll_runs`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `period_start` DATE NOT NULL
- `period_end` DATE NOT NULL
- `status` payroll_status_enum NOT NULL DEFAULT 'DRAFT'
- `total_workers` INT NOT NULL DEFAULT 0
- `total_amount` NUMERIC(14,2) NOT NULL DEFAULT '0.00'
- `notes` TEXT
- `created_by` UUID NOT NULL REFERENCES users(id)
- `approved_by` UUID REFERENCES users(id) ON DELETE SET NULL
- `approved_at` TIMESTAMPTZ
- `created_at`, `updated_at` TIMESTAMPTZ

### 14. `payroll_items`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `payroll_run_id` UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE
- `worker_id` UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT
- `wage_type_snapshot` wage_type_enum NOT NULL
- `wage_rate_snapshot` NUMERIC(12,2) NOT NULL
- `present_days` NUMERIC(6,2) NOT NULL DEFAULT '0.00'
- `half_days` INT NOT NULL DEFAULT 0
- `paid_leave_days` INT NOT NULL DEFAULT 0
- `unpaid_leave_days` INT NOT NULL DEFAULT 0
- `regular_hours` NUMERIC(8,2) NOT NULL DEFAULT '0.00'
- `overtime_hours` NUMERIC(8,2) NOT NULL DEFAULT '0.00'
- `overtime_rate_multiplier` NUMERIC(4,2) NOT NULL DEFAULT '1.50'
- `gross_earnings` NUMERIC(12,2) NOT NULL DEFAULT '0.00'
- `deductions` NUMERIC(12,2) NOT NULL DEFAULT '0.00'
- `advance_recovery` NUMERIC(12,2) NOT NULL DEFAULT '0.00'
- `net_pay` NUMERIC(12,2) NOT NULL DEFAULT '0.00'
- `payment_status` payment_status_enum NOT NULL DEFAULT 'UNPAID'
- `created_at`, `updated_at` TIMESTAMPTZ
- UNIQUE(payroll_run_id, worker_id)

### 15. `payroll_payments`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `payroll_item_id` UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE
- `amount` NUMERIC(12,2) NOT NULL
- `payment_method` payment_method_enum NOT NULL DEFAULT 'BANK_TRANSFER'
- `payment_date` DATE NOT NULL
- `payment_reference` VARCHAR(150)
- `remarks` TEXT
- `recorded_by` UUID NOT NULL REFERENCES users(id)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()

### 16. `activity_logs`
- `id` UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- `user_id` UUID
- `user_email` VARCHAR(150)
- `user_role` VARCHAR(50)
- `action` VARCHAR(100) NOT NULL
- `entity_type` VARCHAR(100) NOT NULL
- `entity_id` VARCHAR(100)
- `change_details` JSONB
- `ip_address` VARCHAR(50)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
