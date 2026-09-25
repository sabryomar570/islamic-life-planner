/**
 * Progress foundation — streaks وmilestones without gamification pressure.
 * لا نقاط_compare بين الناس، ولا achievements قبل وجود فعل حقيقي في السجل.
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

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  kind: "milestone" | "consistency" | "review";
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
  achievements: Achievement[];
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

export function calculateAchievements(days: readonly ProgressDay[]): Achievement[] {
  const ordered = sortDays(days);
  const streaks = calculateStreaks(ordered);
  const completed = ordered.reduce((sum, day) => sum + day.completed, 0);
  const reviewed = ordered.filter((day) => day.reviewed).length;
  const achievements: Achievement[] = [
    {
      id: "first-step",
      title: "أول خطوة",
      description: "سجّلت أول عنصر مكتمل في خطتك.",
      unlocked: completed >= 1,
      progress: Math.min(completed, 1),
      target: 1,
      kind: "milestone",
    },
    {
      id: "steady-seven",
      title: "إيقاع سبعة",
      description: "حافظت على يوم نشط لمدة سبعة أيام متتالية.",
      unlocked: streaks.longest >= 7,
      progress: Math.min(streaks.longest, 7),
      target: 7,
      kind: "consistency",
    },
    {
      id: "first-review",
      title: "وقفة صادقة",
      description: "أكملت أول مراجعة يومية لتعرف نمطك.",
      unlocked: reviewed >= 1,
      progress: Math.min(reviewed, 1),
      target: 1,
      kind: "review",
    },
  ];
  return achievements;
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
    achievements: calculateAchievements(ordered),
  };
}
