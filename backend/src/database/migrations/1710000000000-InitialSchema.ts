import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create ENUM types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "role_enum" AS ENUM ('ADMIN', 'SUPERVISOR');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "worker_status_enum" AS ENUM ('ACTIVE', 'INACTIVE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "employment_type_enum" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'DAILY_WAGE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "wage_type_enum" AS ENUM ('DAILY', 'HOURLY', 'MONTHLY');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "attendance_status_enum" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WEEKLY_OFF', 'HOLIDAY');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "leave_type_enum" AS ENUM ('CASUAL', 'SICK', 'UNPAID', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "leave_status_enum" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "payroll_status_enum" AS ENUM ('DRAFT', 'APPROVED', 'REVISED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "payment_status_enum" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "payment_method_enum" AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "assignment_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'TRANSFERRED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 1. users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "full_name" VARCHAR(150) NOT NULL,
        "email" VARCHAR(150) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "role" "role_enum" NOT NULL DEFAULT 'SUPERVISOR',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. work_sites
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "work_sites" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(150) NOT NULL,
        "address" TEXT NOT NULL,
        "description" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 3. supervisor_sites
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "supervisor_sites" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "work_site_id" UUID NOT NULL REFERENCES "work_sites"("id") ON DELETE CASCADE,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_user_worksite" UNIQUE ("user_id", "work_site_id")
      );
    `);

    // 4. departments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) UNIQUE NOT NULL,
        "code" VARCHAR(50) UNIQUE,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 5. skill_categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "skill_categories" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) UNIQUE NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 6. shifts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shifts" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "start_time" VARCHAR(10) NOT NULL,
        "end_time" VARCHAR(10) NOT NULL,
        "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
        "description" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 7. workers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workers" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_code" VARCHAR(50) UNIQUE NOT NULL,
        "full_name" VARCHAR(150) NOT NULL,
        "phone" VARCHAR(30) NOT NULL,
        "email" VARCHAR(150),
        "address" TEXT NOT NULL,
        "date_of_birth" DATE,
        "gender" VARCHAR(20),
        "joining_date" DATE NOT NULL,
        "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
        "skill_category_id" UUID REFERENCES "skill_categories"("id") ON DELETE SET NULL,
        "employment_type" "employment_type_enum" NOT NULL DEFAULT 'DAILY_WAGE',
        "status" "worker_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "emergency_contact" VARCHAR(150),
        "profile_photo_path" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 8. worker_assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_assignments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "work_site_id" UUID NOT NULL REFERENCES "work_sites"("id") ON DELETE CASCADE,
        "shift_id" UUID REFERENCES "shifts"("id") ON DELETE SET NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE,
        "role_title" VARCHAR(100),
        "supervisor_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "status" "assignment_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_wa_worker_status" ON "worker_assignments"("worker_id", "status");
      CREATE INDEX IF NOT EXISTS "idx_wa_site_status" ON "worker_assignments"("work_site_id", "status");
    `);

    // 9. attendance
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attendance" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "work_site_id" UUID NOT NULL REFERENCES "work_sites"("id") ON DELETE CASCADE,
        "shift_id" UUID NOT NULL REFERENCES "shifts"("id") ON DELETE RESTRICT,
        "attendance_date" DATE NOT NULL,
        "status" "attendance_status_enum" NOT NULL DEFAULT 'PRESENT',
        "check_in" VARCHAR(10),
        "check_out" VARCHAR(10),
        "overtime_minutes" INT NOT NULL DEFAULT 0,
        "remarks" TEXT,
        "marked_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "finalized_at" TIMESTAMPTZ,
        "finalized_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_worker_date_shift" UNIQUE ("worker_id", "attendance_date", "shift_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_att_site_date" ON "attendance"("work_site_id", "attendance_date");
    `);

    // 10. leave_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leave_requests" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "work_site_id" UUID NOT NULL REFERENCES "work_sites"("id") ON DELETE CASCADE,
        "leave_type" "leave_type_enum" NOT NULL DEFAULT 'CASUAL',
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "reason" TEXT NOT NULL,
        "supporting_document_path" VARCHAR(255),
        "status" "leave_status_enum" NOT NULL DEFAULT 'PENDING',
        "reviewed_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "reviewed_at" TIMESTAMPTZ,
        "review_remarks" TEXT,
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_lr_worker_dates" ON "leave_requests"("worker_id", "start_date", "end_date");
      CREATE INDEX IF NOT EXISTS "idx_lr_site_status" ON "leave_requests"("work_site_id", "status");
    `);

    // 11. holidays
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "holidays" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(150) NOT NULL,
        "date" DATE NOT NULL,
        "work_site_id" UUID REFERENCES "work_sites"("id") ON DELETE CASCADE,
        "description" TEXT,
        "is_paid" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_holidays_date_site" ON "holidays"("date", "work_site_id");
    `);

    // 12. wage_rate_history
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wage_rate_history" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "wage_type" "wage_type_enum" NOT NULL DEFAULT 'DAILY',
        "rate" NUMERIC(12,2) NOT NULL,
        "effective_from" DATE NOT NULL,
        "effective_to" DATE,
        "changed_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_wrh_worker_eff" ON "wage_rate_history"("worker_id", "effective_from");
    `);

    // 13. worker_advances
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_advances" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "amount" NUMERIC(12,2) NOT NULL,
        "remaining_balance" NUMERIC(12,2) NOT NULL,
        "advance_date" DATE NOT NULL,
        "reason" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        "approved_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_wa_adv_worker_status" ON "worker_advances"("worker_id", "status");
    `);

    // 14. payroll_runs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payroll_runs" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "period_start" DATE NOT NULL,
        "period_end" DATE NOT NULL,
        "status" "payroll_status_enum" NOT NULL DEFAULT 'DRAFT',
        "total_workers" INT NOT NULL DEFAULT 0,
        "total_amount" NUMERIC(14,2) NOT NULL DEFAULT '0.00',
        "notes" TEXT,
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "approved_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_pr_period" ON "payroll_runs"("period_start", "period_end");
    `);

    // 15. payroll_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payroll_items" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payroll_run_id" UUID NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE RESTRICT,
        "wage_type_snapshot" "wage_type_enum" NOT NULL DEFAULT 'DAILY',
        "wage_rate_snapshot" NUMERIC(12,2) NOT NULL,
        "present_days" NUMERIC(6,2) NOT NULL DEFAULT '0.00',
        "half_days" INT NOT NULL DEFAULT 0,
        "paid_leave_days" INT NOT NULL DEFAULT 0,
        "unpaid_leave_days" INT NOT NULL DEFAULT 0,
        "regular_hours" NUMERIC(8,2) NOT NULL DEFAULT '0.00',
        "overtime_hours" NUMERIC(8,2) NOT NULL DEFAULT '0.00',
        "overtime_rate_multiplier" NUMERIC(4,2) NOT NULL DEFAULT '1.50',
        "gross_earnings" NUMERIC(12,2) NOT NULL DEFAULT '0.00',
        "deductions" NUMERIC(12,2) NOT NULL DEFAULT '0.00',
        "advance_recovery" NUMERIC(12,2) NOT NULL DEFAULT '0.00',
        "net_pay" NUMERIC(12,2) NOT NULL DEFAULT '0.00',
        "payment_status" "payment_status_enum" NOT NULL DEFAULT 'UNPAID',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "uq_payroll_run_worker" UNIQUE ("payroll_run_id", "worker_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_pi_worker" ON "payroll_items"("worker_id");
    `);

    // 16. payroll_payments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payroll_payments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payroll_item_id" UUID NOT NULL REFERENCES "payroll_items"("id") ON DELETE CASCADE,
        "amount" NUMERIC(12,2) NOT NULL,
        "payment_method" "payment_method_enum" NOT NULL DEFAULT 'BANK_TRANSFER',
        "payment_date" DATE NOT NULL,
        "payment_reference" VARCHAR(150),
        "remarks" TEXT,
        "recorded_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_pp_payroll_item" ON "payroll_payments"("payroll_item_id");
    `);

    // 17. payroll_adjustments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payroll_adjustments" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payroll_run_id" UUID NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
        "worker_id" UUID NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "adjustment_type" VARCHAR(50) NOT NULL,
        "amount" NUMERIC(12,2) NOT NULL,
        "reason" TEXT NOT NULL,
        "created_by" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 18. notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID,
        "role_target" VARCHAR(50),
        "work_site_id" UUID,
        "title" VARCHAR(200) NOT NULL,
        "message" TEXT NOT NULL,
        "type" VARCHAR(50) NOT NULL DEFAULT 'INFO',
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_notif_user_read" ON "notifications"("user_id", "is_read");
      CREATE INDEX IF NOT EXISTS "idx_notif_role_target" ON "notifications"("role_target");
    `);

    // 19. activity_logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" UUID,
        "user_email" VARCHAR(150),
        "user_role" VARCHAR(50),
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" VARCHAR(100),
        "change_details" JSONB,
        "ip_address" VARCHAR(50),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_act_action_entity" ON "activity_logs"("action", "entity_type");
      CREATE INDEX IF NOT EXISTS "idx_act_created_at" ON "activity_logs"("created_at");
    `);

    // 20. org_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "org_settings" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "key" VARCHAR(100) UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "updated_by" UUID,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "org_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_adjustments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_payments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payroll_runs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_advances" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wage_rate_history" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "holidays" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_requests" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attendance" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_assignments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shifts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "skill_categories" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supervisor_sites" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "work_sites" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);

    await queryRunner.query(`DROP TYPE IF EXISTS "assignment_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_method_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payroll_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "leave_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "leave_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendance_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wage_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employment_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "worker_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "role_enum";`);
  }
}
