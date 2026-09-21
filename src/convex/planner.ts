import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

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

/* ——— قوائم مغلقة: أي قيمة خارجها تُرفض في طبقة الخادم قبل وصولها لقاعدة البيانات. ——— */
const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_STATUSES = ["jamaah", "ontime", "late", "missed"] as const;
const ADHKAR_KINDS = ["morning", "evening", "sleep", "after_prayer", "distress"] as const;
const FAVORITE_KINDS = ["hadith", "poem", "dhikr", "ayah"] as const;

export const prayerValidator = v.union(...PRAYER_KEYS.map((key) => v.literal(key)));
export const prayerStatusValidator = v.union(...PRAYER_STATUSES.map((value) => v.literal(value)));
export const adhkarKindValidator = v.union(...ADHKAR_KINDS.map((value) => v.literal(value)));
export const favoriteKindValidator = v.union(...FAVORITE_KINDS.map((value) => v.literal(value)));

const MAX_TEXT = 160;
const MAX_FAVORITES = 500;
const MAX_HISTORY_DAYS = 31;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ITEM_ID_PATTERN = /^[a-zA-Z0-9:_-]{1,48}$/;

type AnyCtx = QueryCtx | MutationCtx;

async function requireUserId(ctx: AnyCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("يلزم تسجيل الدخول للمتابعة");
  return userId;
}

/** تنظيف النصوص القادمة من العميل: بلا أسطر مخفية ولا أحرف تحكّم. */
function cleanText(value: string, maxLength = MAX_TEXT) {
  const trimmed = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (trimmed.length === 0) throw new Error("النص فارغ");
  if (trimmed.length > maxLength) throw new Error("النص أطول من الحد المسموح");
  return trimmed;
}

/** يتحقق أن التاريخ بصيغة YYYY-MM-DD وضمن نطاق معقول. */
function assertDate(date: string) {
  if (!DAY_PATTERN.test(date)) throw new Error("صيغة التاريخ غير صحيحة");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("تاريخ غير صالح");
  const year = parsed.getUTCFullYear();
  if (year < 2020 || year > 2100) throw new Error("تاريخ خارج النطاق المسموح");
  return date;
}

function assertTime(value: string, field: string) {
  if (!TIME_PATTERN.test(value)) throw new Error(`قيمة ${field} يجب أن تكون وقتًا مثل 06:30`);
  return value;
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

/** حفظ أو تحديث إجابات الأسئلة الخمسة عشر بعد التحقق من كل قيمة. */
export const saveProfile = mutation({
  args: { answers: answersValidator },
  handler: async (ctx, { answers }) => {
    const userId = await requireUserId(ctx);

    const safe = {
      wakeTime: assertTime(answers.wakeTime, "وقت الاستيقاظ"),
      sleepTime: assertTime(answers.sleepTime, "وقت النوم"),
      workStart: assertTime(answers.workStart, "بداية العمل"),
      workEnd: assertTime(answers.workEnd, "نهاية العمل"),
      prayerCommitment: cleanText(answers.prayerCommitment, 40),
      mostMissedPrayer: cleanText(answers.mostMissedPrayer, 40),
      wantsFajrReminder: cleanText(answers.wantsFajrReminder, 40),
      quranFrequency: cleanText(answers.quranFrequency, 40),
      quranAmount: cleanText(answers.quranAmount, 40),
      exerciseFrequency: cleanText(answers.exerciseFrequency, 40),
      exerciseTime: cleanText(answers.exerciseTime, 40),
      familyTime: cleanText(answers.familyTime, 40),
      distraction: cleanText(answers.distraction, 40),
      mainGoal: cleanText(answers.mainGoal, 40),
      city: cleanText(answers.city, 80),
    };

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const payload = { ...safe, userId, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("profiles", payload);
  },
});

/** حفظ إحداثيات الموقع (اختياري) لحساب مواقيت أدق. */
export const setLocation = mutation({
  args: {
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    locationLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) throw new Error("أكمل إجاباتك أولًا ثم احفظ موقعك");

    const patch: {
      latitude?: number;
      longitude?: number;
      locationLabel?: string;
    } = {};

    if (args.latitude !== undefined || args.longitude !== undefined) {
      if (args.latitude === undefined || args.longitude === undefined) {
        throw new Error("الإحداثيات غير مكتملة");
      }
      if (
        !Number.isFinite(args.latitude) ||
        !Number.isFinite(args.longitude) ||
        Math.abs(args.latitude) > 90 ||
        Math.abs(args.longitude) > 180
      ) {
        throw new Error("إحداثيات خارج النطاق الصحيح");
      }
      patch.latitude = Number(args.latitude.toFixed(4));
      patch.longitude = Number(args.longitude.toFixed(4));
    }

    if (args.locationLabel !== undefined) {
      patch.locationLabel = cleanText(args.locationLabel, 80);
    }

    await ctx.db.patch(profile._id, patch);
    return true;
  },
});

/** كل ما تحتاجه الشاشة الرئيسية لهذا اليوم: الصلوات، الأذكار، المحفوظات. */
export const getDayState = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const safeDate = assertDate(date);
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { prayers: {} as Record<string, string>, adhkar: [] as string[], favorites: [] as string[] };
    }

    const prayerLogs = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", safeDate))
      .collect();

    const adhkarLogs = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", safeDate))
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
    prayer: prayerValidator,
    status: prayerStatusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const date = assertDate(args.date);

    const existing = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date_and_prayer", (q) =>
        q.eq("userId", userId).eq("date", date).eq("prayer", args.prayer),
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
      date,
      prayer: args.prayer,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

