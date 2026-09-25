import { getAuthUserId } from "@convex-dev/auth/server";
import { v, type GenericId } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { pickAnswers } from "../data/questions";
import { buildLifeModel } from "../lib/life-model";
import {
  generateWeeklyPlan,
  updateWeeklyPlanItems,
  type WeeklyPlanItem,
} from "../lib/weekly-plan";
import {
  calculateDailyScore,
  isValidPostponedDate,
  mergePrayerLogsIntoOutcomes,
  upsertPlanOutcome,
  type PlanItemOutcome,
  type PlanItemStatus,
} from "../lib/accountability";
import { buildDayItems } from "../lib/daily-plan";
import { weekStartOfDateKey } from "../lib/time";
import {
  applyApprovedSuggestion,
  buildAdaptiveSuggestions,
  type AdaptiveObservation,
} from "../lib/adaptive-planning";
import { buildWeeklyReview } from "../lib/weekly-review";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ITEM_ID_PATTERN = /^\d{4}-\d{2}-\d{2}:[a-zA-Z0-9:_-]{1,90}$/;
const TIMEZONE_PATTERN = /^[a-zA-Z0-9_+\-/]{1,80}$/;

const PLAN_ITEM_STATUSES = ["completed", "partial", "postponed", "skipped"] as const satisfies readonly PlanItemStatus[];
const planItemStatusValidator = v.union(
  ...PLAN_ITEM_STATUSES.map((status) => v.literal(status)),
);

const itemPatchValidator = v.object({
  title: v.optional(v.string()),
  startTime: v.optional(v.union(v.string(), v.null())),
  endTime: v.optional(v.union(v.string(), v.null())),
  durationMinutes: v.optional(v.union(v.number(), v.null())),
  enabled: v.optional(v.boolean()),
});

type AnyCtx = QueryCtx | MutationCtx;

async function requireUserId(ctx: AnyCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("يلزم تسجيل الدخول للمتابعة");
  return userId;
}

function assertDate(value: string) {
  if (!DAY_PATTERN.test(value)) throw new Error("صيغة التاريخ غير صحيحة");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("تاريخ غير صالح");
  }
  const year = parsed.getUTCFullYear();
  if (year < 2020 || year > 2100) throw new Error("تاريخ خارج النطاق المسموح");
  return value;
}

function weekDates(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function shiftDays(dateKey: string, days: number) {
  const value = new Date(`${dateKey}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function assertWeekStart(value: string) {
  if (!DAY_PATTERN.test(value)) throw new Error("تاريخ بداية الأسبوع غير صحيح");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("تاريخ بداية الأسبوع غير صالح");
  }
  if (parsed.getUTCDay() !== 1) throw new Error("يجب أن يبدأ الأسبوع يوم الاثنين");
  return value;
}

async function adaptiveContext(ctx: AnyCtx, userId: GenericId<"users">, weekStart: string) {
  const current = await ctx.db
    .query("weeklyPlans")
    .withIndex("by_user_and_week", (q) =>
      q.eq("userId", userId).eq("weekStart", weekStart),
    )
    .unique();
  if (!current) return null;
  const start = new Date(`${weekStart}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 27);
  const from = start.toISOString().slice(0, 10);
  const to = weekDates(weekStart)[6];
  const [plans, { logs, prayerLogs }] = await Promise.all([
    ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).gte("weekStart", from).lte("weekStart", weekStart),
      )
      .take(8),
    planOutcomesForRange(ctx, userId, from, to),
  ]);
  const rangeItems = plans.flatMap((plan) => plan.items as WeeklyPlanItem[]);
  const outcomes = mergePrayerLogsIntoOutcomes({
    items: rangeItems,
    outcomes: toOutcomes(logs),
    prayerLogs: prayerLogs.map((log) => ({
      date: log.date,
      prayer: log.prayer,
      status: log.status,
      updatedAt: log.updatedAt,
    })),
  });
  const itemById = new Map(rangeItems.map((item) => [item.id, item] as const));
  const observations: AdaptiveObservation[] = outcomes.flatMap((outcome) => {
    const item = itemById.get(outcome.itemId);
    if (!item) return [];
    return [{
      itemId: outcome.itemId,
      date: outcome.date,
      kind: item.kind as AdaptiveObservation["kind"],
      importance: item.importance as AdaptiveObservation["importance"],
      ...(item.startTime ? { startTime: item.startTime } : {}),
      status: outcome.status,
    }];
  });
  return {
    current,
    suggestions: buildAdaptiveSuggestions({
      currentItems: current.items as WeeklyPlanItem[],
      outcomes: [],
      observations,
    }),
  };
}

