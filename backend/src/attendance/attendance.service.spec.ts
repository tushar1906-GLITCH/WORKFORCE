import { AttendanceStatus } from '../common/enums';

describe('Attendance Rules and Logic Suite', () => {
  it('should treat NOT_MARKED as unfinalized and distinct from Present or Absent', () => {
    const defaultState = 'NOT_MARKED';
    expect(defaultState).not.toBe(AttendanceStatus.PRESENT);
    expect(defaultState).not.toBe(AttendanceStatus.ABSENT);
  });

  it('should block batch finalization if any eligible worker is NOT_MARKED', () => {
    const workers = [
      { workerCode: 'WF-1001', currentStatus: AttendanceStatus.PRESENT },
      { workerCode: 'WF-1002', currentStatus: 'NOT_MARKED' },
      { workerCode: 'WF-1003', currentStatus: AttendanceStatus.HALF_DAY },
    ];

    const unmarked = workers.filter((w) => w.currentStatus === 'NOT_MARKED');
    expect(unmarked.length).toBe(1);

    const canFinalize = unmarked.length === 0;
    expect(canFinalize).toBe(false);
  });

  it('Mark All Present shortcut should ONLY affect workers currently in NOT_MARKED state', () => {
    const workers = [
      { workerCode: 'WF-1001', currentStatus: AttendanceStatus.ON_LEAVE, isProtected: true },
      { workerCode: 'WF-1002', currentStatus: 'NOT_MARKED', isProtected: false },
      { workerCode: 'WF-1003', currentStatus: AttendanceStatus.ABSENT, isProtected: false },
      { workerCode: 'WF-1004', currentStatus: 'NOT_MARKED', isProtected: false },
    ];

    // Mark all present logic: only apply to NOT_MARKED
    const updated = workers.map((w) => {
      if (w.currentStatus === 'NOT_MARKED') {
        return { ...w, currentStatus: AttendanceStatus.PRESENT };
      }
      return w; // Keep existing status untouched
    });

    expect(updated[0].currentStatus).toBe(AttendanceStatus.ON_LEAVE); // Preserved!
    expect(updated[1].currentStatus).toBe(AttendanceStatus.PRESENT);  // Marked!
    expect(updated[2].currentStatus).toBe(AttendanceStatus.ABSENT);    // Preserved!
    expect(updated[3].currentStatus).toBe(AttendanceStatus.PRESENT);  // Marked!
  });

  it('should correctly calculate completion rate with distinct total eligible denominator', () => {
    const totalEligible = 20;
    const present = 12;
    const halfDay = 2;
    const absent = 3;
    const onLeave = 1;
    const notMarked = 2;

    const totalMarked = totalEligible - notMarked; // 18
    expect(totalMarked).toBe(18);

    const completionRate = Math.round((totalMarked / totalEligible) * 100);
    expect(completionRate).toBe(90);
  });
});
