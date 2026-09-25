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
  isValidPostponedDate,
  upsertPlanOutcome,
  type PlanItemOutcome,
  type PlanItemStatus,
} from "../lib/accountability";
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
  const [plans, logs] = await Promise.all([
    ctx.db
      .query("weeklyPlans")
      .withIndex("by_user_and_week", (q) =>
        q.eq("userId", userId).gte("weekStart", from).lte("weekStart", weekStart),
      )
      .take(8),
    ctx.db
      .query("planItemLogs")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("date", from).lte("date", to),
      )
      .take(1000),
  ]);
  const itemById = new Map(
    plans.flatMap((plan) => plan.items.map((item) => [item.id, item] as const)),
  );
  const observations: AdaptiveObservation[] = logs.flatMap((log) => {
    const item = itemById.get(log.itemId);
    if (!item) return [];
    return [{
      itemId: log.itemId,
      date: log.date,
      kind: item.kind as AdaptiveObservation["kind"],
      importance: item.importance as AdaptiveObservation["importance"],
      ...(item.startTime ? { startTime: item.startTime } : {}),
      status: log.status as PlanItemStatus,
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

/** تجميع الأسبوع عبر فهرس واحد؛ لا استعلام يومي متعدد. */
export const getPlanProgress = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
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
    if (!plan) return null;

    const [logs, reviews] = await Promise.all([
      ctx.db
        .query("planItemLogs")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", from).lte("date", to),
        )
        .take(500),
      ctx.db
        .query("dayReviews")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", userId).gte("date", from).lte("date", to),
        )
        .take(20),
    ]);
    const reviewed = new Set(reviews.map((review) => review.date));
    return {
      weekStart: safeWeekStart,
      records: dates.map((date) => {
        const dayLogs = logs.filter((log) => log.date === date);
        const counts = { completed: 0, partial: 0, postponed: 0, skipped: 0 };
        for (const log of dayLogs) {
          if (log.status in counts) counts[log.status as keyof typeof counts] += 1;
        }
        return {
          date,
          planned: plan.items.filter((item) => item.date === date && item.enabled).length,
          ...counts,
          reviewed: reviewed.has(date),
        };
      }),
    };
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

    const [outcomeLogs, prayerLogs, adhkarLogs, reviews] = await Promise.all([
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
        .take(100),
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
    const safeNote = note && note.trim().length > 0 ? cleanText(note, 500) : "";
    const summary = buildWeeklyReview({
      plan: {
        weekStart: plan.weekStart,
        timezone: plan.timezone,
        weeklyFocus: plan.weeklyFocus,
        items: plan.items as WeeklyPlanItem[],
      },
      outcomes: outcomeLogs.map((log) => ({
        date: log.date,
        itemId: log.itemId,
        weekStart: log.weekStart,
        status: log.status as PlanItemStatus,
        postponedTo: log.postponedTo ?? null,
        reason: log.reason,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
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
