export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: Date;
}

/**
 * SM-2 spaced repetition algorithm.
 * @param easeFactor  Current ease factor (≥ 1.3, default 2.5)
 * @param intervalDays  Current interval in days (0 for new cards)
 * @param repetitions  Number of successful reviews so far
 * @param grade  Quality of response: 0–5 (app uses 2=Igen, 3=Svårt, 4=Bra, 5=Lätt)
 */
export function sm2(
  easeFactor: number,
  intervalDays: number,
  repetitions: number,
  grade: number,
): SM2Result {
  // Update ease factor regardless of outcome
  let ef = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  ef = Math.max(1.3, ef);

  let newInterval: number;
  let newRepetitions: number;

  if (grade < 3) {
    // Failed — reset to first interval, keep new ef
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Passed — advance schedule
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(intervalDays * ef);
    }
    newRepetitions = repetitions + 1;
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  nextReviewAt.setHours(0, 0, 0, 0);

  return { easeFactor: ef, intervalDays: newInterval, repetitions: newRepetitions, nextReviewAt };
}
