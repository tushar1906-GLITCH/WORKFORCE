# ShramSetu — AI-Powered Enterprise Labour & Workforce Management System

A centralized enterprise web application engineered for construction companies, manufacturing plants, logistics warehouses, and labour contractors to manage workers, site-scoped supervisor operations, individual-first attendance, leave approvals, wage history, payroll generation, audit logging, and **generative AI-powered operational intelligence**.

Built with **React**, **Vite**, **NestJS**, **TypeORM**, **PostgreSQL**, and **Groq (Llama 3.3 70B / Llama 3.1 8B)**.

---

## 1. ShramSetu Upgrades & Intelligence Layer

### 1.1 Groq-Powered AI Assistant (Database-Connected)
- **Live PostgreSQL Tools:** The AI Assistant connects directly to PostgreSQL using 8 controlled, parameterized TypeORM query tools. AI never executes raw SQL.
  - `get_workforce_summary`: Active/inactive workforce counts, department distributions, site deployments, and unassigned workers.
  - `search_workers`: Search profiles by code, name, phone, department, or status.
  - `get_attendance_summary`: Shift-wise and site-wise attendance counts, present/absent/half-day/not-marked, and strictly accurate attendance rate calculated against eligible scheduled workers.
  - `get_worker_attendance_history`: 30-day chronological attendance logs for an individual worker.
  - `get_leave_requests`: Filter pending, approved, or rejected leave requests by site or date.
  - `get_payroll_summary`: Comprehensive gross expenditure, net pay, advance recoveries, and outstanding liabilities (ADMIN ONLY).
  - `get_site_locations_and_staffing`: Operational locations, active worker counts, and supervisor assignments.
  - `compare_attendance_dates`: Comparative analysis between two dates (e.g., yesterday vs today) with rate delta and trend indicators.
- **Strict Role-Based Permission Boundaries:**
  - **Admin:** Full organization-wide operational and financial queries.
  - **Supervisor:** Scoped strictly to assigned sites. If a supervisor requests payroll or financial amounts, the system immediately returns: *"Access Denied: You do not have permission to view payroll or salary information."* If a supervisor requests unauthorized site data, it is rejected.
- **Multi-Turn Chat History:** Thread persistence in `ai_conversations` and `ai_messages` tables.
- **Dedicated Page (`/ai-assistant`) & Floating Widget:** Accessible anywhere via a bottom-right floating trigger button with markdown tables, code blocks, and suggestion chips.
- **Deterministic Natural Language Query Engine Fallback:** If Groq API key is not configured or network timeout occurs, a built-in PostgreSQL query engine handles queries and formats live database metrics.

### 1.2 AI Operations Command Center
- Real-time operational intelligence banner on the Executive / Supervisor Dashboard.
- Live telemetry synthesizing unfinalized attendance, pending leave approvals, unassigned active workers, and outstanding payroll reminders with one-click resolution shortcuts.

### 1.3 Advanced Workforce & Site Performance Analytics
- Multi-dimensional reports in `/reports`: Daily Attendance Ledger, Worker Directory & Roster, Work Location Performance & Comparison matrix, and Daily Operations Snapshot.
- Side-by-side performance comparison across operational work locations.
- Print / Save as PDF support with print styling.

### 1.4 Smart Shift Scheduling & Conflict Detection
- Real-time conflict detection in `/assignments`: alerts managers when an assigned worker is already actively deployed at another site or overlapping shift.
- Smart recommendations highlighting available unassigned workers for instant assignment.

### 1.5 Excel / CSV Bulk Worker Import
- Modal in `/workers` allowing bulk CSV data pasting or file upload.
- Pre-import validation preview checking 10-digit Indian phone numbers (`^[6-9]\d{9}$`), names, and wage rates with error highlighting.
- Generates downloadable CSV template (`WorkForce_Worker_Import_Template.csv`).

### 1.6 Worker Document Management & Expiry Tracking
- Identity and compliance document storage (`worker_documents` table): Aadhaar, PAN, Voter ID, Labour Contracts, Trade Certificates, Medical Fitness.
- Expiry date tracking with automatic warning badges (`EXPIRING SOON` within 30 days, `EXPIRED`).
- Administrative verification workflow (`PENDING`, `VERIFIED`, `REJECTED`) with audit logging.

### 1.7 Daily Operations Report & Executive AI Briefing
- Integrated one-click executive AI summary generating daily operations briefings on attendance, shift coverage, and open compliance items.

---

## 2. Core System Architecture & Modules