/** تعليم مجموعة أذكار (صباح/مساء/نوم/بعد الصلاة/الهمّ) كمنجزة أو غير منجزة. */
export const setAdhkarDone = mutation({
  args: {
    date: v.string(),
    kind: adhkarKindValidator,
    done: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const date = assertDate(args.date);

    const existing = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date_and_kind", (q) =>
        q.eq("userId", userId).eq("date", date).eq("kind", args.kind),
      )
      .unique();

    if (args.done) {
      if (existing) {
        await ctx.db.patch(existing._id, { doneAt: Date.now() });
        return existing._id;
      }
      return await ctx.db.insert("adhkarLogs", {
        userId,
        date,
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

/** سجل أيام محددة من الصلوات والأذكار — للاستمرارية والمتابعة. */
export const getHistory = query({
  args: { dates: v.array(v.string()) },
  handler: async (ctx, { dates }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { prayers: {}, adhkar: {} };

    // نحدّ عدد الأيام المطلوبة لمنع أي استعلام ثقيل.
    const safeDates = dates.slice(0, MAX_HISTORY_DAYS).map((date) => assertDate(date));

    const prayers: Record<string, Record<string, string>> = {};
    const adhkar: Record<string, string[]> = {};

    for (const date of safeDates) {
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

/** إحصاء الثلاثين يومًا الماضية: نسبة الصلوات، الاستمرارية، وأضعف صلاة. */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const empty = {
      days: 0,
      jamaah: 0,
      ontime: 0,
      late: 0,
      missed: 0,
      prayerRate: 0,
      adhkarRate: 0,
      streak: 0,
      best: null as string | null,
      weakest: null as string | null,
      perPrayer: [] as { key: string; done: number; missed: number }[],
    };
    if (userId === null) return empty;

    const dates: string[] = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      dates.push(date.toISOString().slice(0, 10));
    }
    const from = dates[0];

    const prayerLogs = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", from))
      .take(1000);
    const adhkarLogs = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", from))
      .take(1000);

    const perPrayerMap = new Map<string, { done: number; missed: number }>();
    for (const key of PRAYER_KEYS) perPrayerMap.set(key, { done: 0, missed: 0 });

    let jamaah = 0;
    let ontime = 0;
    let late = 0;
    let missed = 0;

    const byDate = new Map<string, Record<string, string>>();
    for (const log of prayerLogs) {
      if (!byDate.has(log.date)) byDate.set(log.date, {});
      byDate.get(log.date)![log.prayer] = log.status;
      const bucket = perPrayerMap.get(log.prayer);
      if (bucket) {
        if (log.status === "missed") bucket.missed += 1;
        else bucket.done += 1;
      }
      if (log.status === "jamaah") jamaah += 1;
      else if (log.status === "ontime") ontime += 1;
      else if (log.status === "late") late += 1;
      else if (log.status === "missed") missed += 1;
    }

    const totalSlots = dates.length * PRAYER_KEYS.length;
    const prayerRate = totalSlots === 0 ? 0 : Math.round(((jamaah + ontime) / totalSlots) * 100);

    const distinctAdhkarDays = new Set(adhkarLogs.map((log) => log.date)).size;
    const adhkarRate = Math.round((distinctAdhkarDays / dates.length) * 100);

    // الاستمرارية: عدد الأيام المتصلة (من اليوم للخلف) التي أُكملت فيها الصلوات الخمس.
    let streak = 0;
    for (let index = dates.length - 1; index >= 0; index -= 1) {
      const day = byDate.get(dates[index]) ?? {};
      const complete = PRAYER_KEYS.every(
        (key) => day[key] === "jamaah" || day[key] === "ontime",
      );
      if (complete) streak += 1;
      else break;
    }

    const perPrayer = [...perPrayerMap.entries()].map(([key, value]) => ({ key, ...value }));
    const ranked = [...perPrayer].sort(
      (a, b) => b.done / (b.done + b.missed || 1) - a.done / (a.done + a.missed || 1),
    );

    return {
      days: dates.length,
      jamaah,
      ontime,
      late,
      missed,
      prayerRate,
      adhkarRate,
      streak,
      best: ranked[0]?.key ?? null,
      weakest: ranked[ranked.length - 1]?.key ?? null,
      perPrayer,
    };
  },
});

/** إضافة/إزالة عنصر من المحفوظات (أحاديث، أبيات، أذكار، آيات). */
export const toggleFavorite = mutation({
  args: {
    itemId: v.string(),
    kind: favoriteKindValidator,
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!ITEM_ID_PATTERN.test(args.itemId)) throw new Error("معرّف العنصر غير صحيح");
    const title = cleanText(args.title, MAX_TEXT);

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_item", (q) => q.eq("userId", userId).eq("itemId", args.itemId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    const all = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_FAVORITES + 1);
    if (all.length >= MAX_FAVORITES) {
      throw new Error("بلغت الحد الأقصى للمحفوظات، احذف بعضها أولًا");
    }

    await ctx.db.insert("favorites", {
      userId,
      itemId: args.itemId,
      kind: args.kind,
      title,
      savedAt: Date.now(),
    });
    return true;
  },
});

