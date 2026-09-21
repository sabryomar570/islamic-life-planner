import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";

/** الحقول الخمسة عشر المستخرجة من أسئلة «نظام حياتك». */
export const answersValidator = v.object({
  wakeTime: v.string(),
  sleepTime: v.string(),
  prayerCommitment: v.string(),
  mostMissedPrayer: v.string(),
  wantsFajrReminder: v.string(),
  quranFrequency: v.string(),
  quranAmount: v.string(),
  workStart: v.string(),
  workEnd: v.string(),
  exerciseFrequency: v.string(),
  exerciseTime: v.string(),
  familyTime: v.string(),
  distraction: v.string(),
  mainGoal: v.string(),
  city: v.string(),
});

async function requireUserId(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("يلزم تسجيل الدخول للمتابعة");
  return userId;
}

/** خطّة المستخدم كما أجاب عليها في أسئلة البداية. */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

/** حفظ أو تحديث إجابات الأسئلة الخمسة عشر. */
export const saveProfile = mutation({
  args: { answers: answersValidator },
  handler: async (ctx, { answers }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const payload = { ...answers, userId, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("profiles", payload);
  },
});

/** كل ما تحتاجه الشاشة الرئيسية لهذا اليوم: الصلوات، الأذكار، المحفوظات. */
export const getDayState = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { prayers: {}, adhkar: [], favorites: [] };
    }

    const prayerLogs = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    const adhkarLogs = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const prayers: Record<string, string> = {};
    for (const log of prayerLogs) prayers[log.prayer] = log.status;

    return {
      prayers,
      adhkar: adhkarLogs.map((log) => log.kind),
      favorites: favorites.map((item) => item.itemId),
    };
  },
});

/** تسجيل حالة صلاة (في جماعة / في الوقت / متأخرة / فائتة). */
export const setPrayerStatus = mutation({
  args: {
    date: v.string(),
    prayer: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date_and_prayer", (q) =>
        q.eq("userId", userId).eq("date", args.date).eq("prayer", args.prayer),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("prayerLogs", {
      userId,
      date: args.date,
      prayer: args.prayer,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/** تعليم مجموعة أذكار (صباح/مساء/نوم) كمنجزة أو غير منجزة في هذا اليوم. */
export const setAdhkarDone = mutation({
  args: {
    date: v.string(),
    kind: v.string(),
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date_and_kind", (q) =>
        q.eq("userId", userId).eq("date", args.date).eq("kind", args.kind),
      )
      .unique();

    if (args.done) {
      if (existing) {
        await ctx.db.patch(existing._id, { doneAt: Date.now() });
        return existing._id;
      }
      return await ctx.db.insert("adhkarLogs", {
        userId,
        date: args.date,
        kind: args.kind,
        doneAt: Date.now(),
      });
    }

    if (existing) {
      await ctx.db.delete(existing._id);
      return null;
    }
    return null;
  },
});

/** آخر ٧ أيام من الصلوات والأذكار — للاستمرارية والمتابعة. */
export const getHistory = query({
  args: { dates: v.array(v.string()) },
  handler: async (ctx, { dates }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { prayers: {}, adhkar: {} };

    const prayers: Record<string, Record<string, string>> = {};
    const adhkar: Record<string, string[]> = {};

    for (const date of dates) {
      const dayLogs = await ctx.db
        .query("prayerLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
        .collect();
      const dayAdhkar = await ctx.db
        .query("adhkarLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
        .collect();

      prayers[date] = Object.fromEntries(dayLogs.map((log) => [log.prayer, log.status]));
      adhkar[date] = dayAdhkar.map((log) => log.kind);
    }

    return { prayers, adhkar };
  },
});

/** إضافة/إزالة عنصر من المحفوظات (أحاديث، أبيات، أذكار). */
export const toggleFavorite = mutation({
  args: {
    itemId: v.string(),
    kind: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_item", (q) =>
        q.eq("userId", userId).eq("itemId", args.itemId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    await ctx.db.insert("favorites", {
      userId,
      itemId: args.itemId,
      kind: args.kind,
      title: args.title,
      savedAt: Date.now(),
    });
    return true;
  },
});