### Core Modules
1. **Executive & Site Dashboards**
   - Live KPI cards derived from PostgreSQL: Total Workforce, Present Today, Absent, Attendance Rate, Net Payroll, Disbursed Payments.
   - Attendance trend analysis (7-day area chart) and workforce distribution by department (bar chart) using Recharts.
   - Role-scoped: Admin has organization-wide visibility; Supervisors see only assigned work locations.
2. **Worker Management**
   - UUID primary key, unique auto-generated code (`WF-1001`+), full name, contact, emergency contact, department, trade/skill category, and wage type.
   - Detailed history tabs: Attendance history, Assignment & transfer timeline, Leave records, Wage rate history, and Disbursement history.
   - Preserves historical records via soft deactivation rather than destructive deletion.
3. **Departments, Skills, Shifts & Work Locations**
   - Multi-location management with supervisor-to-site associations.
   - Rota management with 24h format and overnight graveyard shift support (crosses midnight).
   - Department and skill trade categories.
4. **Attendance Management (CRITICAL MODULE)**
   - **Individual-First Workflow:** Every eligible assigned worker appears with an inline status selector (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`, `WEEKLY_OFF`, `HOLIDAY`).
   - **Default State is NOT MARKED:** Unmarked workers are never assumed Present or Absent.
   - **Smart Bulk Shortcuts:** "Mark All Present" shortcut strictly applies only to workers currently in `NOT_MARKED`; protected statuses (approved leave, holidays, existing records) are preserved.
   - **Multi-Row Selection:** Select individual rows or all visible rows to apply a bulk status with one click.
   - **Review & Verification Dialog:** Live counters for all statuses and completion rate with clear denominator; finalization is blocked if any worker remains `NOT_MARKED`.
   - **Database Transactions:** Bulk marking and finalization run in PostgreSQL transactions.
   - **Audited Reopening:** Finalized attendance can only be reopened by Administrators with a mandatory audit justification.
5. **Work Assignments & Site Transfers**
   - Active assignment tracking with start and end dates.
   - Site transfer workflow with effective date (automatically completes prior site assignment and creates new active assignment).
   - Overlapping assignment prevention enforced by service validation and database indexes.
6. **Leave Management**
   - Supervisors record verbal leave requests on workers' behalf (CASUAL, SICK, UNPAID, OTHER).
   - Initial status `PENDING`, reviewed and approved/rejected by assigned supervisor or Admin override.
   - Prevents overlapping active leave for the same worker.
   - Integrated into attendance (displays On Leave flag) and payroll calculations.
7. **Wages, Advances & Payroll**
   - Wage rate history with effective-from dates (DAILY, HOURLY, MONTHLY).
   - Advance tracking with unrecovered balance ledger.
   - Calculation engine:
     - Daily wage: `(Present + 0.5 * HalfDay + PaidLeave) * daily_rate + Overtime`
     - Hourly wage: `regular_hours * hourly_rate + Overtime`
     - Monthly wage: `(monthly_rate / 26) * payable_days + Overtime`
     - Overtime: derived hourly rate with configurable multiplier (default `1.5x`).
     - Net pay: `Gross - Advance Recovery - Deductions`.
   - Immutable approved snapshots in `payroll_items`.
8. **Disbursements & Payments**
   - Records payments against payroll items (CASH, BANK_TRANSFER, UPI, OTHER).
   - Concurrency-safe balance checks: payments cannot exceed the outstanding balance.
9. **Reports & Scoped Exports**
   - Real-time reports for attendance ledgers and worker directories.
   - Server-side CSV exports strictly scoped to the user's assigned locations.
10. **In-App Notifications & Audit Trail**
    - Database-backed notifications with unread counts and read states.
    - Full activity audit trail logging user, role, action, entity, timestamp, before/after snapshot, and IP address.

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, JavaScript (JSX), React Router DOM v6, Custom Enterprise Dark Theme (Plain CSS), Axios, Recharts, Lucide React, Zod.
- **Backend:** Node.js, NestJS v10, TypeScript, TypeORM v0.3, PostgreSQL, Passport JWT, bcrypt, class-validator.
- **Database:** PostgreSQL (`workforce_db`), TypeORM migrations, UUID extensions, strict foreign keys, composite unique constraints and transactions.
- **Testing:** Jest, ts-jest, Supertest.

---

## 3. Demo Credentials

| Role | Name | Email | Password | Assigned Work Locations |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Eleanor Vance | `admin@workforce.local` | `Admin@123456` | All Locations (Organization-Wide) |
| **SUPERVISOR** | Marcus Brody | `supervisor.north@workforce.local` | `Supervisor@123456` | Apex Tower Project & Metro Logistics Hub |
| **SUPERVISOR** | Rajesh Kulkarni | `supervisor.south@workforce.local` | `Supervisor@123456` | Coastal Refinery Expansion & Metro Logistics Hub |

---

## 4. Local Setup & Installation Instructions

### Prerequisites
- Node.js LTS (v18, v20 or v22)
- npm (v9+)
- PostgreSQL (v14+) and pgAdmin 4

### Step 1: Database Setup
1. Open pgAdmin or connect to PostgreSQL via `psql`:
   ```bash
   psql -U postgres
   ```
2. Create the database:
   ```sql
   CREATE DATABASE workforce_db;
   ```

### Step 2: Backend Configuration
1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Verify or create `.env` (copy from `.env.example`):
   ```env
   PORT=4000
   NODE_ENV=development
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_postgres_password
   DB_DATABASE=workforce_db
   JWT_SECRET=workforce-jwt-secret-key-prod-2026
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:5173
   DEFAULT_TIMEZONE=Asia/Kolkata
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run TypeORM migrations:
   ```bash
   npx ts-node src/database/run-migrations.ts
   ```
5. Run the idempotent database seed:
   ```bash
   npm run seed
   ```
6. Start the NestJS backend:
   ```bash
   npm run start:dev
   ```
   - API Endpoint: `http://localhost:4000/api/v1`
   - Swagger OpenAPI Docs: `http://localhost:4000/api/docs`

### Step 3: Frontend Configuration
1. In a new terminal, navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Verify or create `.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api/v1
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Web Application: `http://localhost:5173`

---

## 5. Running Tests

Execute backend unit and integration test suites:
```bash
cd backend
npm test
```

Test coverage includes 7 test suites (37 automated tests):
- **Worker Phone Validation & Lifecycle:** Regex `^[6-9]\d{9}$` validation, invalid digit rejection, class-validator DTO enforcement, worker reactivation workflow, and historical audit trail preservation.
- **Work Locations & Operational Scoping:** Inactive work site filtering from assignment and attendance dropdowns, safe deactivation with worker warning, deletion protection when historical records exist, and reactivation.
- **Payroll Disbursement & Locking:** Pessimistic write lock query without outer joins, decimal-safe integer paise/cents balance calculations, partial payments, and overpayment prevention.
- **Supervisor Status & Access Guards:** DTO property whitelisting, Admin status toggling, immediate login rejection for inactive accounts, and JWT strategy active user verification.
- **Attendance Rules:** Not Marked enforcement, Mark All Present non-destructive behaviour, completion rate calculation.
- **Payroll Calculation Engine:** Daily, Hourly, Monthly, Overtime multiplier, and net salary verification.
- **Authentication & Authorization:** Role-based access control, supervisor site-scoping guards.

---

## 6. End-to-End Workflow Demonstration

1. **Log in as Administrator:**
   - Go to `http://localhost:5173/login` and click "Fill" under **Admin** or enter `admin@workforce.local` / `Admin@123456`.
   - Notice the Executive Dashboard displaying organization-wide attendance, trend graphs, and financial ledgers.
2. **Review Work Locations & Supervisors:**
   - Navigate to **Work Locations**. View Apex Tower Project, Metro Logistics Hub, and Coastal Refinery.
3. **Log in as Supervisor:**
   - Logout and log in as Marcus Brody (`supervisor.north@workforce.local` / `Supervisor@123456`).
   - Notice the Dashboard and Work Locations are strictly restricted to the 2 assigned sites.
   - Payroll, User Management, and Activity Logs navigation links and APIs are forbidden.
4. **Execute Attendance:**
   - Navigate to **Attendance**.
   - Select site, date, and shift.
   - View eligible workers with inline selectors initialized to `NOT_MARKED` (or existing state).
   - Use "Mark All Present" to quickly fill unmarked workers while preserving approved leaves and holidays.
   - Adjust individual records (e.g. mark one worker as Half Day or Absent).
   - Click "Review & Save Attendance". Notice that if any worker is Not Marked, finalization is blocked. Complete all rows and finalize.
5. **Record Leave:**
   - Navigate to **Leave Requests**. Click "Record Leave Request" on behalf of a worker.
   - Approve or reject with a supervisor justification remark.
6. **Generate & Approve Payroll (Admin):**
   - Switch back to Admin.
   - Navigate to **Payroll & Wages**. Click "Generate New Payroll Run".
   - Review calculated line items, gross earnings, overtime, advance deductions, and net pay.
   - Click "Approve & Lock Payroll". View individual printable pay slips.
7. **Disburse Payments:**
   - Navigate to **Disbursements**. Record full or partial payouts with overpayment guard protection.
8. **Export Reports:**
   - Navigate to **Reports & Exports** and download the scoped CSV report.