function toOutcomes(
  logs: readonly {
    date: string;
    itemId: string;
    weekStart: string;
    status: string;
    postponedTo?: string;
    reason: string;
    createdAt: number;
    updatedAt: number;
  }[],
): PlanItemOutcome[] {
  return logs.map((log) => ({
    date: log.date,
    itemId: log.itemId,
    weekStart: log.weekStart,
    status: log.status as PlanItemStatus,
    postponedTo: log.postponedTo ?? null,
    reason: log.reason,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  }));
}

/**
 * سجلات الخطة مع سجل الصلاة في مصدر واحد.
 * بدون هذا تحسب الواجهة نتيجة يومIncludes الصلوات، بينما تحسب المراجعة الأسبوعية
 * والتكييف من planItemLogs وحدها فيظهر رقمان مختلفان لنفس اليوم.
 */
async function planOutcomesForRange(
  ctx: AnyCtx,
  userId: GenericId<"users">,
  from: string,
  to: string,
) {
  const [logs, prayerLogs] = await Promise.all([
    ctx.db
      .query("planItemLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .take(500),
    ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .take(300),
  ]);
  return { logs, prayerLogs };
}

function assertTime(value: string, field: string) {
  if (!TIME_PATTERN.test(value)) throw new Error(`قيمة ${field} يجب أن تكون وقتًا مثل 08:30`);
  return value;
}

function cleanText(value: string, maxLength: number) {
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) throw new Error("النص مطلوب");
  if (cleaned.length > maxLength) throw new Error("النص أطول من الحد المسموح");
  return cleaned;
}

function cleanTimezone(value: string | undefined) {
  const timezone = value?.trim() || "local";
  if (!TIMEZONE_PATTERN.test(timezone)) throw new Error("المنطقة الزمنية غير صالحة");
  return timezone;
}

function serializeItem(item: WeeklyPlanItem) {
  return {
    id: item.id,
    date: item.date,
    day: item.day,
    kind: item.kind,
    title: item.title,
    importance: item.importance,
    recurrence: item.recurrence,
    origin: item.origin,
    enabled: item.enabled,
    ...(item.startTime ? { startTime: item.startTime } : {}),
    ...(item.endTime ? { endTime: item.endTime } : {}),
    ...(item.durationMinutes !== undefined
      ? { durationMinutes: item.durationMinutes }
      : {}),
    ...(item.prayerAnchor ? { prayerAnchor: item.prayerAnchor } : {}),
  };
}

export const getWeeklyPlan = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const safeWeekStart = assertWeekStart(weekStart);
    return await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
  },
});

/** إنشاء الخطة مرة واحدة؛ الاستدعاء المتكرر يعيد النسخة نفسها ولا يمحو تعديلات المستخدم. */
export const ensureWeeklyPlan = mutation({
  args: {
    weekStart: v.string(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, { weekStart, timezone }) => {
    const userId = await requireUserId(ctx);
    const safeWeekStart = assertWeekStart(weekStart);
    const safeTimezone = cleanTimezone(timezone);

    const existing = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
    if (existing) {
      return { id: existing._id, version: existing.version, created: false };
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("أكمل نموذج الحياة أولًا قبل إنشاء الخطة");

    const generated = generateWeeklyPlan({
      model: buildLifeModel(pickAnswers(profile)),
      weekStart: safeWeekStart,
      timezone: safeTimezone,
    });
    const now = Date.now();
    const id = await ctx.db.insert("weeklyPlans", {
      userId,
      weekStart: safeWeekStart,
      timezone: safeTimezone,
      weeklyFocus: generated.weeklyFocus,
      items: generated.items.map(serializeItem),
      version: 1,
      sourceProfileUpdatedAt: profile.updatedAt,
      createdAt: now,
      updatedAt: now,
    });
    return { id, version: 1, created: true };
  },
});

/** تعديل عنصر واحد مع expectedVersion؛ تكرار نفس الطلب بعد النجاح لا يغيّر النسخة. */
export const updateWeeklyPlanItem = mutation({
  args: {
    weekStart: v.string(),
    itemId: v.string(),
    expectedVersion: v.number(),
    patch: itemPatchValidator,
  },
  handler: async (ctx, { weekStart, itemId, expectedVersion, patch }) => {
    const userId = await requireUserId(ctx);
    const safeWeekStart = assertWeekStart(weekStart);
    if (!ITEM_ID_PATTERN.test(itemId)) throw new Error("معرّف عنصر الخطة غير صحيح");
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("نسخة الخطة غير صالحة");
    }

    const plan = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
    if (!plan) throw new Error("لا توجد خطة لهذا الأسبوع");
    if (plan.version !== expectedVersion) {
      throw new Error("تغيرت الخطة في جهاز آخر؛ حدّثها ثم أعد المحاولة");
    }
    if (!plan.items.some((item) => item.id === itemId)) {
      throw new Error("عنصر الخطة غير موجود");
    }

    const safePatch = {
      ...(patch.title !== undefined ? { title: cleanText(patch.title, 160) } : {}),
      ...(patch.startTime !== undefined
        ? patch.startTime === null
          ? { startTime: null }
          : { startTime: assertTime(patch.startTime, "بداية العنصر") }
        : {}),
      ...(patch.endTime !== undefined
        ? patch.endTime === null
          ? { endTime: null }
          : { endTime: assertTime(patch.endTime, "نهاية العنصر") }
        : {}),
      ...(patch.durationMinutes !== undefined
        ? patch.durationMinutes === null
          ? { durationMinutes: null }
          : patch.durationMinutes >= 5 && patch.durationMinutes <= 720 &&
              Number.isSafeInteger(patch.durationMinutes)
            ? { durationMinutes: patch.durationMinutes }
            : (() => {
                throw new Error("مدة العنصر يجب أن تكون بين 5 و720 دقيقة");
              })()
        : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    };

    const currentItems = plan.items as WeeklyPlanItem[];
    const result = updateWeeklyPlanItems(currentItems, itemId, safePatch);
    if (!result.changed) {
      return { id: plan._id, version: plan.version, changed: false };
    }

    const version = plan.version + 1;
    await ctx.db.patch(plan._id, {
      items: result.items.map(serializeItem),
      version,
      updatedAt: Date.now(),
    });
    return { id: plan._id, version, changed: true };
  },
});

export const getPlanItemLogs = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const safeDate = assertDate(date);
    return await ctx.db
      .query("planItemLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", safeDate))
      .collect();
  },
});

