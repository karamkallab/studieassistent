import { sm2 } from './sm2';

// Helper: compute expected EF update
const ef = (base: number, grade: number) =>
  Math.max(1.3, base + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

describe('sm2 – first review (repetitions = 0)', () => {
  test('grade 5 (Lätt): interval=1, reps=1, ef increases', () => {
    const r = sm2(2.5, 0, 0, 5);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(2.6);
  });

  test('grade 4 (Bra): interval=1, reps=1, ef unchanged', () => {
    const r = sm2(2.5, 0, 0, 4);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(2.5);
  });

  test('grade 3 (Svårt): interval=1, reps=1, ef decreases', () => {
    const r = sm2(2.5, 0, 0, 3);
    expect(r.repetitions).toBe(1);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(2.36);
  });

  test('grade 2 (Igen): resets, interval=1, reps=0', () => {
    const r = sm2(2.5, 0, 0, 2);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.easeFactor).toBeCloseTo(ef(2.5, 2));
  });
});

describe('sm2 – second review (repetitions = 1)', () => {
  test('grade 4: interval jumps to 6, reps=2', () => {
    const r = sm2(2.5, 1, 1, 4);
    expect(r.repetitions).toBe(2);
    expect(r.intervalDays).toBe(6);
    expect(r.easeFactor).toBeCloseTo(2.5);
  });

  test('grade 5: interval=6, ef increases', () => {
    const r = sm2(2.5, 1, 1, 5);
    expect(r.repetitions).toBe(2);
    expect(r.intervalDays).toBe(6);
    expect(r.easeFactor).toBeCloseTo(2.6);
  });

  test('grade 2 (fail): resets to reps=0, interval=1', () => {
    const r = sm2(2.5, 1, 1, 2);
    expect(r.repetitions).toBe(0);
    expect(r.intervalDays).toBe(1);
  });
});

describe('sm2 – third review (repetitions = 2, interval = 6)', () => {
  test('grade 4: interval = round(6 * 2.5) = 15', () => {
    const r = sm2(2.5, 6, 2, 4);
    expect(r.repetitions).toBe(3);
    expect(r.intervalDays).toBe(15);
  });

  test('grade 5: uses updated ef in interval calc', () => {
    const newEf = ef(2.5, 5); // 2.6
    const r = sm2(2.5, 6, 2, 5);
    expect(r.easeFactor).toBeCloseTo(newEf);
    expect(r.intervalDays).toBe(Math.round(6 * newEf));
  });

  test('grade 3 (Svårt): interval shrinks due to lower ef', () => {
    const newEf = ef(2.5, 3); // ~2.36
    const r = sm2(2.5, 6, 2, 3);
    expect(r.intervalDays).toBe(Math.round(6 * newEf));
    expect(r.repetitions).toBe(3);
  });
});

describe('sm2 – ease factor floor', () => {
  test('ef never falls below 1.3', () => {
    let easeFactor = 2.5;
    for (let i = 0; i < 20; i++) {
      const r = sm2(easeFactor, 0, 0, 0);
      easeFactor = r.easeFactor;
    }
    expect(easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(easeFactor).toBeCloseTo(1.3);
  });
});

describe('sm2 – nextReviewAt', () => {
  test('is at least 1 day in the future', () => {
    const r = sm2(2.5, 0, 0, 4);
    const diffMs = r.nextReviewAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(0);
  });

  test('interval=6 means nextReviewAt is 5–7 days from now', () => {
    // nextReviewAt is midnight of day+6; diff vs Date.now() varies by time of day
    const r = sm2(2.5, 1, 1, 4);
    const diffDays = (r.nextReviewAt.getTime() - Date.now()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(5);
    expect(diffDays).toBeLessThanOrEqual(7);
  });
});
