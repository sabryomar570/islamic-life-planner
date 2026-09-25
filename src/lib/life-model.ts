/**
 * نموذج الحياة — طبقة خالصة تربط Progressive Profiling بما ستستخدمه الخطة لاحقًا.
 * لا تخترع حقائق: كل نافذة مشتقة من إجابة صريحة، والملاحظات الأنماط تظل
 * "not-yet-observed" حتى تجمع المراجعات بيانات حقيقية.
 */
import {
  ESSENTIAL_ANSWER_KEYS,
  OPTIONAL_ANSWER_KEYS,
  type AnswerKey,
  type ProfileAnswers,
} from "../data/questions";

export const LIFE_MODEL_VERSION = 1 as const;

export type TimeWindow = {
  start: string;
  end: string;
};

export type LearningState = {
  status: "not-yet-observed";
  observedDays: number;
  insights: string[];
};

export type PersonalLifeModel = {
  version: typeof LIFE_MODEL_VERSION;
  sleepWindow: TimeWindow;
  prayer: {
    timesSource: "actual-prayer-times";
    commitment: string;
    mostMissed: string;
  };
  primaryResponsibility: {
    rhythm: string;
    focusStart?: string;
    workWindow?: TimeWindow;
  };
  commitments: string[];
  habits: {
    morningRitual: string;
    movement: string;
    quranAmount: string;
    eveningReset: string;
  };
  goals: {
    primary: string;
    weekly: string;
  };
  focus: {
    preferredStart?: string;
  };
  rest: {
    preferredTime?: string;
    suggestedDurationMinutes: 30;
  };
  distractions: string[];
  preferences: {
    disciplineLevel: string;
  };
  adherence: LearningState;
  discoveredPatterns: LearningState;
};

export type ProfileProgress = {
  coreAnswered: number;
  coreTotal: number;
  coreComplete: boolean;
  refinementAnswered: number;
  refinementTotal: number;
  nextQuestions: AnswerKey[];
};

function hasAnswer(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTime(value: string | undefined): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function optionalWindow(start: string | undefined, end: string | undefined): TimeWindow | undefined {
  if (!isTime(start) || !isTime(end) || start === end) return undefined;
  return { start, end };
}

/** ما تم جمعه فعلًا، دون اعتبار القيم الافتراضية إجابة من المستخدم. */
export function profileProgress(source: Partial<Record<AnswerKey, string>>): ProfileProgress {
  const coreAnswered = ESSENTIAL_ANSWER_KEYS.filter((key) => hasAnswer(source[key])).length;
  const nextQuestions = OPTIONAL_ANSWER_KEYS.filter((key) => !hasAnswer(source[key]));
  return {
    coreAnswered,
    coreTotal: ESSENTIAL_ANSWER_KEYS.length,
    coreComplete: coreAnswered === ESSENTIAL_ANSWER_KEYS.length,
    refinementAnswered: OPTIONAL_ANSWER_KEYS.length - nextQuestions.length,
    refinementTotal: OPTIONAL_ANSWER_KEYS.length,
    nextQuestions: nextQuestions.slice(0, 3),
  };
}

/** يشتق النموذج من آخر إجابات؛ الحقول غير المجابة تبقى غائبة لا مصطنعة. */
export function buildLifeModel(answers: ProfileAnswers): PersonalLifeModel {
  const commitment = answers.commitment?.trim();
  const workWindow = optionalWindow(answers.workStart, answers.workEnd);
  const focusStart = isTime(answers.focusTime) ? answers.focusTime : undefined;
  const restTime = isTime(answers.restTime) ? answers.restTime : undefined;

  return {
    version: LIFE_MODEL_VERSION,
    sleepWindow: { start: answers.wakeTime, end: answers.sleepTime },
    prayer: {
      timesSource: "actual-prayer-times",
      commitment: answers.prayerCommitment,
      mostMissed: answers.mostMissedPrayer,
    },
    primaryResponsibility: {
      rhythm: answers.dayRhythm,
      ...(focusStart ? { focusStart } : {}),
      ...(workWindow ? { workWindow } : {}),
    },
    commitments: commitment ? [commitment] : [],
    habits: {
      morningRitual: answers.startingRitual,
      movement: answers.movement,
      quranAmount: answers.quranAmount,
      eveningReset: answers.eveningReset,
    },
    goals: {
      primary: answers.mainGoal,
      weekly: answers.weeklyFocus,
    },
    focus: focusStart ? { preferredStart: focusStart } : {},
    rest: {
      ...(restTime ? { preferredTime: restTime } : {}),
      suggestedDurationMinutes: 30,
    },
    distractions: answers.distraction ? [answers.distraction] : [],
    preferences: { disciplineLevel: answers.disciplineLevel },
    adherence: { status: "not-yet-observed", observedDays: 0, insights: [] },
    discoveredPatterns: { status: "not-yet-observed", observedDays: 0, insights: [] },
  };
}