/** تسجيل حالة العنصر؛ uniqueness على user/date/item يمنع تكرار النقر. */
export const setPlanItemStatus = mutation({
  args: {
    date: v.string(),
    weekStart: v.string(),
    itemId: v.string(),
    status: planItemStatusValidator,
    postponedTo: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const date = assertDate(args.date);
    const weekStart = assertWeekStart(args.weekStart);
    if (!ITEM_ID_PATTERN.test(args.itemId)) throw new Error("معرّف عنصر الخطة غير صحيح");

    const plan = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", weekStart),
      )
      .unique();
    if (!plan) throw new Error("لا توجد خطة لهذا الأسبوع");
    const planItem = plan.items.find((item) => item.id === args.itemId);
    if (!planItem || planItem.date !== date) throw new Error("عنصر الخطة لا ينتمي لهذا اليوم");

    let postponedTo: string | null = null;
    if (args.status === "postponed") {
      if (!args.postponedTo) throw new Error("اختر تاريخًا جديدًا عند التأجيل");
      postponedTo = assertDate(args.postponedTo);
      if (!isValidPostponedDate(date, postponedTo)) {
        throw new Error("التأجيل يجب أن يكون ليوم لاحق");
      }
    }
    const reason = args.reason && args.reason.trim().length > 0
      ? cleanText(args.reason, 160)
      : "";

    const existing = await ctx.db
      .query("planItemLogs")
      .withIndex("by_user_and_date_and_item", (q) =>
        q.eq("userId", userId).eq("date", date).eq("itemId", args.itemId),
      )
      .unique();
    const result = upsertPlanOutcome(
      existing
        ? ({
            ...existing,
            postponedTo: existing.postponedTo ?? null,
          } as PlanItemOutcome)
        : null,
      {
        date,
        itemId: args.itemId,
        weekStart,
        status: args.status,
        postponedTo,
        reason,
        now: Date.now(),
      },
    );
    if (!result.changed) {
      return { id: existing!._id, changed: false, status: result.outcome.status };
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: result.outcome.status,
        ...(postponedTo ? { postponedTo } : { postponedTo: undefined }),
        reason: result.outcome.reason,
        updatedAt: result.outcome.updatedAt,
      });
      return { id: existing._id, changed: true, status: result.outcome.status };
    }
    const id = await ctx.db.insert("planItemLogs", {
      userId,
      date,
      weekStart,
      itemId: args.itemId,
      status: result.outcome.status,
      ...(postponedTo ? { postponedTo } : {}),
      reason: result.outcome.reason,
      createdAt: result.outcome.createdAt,
      updatedAt: result.outcome.updatedAt,
    });
    return { id, changed: true, status: result.outcome.status };
  },
});

