import { AppDataSource } from '../data-source';
import * as bcrypt from 'bcrypt';
import {
  User,
  WorkSite,
  SupervisorSite,
  Department,
  SkillCategory,
  Shift,
  Worker,
  WorkerAssignment,
  Attendance,
  LeaveRequest,
  Holiday,
  WageRateHistory,
  WorkerAdvance,
  PayrollRun,
  PayrollItem,
  PayrollPayment,
  Notification,
  ActivityLog,
  OrgSetting,
} from '../entities';
import {
  Role,
  WorkerStatus,
  EmploymentType,
  WageType,
  AttendanceStatus,
  LeaveType,
  LeaveStatus,
  PayrollStatus,
  PaymentStatus,
  PaymentMethod,
  AssignmentStatus,
} from '../../common/enums';

async function seed() {
  try {
    console.log('Connecting for seed...');
    await AppDataSource.initialize();
    console.log('Database connected. Starting idempotent seed...');

    const userRepo = AppDataSource.getRepository(User);
    const siteRepo = AppDataSource.getRepository(WorkSite);
    const supervisorSiteRepo = AppDataSource.getRepository(SupervisorSite);
    const deptRepo = AppDataSource.getRepository(Department);
    const skillRepo = AppDataSource.getRepository(SkillCategory);
    const shiftRepo = AppDataSource.getRepository(Shift);
    const workerRepo = AppDataSource.getRepository(Worker);
    const waRepo = AppDataSource.getRepository(WorkerAssignment);
    const attRepo = AppDataSource.getRepository(Attendance);
    const lrRepo = AppDataSource.getRepository(LeaveRequest);
    const holRepo = AppDataSource.getRepository(Holiday);
    const wageRepo = AppDataSource.getRepository(WageRateHistory);
    const advRepo = AppDataSource.getRepository(WorkerAdvance);
    const prRepo = AppDataSource.getRepository(PayrollRun);
    const piRepo = AppDataSource.getRepository(PayrollItem);
    const ppRepo = AppDataSource.getRepository(PayrollPayment);
    const notifRepo = AppDataSource.getRepository(Notification);
    const actRepo = AppDataSource.getRepository(ActivityLog);
    const orgRepo = AppDataSource.getRepository(OrgSetting);

    // 1. Org Settings
    const defaultSettings = [
      { key: 'timezone', value: 'Asia/Kolkata', description: 'Organization standard timezone' },
      { key: 'overtime_multiplier', value: '1.5', description: 'Standard overtime rate multiplier' },
      { key: 'standard_workday_hours', value: '8', description: 'Standard regular hours per day' },
      { key: 'unpaid_leave_policy', value: 'DEDUCT_DAILY', description: 'Deduction policy for unpaid leave' },
    ];
    for (const s of defaultSettings) {
      const exists = await orgRepo.findOne({ where: { key: s.key } });
      if (!exists) {
        await orgRepo.save(orgRepo.create(s));
      }
    }

    // 2. Users
    const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
    const supervisorPasswordHash = await bcrypt.hash('Supervisor@123456', 10);

    let admin = await userRepo.findOne({ where: { email: 'admin@workforce.local' } });
    if (!admin) {
      admin = await userRepo.save(
        userRepo.create({
          fullName: 'Eleanor Vance (Org Administrator)',
          email: 'admin@workforce.local',
          passwordHash: adminPasswordHash,
          role: Role.ADMIN,
          isActive: true,
        }),
      );
    }

    let supNorth = await userRepo.findOne({ where: { email: 'supervisor.north@workforce.local' } });
    if (!supNorth) {
      supNorth = await userRepo.save(
        userRepo.create({
          fullName: 'Marcus Brody (North Supervisor)',
          email: 'supervisor.north@workforce.local',
          passwordHash: supervisorPasswordHash,
          role: Role.SUPERVISOR,
          isActive: true,
        }),
      );
    }

    let supSouth = await userRepo.findOne({ where: { email: 'supervisor.south@workforce.local' } });
    if (!supSouth) {
      supSouth = await userRepo.save(
        userRepo.create({
          fullName: 'Rajesh Kulkarni (South Supervisor)',
          email: 'supervisor.south@workforce.local',
          passwordHash: supervisorPasswordHash,
          role: Role.SUPERVISOR,
          isActive: true,
        }),
      );
    }

    // 3. Work Sites
    const siteData = [
      { name: 'Apex Tower Project', address: 'Plot 42, Cyber Gateway Sector, Hyderabad', description: 'High-rise commercial tower construction' },
      { name: 'Metro Logistics Hub', address: 'Warehouse Block 7, Outer Ring Road, Bengaluru', description: 'Automated fulfillment & logistics center' },
      { name: 'Coastal Refinery Expansion', address: 'Plot 108, Industrial Corridor, Visakhapatnam', description: 'Heavy civil and piping overhaul' },
    ];
    const sites: WorkSite[] = [];
    for (const sd of siteData) {
      let s = await siteRepo.findOne({ where: { name: sd.name } });
      if (!s) {
        s = await siteRepo.save(siteRepo.create(sd));
      }
      sites.push(s);
    }

    // 4. Supervisor Sites
    // Marcus Brody: Apex Tower & Metro Logistics
    // Rajesh Kulkarni: Coastal Refinery & Metro Logistics
    const supAssignments = [
      { userId: supNorth.id, workSiteId: sites[0].id },
      { userId: supNorth.id, workSiteId: sites[1].id },
      { userId: supSouth.id, workSiteId: sites[2].id },
      { userId: supSouth.id, workSiteId: sites[1].id },
    ];
    for (const sa of supAssignments) {
      const exists = await supervisorSiteRepo.findOne({ where: sa });
      if (!exists) {
        await supervisorSiteRepo.save(supervisorSiteRepo.create(sa));
      }
    }

    // 5. Departments
    const deptsData = [
      { name: 'Civil & Construction', code: 'CIV', description: 'Masonry, concreting, scaffolding & steel works' },
      { name: 'Mechanical & Electrical', code: 'MNE', description: 'HVAC, electrical wiring, welding & heavy plant' },
      { name: 'Warehousing & Logistics', code: 'LOG', description: 'Material intake, sorting, packing & dispatch' },
      { name: 'Safety & Site Maintenance', code: 'SAF', description: 'Security, hygiene, safety compliance & facilities' },
    ];
    const depts: Department[] = [];
    for (const dd of deptsData) {
      let d = await deptRepo.findOne({ where: { name: dd.name } });
      if (!d) {
        d = await deptRepo.save(deptRepo.create(dd));
      }
      depts.push(d);
    }

    // 6. Skill Categories
    const skillsData = [
      { name: 'Master Mason / Concreter', description: 'Specialized bricklaying, structural concreting' },
      { name: 'Certified Industrial Electrician', description: '3-phase wiring, control panels & transformer maintenance' },
      { name: 'TIG / ARC Structural Welder', description: 'Pressure vessel and structural steel joining' },
      { name: 'Forklift & Reach Truck Operator', description: 'Licensed warehouse heavy material handling' },
      { name: 'General Site Labourer', description: 'Assisting craftsmen, debris clearing, material staging' },
    ];
    const skills: SkillCategory[] = [];
    for (const sk of skillsData) {
      let s = await skillRepo.findOne({ where: { name: sk.name } });
      if (!s) {
        s = await skillRepo.save(skillRepo.create(sk));
      }
      skills.push(s);
    }

    // 7. Shifts
    const shiftsData = [
      { name: 'Morning General Shift', startTime: '08:00', endTime: '17:00', crossesMidnight: false, description: 'Standard 8h working shift with 1h lunch' },
      { name: 'Evening Twilight Shift', startTime: '15:00', endTime: '23:30', crossesMidnight: false, description: 'Afternoon to late evening operations' },
      { name: 'Overnight Graveyard Shift', startTime: '23:00', endTime: '07:30', crossesMidnight: true, description: 'Critical continuous logistics & maintenance' },
    ];
    const shifts: Shift[] = [];
    for (const sh of shiftsData) {
      let s = await shiftRepo.findOne({ where: { name: sh.name } });
      if (!s) {
        s = await shiftRepo.save(shiftRepo.create(sh));
      }
      shifts.push(s);
    }

    // 8. Workers (24 realistic workers)
    const workerSeedData = [
      { code: 'WF-1001', name: 'Ramesh Kumar', phone: '+91 98450 11001', address: 'H.No 12-4, Madhapur, Hyderabad', deptIdx: 0, skillIdx: 0, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '850.00' },
      { code: 'WF-1002', name: 'Suresh Patil', phone: '+91 98450 11002', address: 'Flat 302, Gachibowli, Hyderabad', deptIdx: 0, skillIdx: 0, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '800.00' },
      { code: 'WF-1003', name: 'Anil Yadav', phone: '+91 98450 11003', address: 'Plot 88, Miyapur, Hyderabad', deptIdx: 0, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '600.00' },
      { code: 'WF-1004', name: 'Mohammed Irfan', phone: '+91 98450 11004', address: 'Line 3, Kukatpally, Hyderabad', deptIdx: 1, skillIdx: 1, empType: EmploymentType.CONTRACT, wageType: WageType.HOURLY, rate: '120.00' },
      { code: 'WF-1005', name: 'Vikram Singh', phone: '+91 98450 11005', address: 'Sector 5, Kondapur, Hyderabad', deptIdx: 1, skillIdx: 2, empType: EmploymentType.CONTRACT, wageType: WageType.HOURLY, rate: '140.00' },
      { code: 'WF-1006', name: 'Sunita Devi', phone: '+91 98450 11006', address: 'Village Hafeezpet, Hyderabad', deptIdx: 3, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },
      { code: 'WF-1007', name: 'Pooja Sharma', phone: '+91 98450 11007', address: 'Block D, Chanda Nagar, Hyderabad', deptIdx: 3, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },
      { code: 'WF-1008', name: 'Deepak Verma', phone: '+91 98450 11008', address: 'Near Bus Stand, Lingampally, Hyderabad', deptIdx: 0, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '620.00' },

      { code: 'WF-1009', name: 'Kiran Gowda', phone: '+91 98860 22001', address: '4th Cross, Peenya Industrial Area, Bengaluru', deptIdx: 2, skillIdx: 3, empType: EmploymentType.FULL_TIME, wageType: WageType.MONTHLY, rate: '28000.00' },
      { code: 'WF-1010', name: 'Manjunath Reddy', phone: '+91 98860 22002', address: '12th Main, Yeshwanthpur, Bengaluru', deptIdx: 2, skillIdx: 3, empType: EmploymentType.FULL_TIME, wageType: WageType.MONTHLY, rate: '27500.00' },
      { code: 'WF-1011', name: 'Basavaraj Hiremath', phone: '+91 98860 22003', address: 'Near Railway Gate, Dasarahalli, Bengaluru', deptIdx: 2, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '700.00' },
      { code: 'WF-1012', name: 'Shiva Kumar', phone: '+91 98860 22004', address: 'No 45, Rajajinagar, Bengaluru', deptIdx: 2, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '700.00' },
      { code: 'WF-1013', name: 'Praveen Nayak', phone: '+91 98860 22005', address: 'Site 18, Nelamangala, Bengaluru', deptIdx: 1, skillIdx: 1, empType: EmploymentType.CONTRACT, wageType: WageType.HOURLY, rate: '130.00' },
      { code: 'WF-1014', name: 'Lakshmi Bai', phone: '+91 98860 22006', address: 'Kengeri Satellite Town, Bengaluru', deptIdx: 3, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '680.00' },
      { code: 'WF-1015', name: 'Naveen Joseph', phone: '+91 98860 22007', address: 'Vijayanagar 2nd Stage, Bengaluru', deptIdx: 2, skillIdx: 3, empType: EmploymentType.CONTRACT, wageType: WageType.DAILY, rate: '950.00' },
      { code: 'WF-1016', name: 'Arjun Das', phone: '+91 98860 22008', address: 'Nagasandra Post, Bengaluru', deptIdx: 0, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },

      { code: 'WF-1017', name: 'Venkata Ramana', phone: '+91 94400 33001', address: 'D.No 4-11, Gajuwaka, Visakhapatnam', deptIdx: 1, skillIdx: 2, empType: EmploymentType.FULL_TIME, wageType: WageType.MONTHLY, rate: '32000.00' },
      { code: 'WF-1018', name: 'Appala Raju', phone: '+91 94400 33002', address: 'Sriharipuram Main Road, Visakhapatnam', deptIdx: 1, skillIdx: 2, empType: EmploymentType.FULL_TIME, wageType: WageType.MONTHLY, rate: '31000.00' },
      { code: 'WF-1019', name: 'Sanyasi Rao', phone: '+91 94400 33003', address: 'Near Port Area, Malkapuram, Visakhapatnam', deptIdx: 0, skillIdx: 0, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '850.00' },
      { code: 'WF-1020', name: 'Chandra Sekhar', phone: '+91 94400 33004', address: 'Steel Plant Sector 6, Visakhapatnam', deptIdx: 1, skillIdx: 1, empType: EmploymentType.CONTRACT, wageType: WageType.HOURLY, rate: '135.00' },
      { code: 'WF-1021', name: 'Durgaprasad P', phone: '+91 94400 33005', address: 'Kurmannapalem, Visakhapatnam', deptIdx: 0, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },
      { code: 'WF-1022', name: 'Bhavani Shankar', phone: '+91 94400 33006', address: 'Scindia Junction, Visakhapatnam', deptIdx: 3, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },
      { code: 'WF-1023', name: 'Kavitha Devi', phone: '+91 94400 33007', address: 'Old Post Office Street, Visakhapatnam', deptIdx: 3, skillIdx: 4, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '650.00' },
      { code: 'WF-1024', name: 'Govind Swamy', phone: '+91 94400 33008', address: 'Kancharapalem, Visakhapatnam', deptIdx: 0, skillIdx: 0, empType: EmploymentType.DAILY_WAGE, wageType: WageType.DAILY, rate: '820.00' },
    ];

    const workers: Worker[] = [];
    for (let i = 0; i < workerSeedData.length; i++) {
      const wd = workerSeedData[i];
      let w = await workerRepo.findOne({ where: { workerCode: wd.code } });
      if (!w) {
        const createdWorker = workerRepo.create({
          workerCode: wd.code,
          fullName: wd.name,
          phone: wd.phone,
          email: `${wd.code.toLowerCase()}@workforce.internal`,
          address: wd.address,
          dateOfBirth: '1990-05-15',
          gender: i % 4 === 1 ? 'Female' : 'Male',
          joiningDate: '2025-01-10',
          departmentId: depts[wd.deptIdx].id,
          skillCategoryId: skills[wd.skillIdx].id,
          employmentType: wd.empType,
          status: WorkerStatus.ACTIVE,
          emergencyContact: 'Family Member: +91 99999 88888',
        });
        w = await workerRepo.save(createdWorker);
      }
      workers.push(w);

      // Wage Rate History
      const existingWage = await wageRepo.findOne({ where: { workerId: w.id } });
      if (!existingWage) {
        await wageRepo.save(
          wageRepo.create({
            workerId: w.id,
            wageType: wd.wageType,
            rate: wd.rate,
            effectiveFrom: '2025-01-10',
            changedBy: admin.id,
            notes: 'Initial contractual wage baseline',
          }),
        );
      }

      // Worker Assignments
      // 0..7 -> Site 0 (Apex Tower), Shift 0 (Morning)
      // 8..15 -> Site 1 (Metro Logistics), Shift 1 (Evening)
      // 16..23 -> Site 2 (Coastal Refinery), Shift 0 (Morning)
      let targetSite = sites[0];
      let targetShift = shifts[0];
      let assignedSupervisor = supNorth;

      if (i >= 8 && i <= 15) {
        targetSite = sites[1];
        targetShift = shifts[1];
        assignedSupervisor = supNorth;
      } else if (i >= 16) {
        targetSite = sites[2];
        targetShift = shifts[0];
        assignedSupervisor = supSouth;
      }

      const existingAssignment = await waRepo.findOne({
        where: { workerId: w.id, workSiteId: targetSite.id, status: AssignmentStatus.ACTIVE },
      });
      if (!existingAssignment) {
        await waRepo.save(
          waRepo.create({
            workerId: w.id,
            workSiteId: targetSite.id,
            shiftId: targetShift.id,
            startDate: '2025-01-15',
            roleTitle: skills[wd.skillIdx].name,
            supervisorId: assignedSupervisor.id,
            status: AssignmentStatus.ACTIVE,
          }),
        );
      }
    }

    // 9. Holidays
    const holidaysData = [
      { name: 'Republic Day', date: '2026-01-26', isPaid: true, description: 'National Holiday' },
      { name: 'Labour Day (May Day)', date: '2026-05-01', isPaid: true, description: 'International Workers Day' },
      { name: 'Independence Day', date: '2026-08-15', isPaid: true, description: 'National Holiday' },
    ];
    for (const h of holidaysData) {
      const exists = await holRepo.findOne({ where: { date: h.date } });
      if (!exists) {
        await holRepo.save(holRepo.create(h));
      }
    }

    // 10. Attendance Records for past 7 days across workers
    const dates = [
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ];

    for (let wIndex = 0; wIndex < workers.length; wIndex++) {
      const w = workers[wIndex];
      const siteId = wIndex < 8 ? sites[0].id : wIndex < 16 ? sites[1].id : sites[2].id;
      const shiftId = wIndex >= 8 && wIndex < 16 ? shifts[1].id : shifts[0].id;
      const markerId = wIndex < 16 ? supNorth.id : supSouth.id;

      for (let dIndex = 0; dIndex < dates.length; dIndex++) {
        const attDate = dates[dIndex];
        const existingAtt = await attRepo.findOne({
          where: { workerId: w.id, attendanceDate: attDate, shiftId: shiftId },
        });

        if (!existingAtt) {
          let status = AttendanceStatus.PRESENT;
          let checkIn = '08:00';
          let checkOut = '17:00';
          let overtimeMinutes = 0;

          // Introduce realistic variation
          if (dIndex === 1) {
            // Sunday = Weekly Off
            status = AttendanceStatus.WEEKLY_OFF;
            checkIn = null;
            checkOut = null;
          } else if (wIndex % 7 === 3 && dIndex === 4) {
            status = AttendanceStatus.ABSENT;
            checkIn = null;
            checkOut = null;
          } else if (wIndex % 5 === 2 && dIndex === 3) {
            status = AttendanceStatus.HALF_DAY;
            checkIn = '08:00';
            checkOut = '12:30';
          } else if (wIndex % 6 === 1 && dIndex === 5) {
            status = AttendanceStatus.ON_LEAVE;
            checkIn = null;
            checkOut = null;
          } else if (dIndex === 2 || dIndex === 6) {
            overtimeMinutes = (wIndex % 3) * 60; // 0, 60, 120 mins OT
            checkOut = overtimeMinutes > 0 ? '19:00' : '17:00';
          }

          await attRepo.save(
            attRepo.create({
              workerId: w.id,
              workSiteId: siteId,
              shiftId: shiftId,
              attendanceDate: attDate,
              status,
              checkIn,
              checkOut,
              overtimeMinutes,
              remarks: status === AttendanceStatus.HALF_DAY ? 'Left early for personal work' : null,
              markedBy: markerId,
              finalizedAt: dIndex < 5 ? new Date('2026-11-12T18:00:00Z') : null,
              finalizedBy: dIndex < 5 ? markerId : null,
            }),
          );
        }
      }
    }

    // 11. Leave Requests
    const sampleLeaves = [
      { workerIdx: 1, siteIdx: 0, type: LeaveType.CASUAL, start: '2026-11-18', end: '2026-11-19', reason: 'Daughter school annual day', status: LeaveStatus.PENDING, creatorId: supNorth.id },
      { workerIdx: 4, siteIdx: 0, type: LeaveType.SICK, start: '2026-11-12', end: '2026-11-12', reason: 'High fever and viral flu', status: LeaveStatus.APPROVED, creatorId: supNorth.id, reviewerId: supNorth.id, remarks: 'Medical certificate produced verbally' },
      { workerIdx: 9, siteIdx: 1, type: LeaveType.CASUAL, start: '2026-11-20', end: '2026-11-22', reason: 'Village temple festival', status: LeaveStatus.APPROVED, creatorId: supNorth.id, reviewerId: supNorth.id, remarks: 'Relief operator arranged' },
      { workerIdx: 18, siteIdx: 2, type: LeaveType.UNPAID, start: '2026-11-25', end: '2026-11-30', reason: 'Extended family travel', status: LeaveStatus.REJECTED, creatorId: supSouth.id, reviewerId: supSouth.id, remarks: 'Critical boiler overhaul scheduled during this period' },
    ];

    for (const sl of sampleLeaves) {
      const w = workers[sl.workerIdx];
      const s = sites[sl.siteIdx];
      const exists = await lrRepo.findOne({ where: { workerId: w.id, startDate: sl.start } });
      if (!exists) {
        await lrRepo.save(
          lrRepo.create({
            workerId: w.id,
            workSiteId: s.id,
            leaveType: sl.type,
            startDate: sl.start,
            endDate: sl.end,
            reason: sl.reason,
            status: sl.status,
            createdBy: sl.creatorId,
            reviewedBy: sl.reviewerId || null,
            reviewedAt: sl.reviewerId ? new Date() : null,
            reviewRemarks: sl.remarks || null,
          }),
        );
      }
    }

    // 12. Worker Advances
    const sampleAdvances = [
      { workerIdx: 0, amount: '5000.00', remaining: '2500.00', date: '2026-10-15', reason: 'Festival advance for Deepawali', status: 'ACTIVE', approvedBy: admin.id },
      { workerIdx: 8, amount: '10000.00', remaining: '10000.00', date: '2026-11-01', reason: 'Emergency home repair', status: 'ACTIVE', approvedBy: admin.id },
      { workerIdx: 17, amount: '3000.00', remaining: '0.00', date: '2026-09-10', reason: 'Medical emergency', status: 'REPAID', approvedBy: admin.id },
    ];
    for (const sa of sampleAdvances) {
      const w = workers[sa.workerIdx];
      const exists = await advRepo.findOne({ where: { workerId: w.id, advanceDate: sa.date } });
      if (!exists) {
        await advRepo.save(
          advRepo.create({
            workerId: w.id,
            amount: sa.amount,
            remainingBalance: sa.remaining,
            advanceDate: sa.date,
            reason: sa.reason,
            status: sa.status,
            approvedBy: sa.approvedBy,
          }),
        );
      }
    }

    // 13. Sample Payroll Run (October 2026)
    let octPayroll = await prRepo.findOne({ where: { periodStart: '2026-10-01', periodEnd: '2026-10-31' } });
    if (!octPayroll) {
      octPayroll = await prRepo.save(
        prRepo.create({
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
          status: PayrollStatus.APPROVED,
          totalWorkers: 8,
          totalAmount: '168500.00',
          notes: 'Regular October monthly payroll run for North Site & Logistics Hub',
          createdBy: admin.id,
          approvedBy: admin.id,
          approvedAt: new Date('2026-11-02T10:00:00Z'),
        }),
      );

      // Create Payroll Items for first 8 workers
      for (let i = 0; i < 8; i++) {
        const w = workers[i];
        const wd = workerSeedData[i];
        const presentDays = '22.00';
        const halfDays = 1;
        const paidLeaveDays = 1;
        const unpaidLeaveDays = 0;
        const otHours = '6.00';
        const rate = parseFloat(wd.rate);

        // Daily wage calculation: (Present + 0.5 * half + paid_leave) * rate + OT
        const payableDays = 22 + 0.5 * 1 + 1; // 23.5
        const regularEarnings = payableDays * rate;
        const hourlyDerived = rate / 8;
        const otEarnings = 6 * hourlyDerived * 1.5;
        const gross = regularEarnings + otEarnings;
        const advanceRec = i === 0 ? 2500.00 : 0.00;
        const deductions = 0.00;
        const netPay = gross - advanceRec;

        const pi = await piRepo.save(
          piRepo.create({
            payrollRunId: octPayroll.id,
            workerId: w.id,
            wageTypeSnapshot: wd.wageType,
            wageRateSnapshot: wd.rate,
            presentDays: '22.00',
            halfDays: 1,
            paidLeaveDays: 1,
            unpaidLeaveDays: 0,
            regularHours: '176.00',
            overtimeHours: otHours,
            overtimeRateMultiplier: '1.50',
            grossEarnings: gross.toFixed(2),
            deductions: deductions.toFixed(2),
            advanceRecovery: advanceRec.toFixed(2),
            netPay: netPay.toFixed(2),
            paymentStatus: i < 5 ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID,
          }),
        );

        // Payment record
        const paidAmount = i < 5 ? netPay : netPay / 2;
        await ppRepo.save(
          ppRepo.create({
            payrollItemId: pi.id,
            amount: paidAmount.toFixed(2),
            paymentMethod: i % 2 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.UPI,
            paymentDate: '2026-11-03',
            paymentReference: `TXN-OCT26-${1000 + i}`,
            remarks: i < 5 ? 'Full monthly salary disbursed' : 'Partial payment tranche 1',
            recordedBy: admin.id,
          }),
        );
      }
    }

    // 14. Notifications
    const sampleNotifs = [
      {
        userId: supNorth.id,
        roleTarget: Role.SUPERVISOR,
        workSiteId: sites[0].id,
        title: 'New Leave Request Submitted',
        message: 'Leave request submitted for Ramesh Kumar (WF-1001) for 18-Nov-2026.',
        type: 'LEAVE',
        isRead: false,
      },
      {
        userId: null,
        roleTarget: Role.ADMIN,
        title: 'October Payroll Approved',
        message: 'Monthly payroll for period 2026-10-01 to 2026-10-31 was approved by Eleanor Vance.',
        type: 'PAYROLL',
        isRead: false,
      },
      {
        userId: supNorth.id,
        roleTarget: Role.SUPERVISOR,
        workSiteId: sites[0].id,
        title: 'Attendance Finalized',
        message: 'Attendance for Apex Tower Project on 2026-11-10 was finalized.',
        type: 'ATTENDANCE',
        isRead: true,
      },
    ];
    for (const sn of sampleNotifs) {
      const exists = await notifRepo.findOne({ where: { title: sn.title } });
      if (!exists) {
        await notifRepo.save(notifRepo.create(sn));
      }
    }

    // 15. Activity Logs
    const sampleLogs = [
      {
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: admin.id,
        changeDetails: { method: 'JWT_LOGIN' },
        ipAddress: '127.0.0.1',
      },
      {
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        action: 'PAYROLL_GENERATED',
        entityType: 'PayrollRun',
        entityId: octPayroll.id,
        changeDetails: { period: '2026-10-01 to 2026-10-31', totalWorkers: 8 },
        ipAddress: '127.0.0.1',
      },
      {
        userId: supNorth.id,
        userEmail: supNorth.email,
        userRole: supNorth.role,
        action: 'ATTENDANCE_BULK_MARKED',
        entityType: 'Attendance',
        entityId: sites[0].id,
        changeDetails: { date: '2026-11-13', workersMarked: 8, status: 'PRESENT' },
        ipAddress: '127.0.0.1',
      },
    ];
    for (const sl of sampleLogs) {
      const exists = await actRepo.findOne({ where: { action: sl.action } });
      if (!exists) {
        await actRepo.save(actRepo.create(sl));
      }
    }

    console.log('✅ Seed completed successfully and idempotently!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
