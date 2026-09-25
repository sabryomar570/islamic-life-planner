/**
 * Progress foundation — السلسلة والتقدم الأسبوعي بلا ضغط تنافسي.
 * لا نقاط_compare بين الناس، ولا «إنجازات» وشارات: بيانات بلا سطح تُحذف
 * ولا تُخزَّن.
 */
export type ProgressDay = {
  date: string;
  score: number | null;
  completed: number;
  partial: number;
  postponed: number;
  skipped: number;
  reviewed: boolean;
};

export type WeeklyProgress = {
  days: ProgressDay[];
  activeDays: number;
  completed: number;
  postponed: number;
  reviewedDays: number;
  averageScore: number | null;
  changeFromPrevious: number | null;
};

export type ProgressSummary = {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  weekly: WeeklyProgress;
};

function activeDay(day: ProgressDay) {
  return day.completed > 0 || (day.score !== null && day.score >= 50);
}

function average(values: readonly number[]) {
  return values.length === 0
    ? null
    : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function sortDays(days: readonly ProgressDay[]) {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateStreaks(days: readonly ProgressDay[]) {
  const ordered = sortDays(days);
  let longest = 0;
  let run = 0;
  for (const day of ordered) {
    if (activeDay(day)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (!activeDay(ordered[index])) break;
    current += 1;
  }
  return { current, longest };
}

export function calculateWeeklyProgress(
  days: readonly ProgressDay[],
  previousDays: readonly ProgressDay[] = [],
): WeeklyProgress {
  const ordered = sortDays(days);
  const week = ordered.slice(-7);
  const scores = week.flatMap((day) => (day.score === null ? [] : [day.score]));
  const previousScores = sortDays(previousDays)
    .slice(-7)
    .flatMap((day) => (day.score === null ? [] : [day.score]));
  const currentAverage = average(scores);
  const priorAverage = average(previousScores);
  return {
    days: week,
    activeDays: week.filter(activeDay).length,
    completed: week.reduce((sum, day) => sum + day.completed, 0),
    postponed: week.reduce((sum, day) => sum + day.postponed, 0),
    reviewedDays: week.filter((day) => day.reviewed).length,
    averageScore: currentAverage,
    changeFromPrevious:
      currentAverage === null || priorAverage === null
        ? null
        : currentAverage - priorAverage,
  };
}

export function buildProgressSummary(
  days: readonly ProgressDay[],
  previousDays: readonly ProgressDay[] = [],
): ProgressSummary {
  const ordered = sortDays(days);
  const streaks = calculateStreaks(ordered);
  return {
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalCompleted: ordered.reduce((sum, day) => sum + day.completed, 0),
    weekly: calculateWeeklyProgress(ordered, previousDays),
  };
}