/** التراجع عن حالة يومية؛ idempotent ولا يترك سجلًا وهميًا. */
export const resetPlanItemStatus = mutation({
  args: { date: v.string(), itemId: v.string() },
  handler: async (ctx, { date, itemId }) => {
    const userId = await requireUserId(ctx);
    const safeDate = assertDate(date);
    if (!ITEM_ID_PATTERN.test(itemId)) throw new Error("معرّف عنصر الخطة غير صحيح");
    const existing = await ctx.db
      .query("planItemLogs")
      .withIndex("by_user_and_date_and_item", (q) =>
        q.eq("userId", userId).eq("date", safeDate).eq("itemId", itemId),
      )
      .unique();
    if (!existing) return { changed: false };
    await ctx.db.delete(existing._id);
    return { changed: true };
  },
});

/** سجل أسبوع: عدّادات مشتقة من السجلات، ونتيجة بنفس منطق الحساب في العميل. */
function weekRecords(input: {
  weekStart: string;
  items: readonly WeeklyPlanItem[];
  outcomes: readonly PlanItemOutcome[];
  reviewedDates: ReadonlySet<string>;
}) {
  return weekDates(input.weekStart).map((date) => {
    const dayOutcomes = input.outcomes.filter((outcome) => outcome.date === date);
    const counts = { completed: 0, partial: 0, postponed: 0, skipped: 0 };
    for (const outcome of dayOutcomes) counts[outcome.status] += 1;
    const dayItems = buildDayItems(input.items, date);
    return {
      date,
      planned: dayItems.length,
      ...counts,
      reviewed: input.reviewedDates.has(date),
      // الأيام المنقضية تُحسب مغلقة: ما لم يُسجَّل يُحسب فائئًا لا معلَّقًا.
      score: calculateDailyScore({ items: dayItems, outcomes: dayOutcomes, closed: true }).score,
    };
  });
}

function toPrayerLogs(logs: readonly { date: string; prayer: string; status: string; updatedAt: number }[]) {
  return logs.map((log) => ({
    date: log.date,
    prayer: log.prayer,
    status: log.status,
    updatedAt: log.updatedAt,
  }));
}

/** تجميع الأسبوع عبر فهارس نطاق؛ لا استعلام يومي متعدد. */
export const getPlanProgress = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const safeWeekStart = assertWeekStart(weekStart);
    const dates = weekDates(safeWeekStart);
    const from = dates[0];
    const to = dates[6];
    const plan = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
    if (!plan) return null;

    // الأسبوع السابق يحتاج سجلاته هو، فنقرأ نطاق أسبوعين مرة واحدة ونقسّمه.
    const previousKey = weekStartOfDateKey(shiftDays(safeWeekStart, -7));
    const previousFrom = weekDates(previousKey)[0];
    const [{ logs, prayerLogs }, previousPlan, reviews, previousReviews] = await Promise.all([
      planOutcomesForRange(ctx, userId, previousFrom, to),
      ctx.db
        .query("weeklyPlans")
        .withIndex("by_user_and_week", (q) =>
          q.eq("userId", userId).eq("weekStart", previousKey),
        )
        .unique(),
      ctx.db
        .query("dayReviews")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", from).lte("date", to),
        )
        .take(20),
      ctx.db
        .query("dayReviews")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", previousFrom).lte("date", to),
        )
        .take(20),
    ]);

    const currentOutcomes = mergePrayerLogsIntoOutcomes({
      items: plan.items as WeeklyPlanItem[],
      outcomes: toOutcomes(logs.filter((log) => log.date >= from)),
      prayerLogs: toPrayerLogs(prayerLogs.filter((log) => log.date >= from)),
    });
    const records = weekRecords({
      weekStart: safeWeekStart,
      items: plan.items as WeeklyPlanItem[],
      outcomes: currentOutcomes,
      reviewedDates: new Set(reviews.map((review) => review.date)),
    });

    // لا مقارنة بلا أساس: إن لم تكن هناك خطة سابقة فلا متوسط سابق.
    const previous =
      previousPlan === null
        ? null
        : {
            weekStart: previousKey,
            records: weekRecords({
              weekStart: previousKey,
              items: previousPlan.items as WeeklyPlanItem[],
              outcomes: mergePrayerLogsIntoOutcomes({
                items: previousPlan.items as WeeklyPlanItem[],
                outcomes: toOutcomes(logs.filter((log) => log.date < from)),
                prayerLogs: toPrayerLogs(prayerLogs.filter((log) => log.date < from)),
              }),
              reviewedDates: new Set(
                previousReviews
                  .map((review) => review.date)
                  .filter((date) => date < from),
              ),
            }),
          };

    return { weekStart: safeWeekStart, records, previous };
  },
});

