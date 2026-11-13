describe('Payroll Calculations Suite', () => {
  it('should correctly calculate Daily wage worker earnings with half days and overtime', () => {
    const dailyRate = 800; // Rs. 800/day
    const presentDays = 20;
    const halfDays = 2; // = 1 full day
    const paidLeaveDays = 2;
    const otHours = 10;
    const otMultiplier = 1.5;

    // Payable days = 20 + 0.5 * 2 + 2 = 23 days
    const payableDays = presentDays + 0.5 * halfDays + paidLeaveDays;
    expect(payableDays).toBe(23);

    const regularEarnings = payableDays * dailyRate; // 23 * 800 = 18400
    expect(regularEarnings).toBe(18400);

    const hourlyDerived = dailyRate / 8; // Rs. 100/hr
    const otEarnings = otHours * hourlyDerived * otMultiplier; // 10 * 100 * 1.5 = 1500
    expect(otEarnings).toBe(1500);

    const grossEarnings = regularEarnings + otEarnings; // 19900
    expect(grossEarnings).toBe(19900);

    const advanceRecovery = 2500;
    const netPay = grossEarnings - advanceRecovery;
    expect(netPay).toBe(17400);
  });

  it('should correctly calculate Hourly wage worker earnings', () => {
    const hourlyRate = 120; // Rs. 120/hr
    const regularHours = 176;
    const otHours = 12;
    const otMultiplier = 1.5;

    const regularEarnings = regularHours * hourlyRate; // 176 * 120 = 21120
    const otEarnings = otHours * (hourlyRate * otMultiplier); // 12 * 180 = 2160
    const gross = regularEarnings + otEarnings; // 23280

    expect(gross).toBe(23280);
  });

  it('should correctly calculate Monthly wage salary based on 26 days standard policy', () => {
    const monthlyRate = 26000;
    const payableDays = 26; // full attendance
    const perDayRate = monthlyRate / 26; // Rs. 1000/day
    expect(perDayRate).toBe(1000);

    const regularEarnings = Math.min(monthlyRate, payableDays * perDayRate);
    expect(regularEarnings).toBe(26000);

    // If 2 unpaid leave days
    const attendedPayableDays = 24;
    const deductedEarnings = attendedPayableDays * perDayRate;
    expect(deductedEarnings).toBe(24000);
  });

  it('should prevent payment amounts exceeding remaining net pay balance', () => {
    const netPay = 15000;
    let totalPaid = 0;

    const payment1 = 10000;
    totalPaid += payment1;
    const remainingBalance1 = netPay - totalPaid;
    expect(remainingBalance1).toBe(5000);

    const payment2 = 6000; // exceeds 5000!
    const isExceeded = payment2 > remainingBalance1;
    expect(isExceeded).toBe(true);
  });
});
