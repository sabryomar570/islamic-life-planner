import { describe, expect, test } from "bun:test";
import { buildLifeModel, profileProgress } from "../src/lib/life-model";
import {
  ESSENTIAL_ANSWER_KEYS,
  OPTIONAL_ANSWER_KEYS,
  pickAnswers,
  type ProfileAnswers,
} from "../src/data/questions";

const ESSENTIAL: Record<string, string> = {
  wakeTime: "06:00",
  sleepTime: "23:00",
  prayerCommitment: "most",
  mostMissedPrayer: "fajr",
  quranAmount: "page",
  mainGoal: "quran",
  startingRitual: "wird",
};

describe("Progressive Profiling", () => {
  test("first run still needs only the seven essential answers", () => {
    expect(ESSENTIAL_ANSWER_KEYS).toHaveLength(7);
    const progress = profileProgress(ESSENTIAL);
    expect(progress.coreComplete).toBe(true);
    expect(progress.coreAnswered).toBe(7);
    expect(progress.refinementAnswered).toBe(0);
    expect(progress.refinementTotal).toBe(OPTIONAL_ANSWER_KEYS.length);
    expect(progress.nextQuestions[0]).toBe("dayRhythm");
  });

  test("pickAnswers keeps saved values and does not invent optional schedule fields", () => {
    const answers = pickAnswers(ESSENTIAL);
    expect(answers.wakeTime).toBe("06:00");
    expect(answers.workStart).toBe("");
    expect(answers.workEnd).toBe("");
    expect(answers.restTime).toBe("");
    expect(answers.commitment).toBe("");
  });

  test("counts later refinements without changing what is complete", () => {
    const progress = profileProgress({
      ...ESSENTIAL,
      workStart: "09:00",
      workEnd: "15:00",
      restTime: "13:00",
    });
    expect(progress.coreComplete).toBe(true);
    expect(progress.refinementAnswered).toBe(3);
    expect(progress.nextQuestions).not.toContain("workStart");
    expect(progress.nextQuestions).not.toContain("restTime");
  });
});

describe("Personal Life Model", () => {
  test("derives explicit windows, commitment, habits, goals, and preferences", () => {
    const answers: ProfileAnswers = pickAnswers({
      ...ESSENTIAL,
      dayRhythm: "study",
      focusTime: "08:30",
      workStart: "09:00",
      workEnd: "15:00",
      restTime: "12:30",
      movement: "walk",
      eveningReset: "reflection",
      disciplineLevel: "firm",
      weeklyFocus: "consistency",
      commitment: "إنهاء ملخص المشروع",
    });
    const model = buildLifeModel(answers);

    expect(model.sleepWindow).toEqual({ start: "06:00", end: "23:00" });
    expect(model.primaryResponsibility.rhythm).toBe("study");
    expect(model.primaryResponsibility.workWindow).toEqual({ start: "09:00", end: "15:00" });
    expect(model.focus.preferredStart).toBe("08:30");
    expect(model.rest).toEqual({ preferredTime: "12:30", suggestedDurationMinutes: 30 });
    expect(model.commitments).toEqual(["إنهاء ملخص المشروع"]);
    expect(model.habits.eveningReset).toBe("reflection");
    expect(model.goals.weekly).toBe("consistency");
    expect(model.preferences.disciplineLevel).toBe("firm");
  });

  test("does not claim adherence or discovered patterns before actual observations", () => {
    const model = buildLifeModel(pickAnswers(ESSENTIAL));
    expect(model.adherence).toEqual({
      status: "not-yet-observed",
      observedDays: 0,
      insights: [],
    });
    expect(model.discoveredPatterns).toEqual({
      status: "not-yet-observed",
      observedDays: 0,
      insights: [],
    });
  });

  test("omits incomplete or zero-length work windows", () => {
    const partial = buildLifeModel(
      pickAnswers({ ...ESSENTIAL, workStart: "09:00", workEnd: "" }),
    );
    const zeroLength = buildLifeModel(
      pickAnswers({ ...ESSENTIAL, workStart: "09:00", workEnd: "09:00" }),
    );
    expect(partial.primaryResponsibility.workWindow).toBeUndefined();
    expect(zeroLength.primaryResponsibility.workWindow).toBeUndefined();
  });
});