export const getAdaptiveSuggestions = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return (await adaptiveContext(ctx, userId, assertWeekStart(weekStart)))?.suggestions ?? [];
  },
});

/** يطبق اقتراحًا فقط بعد اختيار المستخدم، مع expectedVersion وسجل موافقة. */
export const applyPlanSuggestion = mutation({
  args: { weekStart: v.string(), suggestionId: v.string(), expectedVersion: v.number() },
  handler: async (ctx, { weekStart, suggestionId, expectedVersion }) => {
    const userId = await requireUserId(ctx);
    const safeWeekStart = assertWeekStart(weekStart);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new Error("نسخة الخطة غير صالحة");
    }
    const context = await adaptiveContext(ctx, userId, safeWeekStart);
    if (!context) throw new Error("لا توجد خطة لهذا الأسبوع");
    if (context.current.version !== expectedVersion) {
      throw new Error("تغيرت الخطة في جهاز آخر؛ حدّثها ثم أعد المحاولة");
    }
    const suggestion = context.suggestions.find((item) => item.id === suggestionId);
    if (!suggestion) throw new Error("الاقتراح لم يعد متاحًا أو البيانات غير كافية");
    const result = applyApprovedSuggestion(context.current.items as WeeklyPlanItem[], suggestion);
    if (!result.changed) return { id: context.current._id, version: context.current.version, changed: false };
    const version = context.current.version + 1;
    await ctx.db.patch(context.current._id, {
      items: result.items.map(serializeItem),
      version,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("adaptiveApprovals", {
      userId,
      weekStart: safeWeekStart,
      suggestionId,
      kind: suggestion.kind,
      payload: JSON.stringify({ itemIds: suggestion.itemIds, patch: suggestion.patch ?? {} }),
      appliedAt: Date.now(),
    });
    return { id: context.current._id, version, changed: true };
  },
});

export const getWeeklyReview = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const safeWeekStart = assertWeekStart(weekStart);
    return await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
  },
});

/** Weekly Review ملخص مشتق؛ لا يعدّل الخطة ولا يطبق اقتراحات تلقائيًا. */
export const saveWeeklyReview = mutation({
  args: { weekStart: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, { weekStart, note }) => {
    const userId = await requireUserId(ctx);
    const safeWeekStart = assertWeekStart(weekStart);
    const dates = weekDates(safeWeekStart);
    const from = dates[0];
    const to = dates[dates.length - 1];
    const plan = await ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
    if (!plan) throw new Error("لا توجد خطة لهذا الأسبوع");

    const [{ logs: outcomeLogs, prayerLogs }, adhkarLogs, reviews] = await Promise.all([
      planOutcomesForRange(ctx, userId, from, to),
      ctx.db
        .query("adhkarLogs")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", from).lte("date", to),
        )
        .take(100),
      ctx.db
        .query("dayReviews")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", from).lte("date", to),
        )
        .take(20),
    ]);
    const items = plan.items as WeeklyPlanItem[];
    const safeNote = note && note.trim().length > 0 ? cleanText(note, 500) : "";
    const summary = buildWeeklyReview({
      plan: {
        weekStart: plan.weekStart,
        timezone: plan.timezone,
        weeklyFocus: plan.weeklyFocus,
        items,
      },
      outcomes: mergePrayerLogsIntoOutcomes({
        items,
        outcomes: toOutcomes(outcomeLogs),
        prayerLogs: toPrayerLogs(prayerLogs),
      }),
      prayerLogs: prayerLogs.map((log) => ({
        date: log.date,
        prayer: log.prayer,
        status: log.status,
      })),
      adhkarLogs: adhkarLogs.map((log) => ({ date: log.date, kind: log.kind })),
      reviews: reviews.map((review) => ({
        date: review.date,
        mood: review.mood,
        blocker: review.blocker,
        note: review.note,
      })),
    });
    const existing = await ctx.db
      .query("weeklyReviews")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).eq("weekStart", safeWeekStart),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      const unchanged =
        JSON.stringify(existing.summary) === JSON.stringify(summary) &&
        existing.note === safeNote;
      if (unchanged) {
        return { id: existing._id, version: existing.version, changed: false };
      }
      const version = existing.version + 1;
      await ctx.db.patch(existing._id, {
        summary,
        note: safeNote,
        version,
        updatedAt: now,
      });
      return { id: existing._id, version, changed: true };
    }
    const id = await ctx.db.insert("weeklyReviews", {
      userId,
      weekStart: safeWeekStart,
      summary,
      note: safeNote,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    return { id, version: 1, changed: true };
  },
});
