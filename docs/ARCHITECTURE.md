# WorkForce Architecture & Design Overview

## 1. Architectural Principles

WorkForce is architected as a modular, decoupled full-stack SaaS application adhering to modern enterprise design principles:
- **Zero Frontend Authority:** All business permissions, site-scoping, financial balance constraints, and attendance uniqueness checks are strictly enforced in NestJS guards, services, and PostgreSQL database constraints.
- **Single Source of Truth for Wages:** Wage rates are maintained in a temporal `wage_rate_history` table with effective-from dates. Payroll runs take snapshots of the applicable rate, ensuring historical payroll remains immutable even if wage rates change later.
- **Audit Logging by Design:** Every administrative change, attendance marking/correction, leave approval/rejection, wage update, and payroll lock is automatically written to `activity_logs`.
- **Concurrency & Transaction Safety:** Multi-record operations (bulk attendance submission, payroll run generation, and payment disbursements) execute inside TypeORM query runner database transactions with pessimistic locking where necessary to prevent concurrent overpayments.

---

## 2. Authorization & Scoping Model

```
+-------------------------------------------------------------+
|                      Client Request                         |
+-------------------------------------------------------------+
                               |
                               v
                     [ JwtAuthGuard ]
             Validates token & account active state
                               |
                               v
                      [ RolesGuard ]
        Verifies role: ADMIN vs SUPERVISOR on endpoint
                               |
                               v
                    [ SiteAccessGuard ]
      Verifies SUPERVISOR is assigned to requested workSiteId
    (Admins bypass; Supervisors blocked with 403 Forbidden)
                               |
                               v
                  [ Service-Level Scoping ]
       Appends `WHERE wa.workSiteId IN (:...allowedSiteIds)`
             for queries returning collections
```

---

## 3. Database Entity Relationship Overview

- **users:** Master authentication and role assignment table (`ADMIN` or `SUPERVISOR`).
- **supervisor_sites:** M:N junction table mapping supervisors to one or more work locations.
- **work_sites:** Construction projects, facilities, or logistics centers.
- **departments & skill_categories:** Organizational taxonomy and worker trade qualifications.
- **workers:** Master personnel records (UUID primary key, unique `worker_code`, contact info, joining date).
- **worker_assignments:** Temporal allocation of a worker to a work site and shift.
- **shifts:** Rota schedule definitions (`startTime`, `endTime`, `crosses_midnight`).
- **attendance:** Daily recorded status (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `WEEKLY_OFF`, `HOLIDAY`). Composite unique constraint on `(worker_id, attendance_date, shift_id)`.
- **leave_requests:** Worker leave requests recorded by supervisors (`CASUAL`, `SICK`, `UNPAID`, `OTHER`).
- **holidays:** Site-specific or organization-wide non-working calendar dates.
- **wage_rate_history:** Effective-dated wage rate changes (`DAILY`, `HOURLY`, `MONTHLY`).
- **worker_advances:** Cash advances issued with running `remaining_balance`.
- **payroll_runs:** Calculated pay runs (`DRAFT`, `APPROVED`, `REVISED`).
- **payroll_items:** Line-item calculation snapshot per worker for an approved pay period.
- **payroll_payments:** Financial disbursement records against payroll items.
- **notifications:** Database-backed notifications with role and site targeting.
- **activity_logs:** Immutable audit trail records.
