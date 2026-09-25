import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { dateKey } from "../lib/time";

/** الحقول الأساسية المستخرجة من أسئلة البداية — كلٌّ منها يؤثر فعليًا في التطبيق. */
export const answersValidator = v.object({
  wakeTime: v.string(),
  sleepTime: v.string(),
  prayerCommitment: v.string(),
  mostMissedPrayer: v.string(),
  quranAmount: v.string(),
  mainGoal: v.string(),
  startingRitual: v.string(),
  /** حقول «حياتك» — اختيارية ليبقى التوافق مع الملفات القديمة. */
  dayRhythm: v.optional(v.string()),
  dayEnd: v.optional(v.string()),
  disciplineLevel: v.optional(v.string()),
  weeklyFocus: v.optional(v.string()),
});

/* ——— قوائم مغلقة: أي قيمة خارجها تُرفض في طبقة الخادم قبل وصولها لقاعدة البيانات. ——— */
const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const PRAYER_STATUSES = ["jamaah", "ontime", "late", "missed"] as const;
const ADHKAR_KINDS = ["morning", "evening", "sleep", "after_prayer", "distress"] as const;
const FAVORITE_KINDS = ["hadith", "poem", "dhikr", "ayah", "story"] as const;
const DAY_RHYTHMS = ["study", "work", "both", "open"] as const;
const DISCIPLINE_LEVELS = ["gentle", "balanced", "firm"] as const;
const WEEKLY_FOCUS = ["prayer", "adhkar", "consistency"] as const;
const REVIEW_MOODS = ["bad", "ok", "good", "great"] as const;
const REVIEW_BLOCKERS = ["none", "busy", "tired", "forgot", "mood"] as const;

export const prayerValidator = v.union(...PRAYER_KEYS.map((key) => v.literal(key)));
export const prayerStatusValidator = v.union(...PRAYER_STATUSES.map((value) => v.literal(value)));
export const adhkarKindValidator = v.union(...ADHKAR_KINDS.map((value) => v.literal(value)));
export const favoriteKindValidator = v.union(...FAVORITE_KINDS.map((value) => v.literal(value)));
export const reviewMoodValidator = v.union(...REVIEW_MOODS.map((value) => v.literal(value)));
export const reviewBlockerValidator = v.union(...REVIEW_BLOCKERS.map((value) => v.literal(value)));

/** يختار قيمة من قائمة مغلقة أو يعيد الافتراضي — أي قيمة غريبة تُرفض بصمت إلى الافتراضي. */
function pickFromList<T extends string>(
  value: string | undefined,
  list: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

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
  args: {
    answers: answersValidator,
    /** المدينة المستنتجة من المنطقة الزمنية — لا يكتبها المستخدم يدويًا. */
    location: v.optional(
      v.object({ city: v.string(), label: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, { answers, location }) => {
    const userId = await requireUserId(ctx);

    const safe = {
      wakeTime: assertTime(answers.wakeTime, "وقت الاستيقاظ"),
      sleepTime: assertTime(answers.sleepTime, "وقت النوم"),
      prayerCommitment: cleanText(answers.prayerCommitment, 40),
      mostMissedPrayer: cleanText(answers.mostMissedPrayer, 40),
      quranAmount: cleanText(answers.quranAmount, 40),
      mainGoal: cleanText(answers.mainGoal, 40),
      startingRitual: cleanText(answers.startingRitual, 40),
      // حقول «حياتك»: قيم افتراضية آمنة لمن لم يجب عليها بعد.
      dayRhythm: pickFromList(answers.dayRhythm, DAY_RHYTHMS, "open"),
      dayEnd: answers.dayEnd ? assertTime(answers.dayEnd, "نهاية يومك") : "17:00",
      disciplineLevel: pickFromList(answers.disciplineLevel, DISCIPLINE_LEVELS, "balanced"),
      weeklyFocus: pickFromList(answers.weeklyFocus, WEEKLY_FOCUS, "prayer"),
    };

    const locationPatch: { city?: string; locationLabel?: string } = {};
    if (location && location.city.trim().length > 0) {
      locationPatch.city = cleanText(location.city, 80);
      if (location.label && location.label.trim().length > 0) {
        locationPatch.locationLabel = cleanText(location.label, 80);
      }
    }

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const payload = { ...safe, ...locationPatch, userId, updatedAt: Date.now() };
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
    /** مدينة نصية بديلة تُستخدم حين لا تتوفر إحداثيات. */
    city: v.optional(v.string()),
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
      city?: string;
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

    if (args.city !== undefined) {
      patch.city = cleanText(args.city, 80);
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
      return {
        prayers: {} as Record<string, string>,
        adhkar: [] as string[],
        favorites: [] as string[],
        review: null as null | { mood: string; blocker: string; note: string },
      };
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

    const reviewDoc = await ctx.db
      .query("dayReviews")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", safeDate))
      .unique();

    const prayers: Record<string, string> = {};
    for (const log of prayerLogs) prayers[log.prayer] = log.status;

    return {
      prayers,
      adhkar: adhkarLogs.map((log) => log.kind),
      favorites: favorites.map((item) => item.itemId),
      review: reviewDoc
        ? { mood: reviewDoc.mood, blocker: reviewDoc.blocker, note: reviewDoc.note }
        : null,
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

    // استعلام نطاق واحد لكل جدول بدل 2×N استعلام يومي (نفس نمط getStats).
    const sorted = [...safeDates].sort();
    const from = sorted[0];
    const to = sorted[sorted.length - 1];

    const rangeLogs = await ctx.db
      .query("prayerLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", from).lte("date", to))
      .take(MAX_HISTORY_DAYS * 10);
    const rangeAdhkar = await ctx.db
      .query("adhkarLogs")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", from).lte("date", to))
      .take(MAX_HISTORY_DAYS * 10);

    const wanted = new Set(safeDates);
    const prayers: Record<string, Record<string, string>> = {};
    const adhkar: Record<string, string[]> = {};
    for (const date of safeDates) {
      prayers[date] = {};
      adhkar[date] = [];
    }

    for (const log of rangeLogs) {
      if (!wanted.has(log.date)) continue;
      (prayers[log.date] ??= {})[log.prayer] = log.status;
    }
    for (const log of rangeAdhkar) {
      if (!wanted.has(log.date)) continue;
      adhkar[log.date]?.push(log.kind);
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
      daily: [] as { date: string; done: number; logged: number; adhkar: number; reviewed: boolean }[],
      reviewDays: 0,
      bestWeekStart: null as string | null,
      longestRun: 0,
    };
    if (userId === null) return empty;

    // نبني التواريخ بالتوقيت المحلي للمستخدم (dateKey) ليتسق التعريف مع بقية التطبيق.
    const dates: string[] = [];
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      dates.push(dateKey(date));
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
    // المراجعات اليومية — تُدمج في السجل ليصبح مؤشر «الاستمرار» صادقًا.
    const reviewLogs = await ctx.db
      .query("dayReviews")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", from))
      .take(120);
    const reviewedDates = new Set(reviewLogs.map((log) => log.date));

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

    // سجل يومي مُفصّل (٣٠ يومًا) لبناء جدول الإحصاءات في الواجهة.
    const daily = dates.map((date) => {
      const day = byDate.get(date) ?? {};
      const done = PRAYER_KEYS.filter(
        (key) => day[key] === "jamaah" || day[key] === "ontime",
      ).length;
      const logged = PRAYER_KEYS.filter((key) => day[key]).length;
      const dayAdhkar = adhkarLogs.filter((log) => log.date === date).length;
      return { date, done, logged, adhkar: dayAdhkar, reviewed: reviewedDates.has(date) };
    });

    // أفضل أسبوع: الأسبوع السباعي الأعلى إنجازًا خلال الثلاثين يومًا.
    let bestWeekRate = -1;
    let bestWeekStart: string | null = null;
    for (let index = 0; index + 7 <= daily.length; index += 1) {
      const window = daily.slice(index, index + 7);
      const doneSum = window.reduce((sum, day) => sum + day.done, 0);
      const rate = doneSum / (7 * PRAYER_KEYS.length);
      if (rate > bestWeekRate) {
        bestWeekRate = rate;
        bestWeekStart = window[0].date;
      }
    }

    // أطول سلسلة إنجاز كامل خلال الفترة (لا يهم أن تبدأ من اليوم).
    let longestRun = 0;
    let run = 0;
    for (const day of daily) {
      if (day.done === PRAYER_KEYS.length) {
        run += 1;
        longestRun = Math.max(longestRun, run);
      } else {
        run = 0;
      }
    }

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
      daily,
      reviewDays: reviewedDates.size,
      bestWeekStart,
      longestRun,
    };
  },
});

/** حفظ مراجعة اليوم (٣ لمسات) — تُحدَّث إن وُجدت لليوم نفسه. */
export const saveDayReview = mutation({
  args: {
    date: v.string(),
    mood: reviewMoodValidator,
    blocker: reviewBlockerValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const date = assertDate(args.date);
    const note =
      args.note && args.note.trim().length > 0 ? cleanText(args.note, 160) : "";

    const existing = await ctx.db
      .query("dayReviews")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        mood: args.mood,
        blocker: args.blocker,
        note,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("dayReviews", {
      userId,
      date,
      mood: args.mood,
      blocker: args.blocker,
      note,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/** حذف كل بيانات المستخدم من الخادم (يبقى الحساب) — وعد الخصوصية فعليًا لا شعارًا. */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    let removed = 0;

    // حذف على دفعات محدودة لكل جدول (لا حلقات مفتوحة).
    for (let pass = 0; pass < 10; pass += 1) {
      const rows = await ctx.db
        .query("prayerLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
        .take(200);
      if (rows.length === 0) break;
      for (const row of rows) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
      if (rows.length < 200) break;
    }

    for (let pass = 0; pass < 10; pass += 1) {
      const rows = await ctx.db
        .query("adhkarLogs")
        .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
        .take(200);
      if (rows.length === 0) break;
      for (const row of rows) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
      if (rows.length < 200) break;
    }

    for (let pass = 0; pass < 10; pass += 1) {
      const rows = await ctx.db
        .query("dayReviews")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(200);
      if (rows.length === 0) break;
      for (const row of rows) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
      if (rows.length < 200) break;
    }

    for (let pass = 0; pass < 10; pass += 1) {
      const rows = await ctx.db
        .query("favorites")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(200);
      if (rows.length === 0) break;
      for (const row of rows) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
      if (rows.length < 200) break;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) {
      await ctx.db.delete(profile._id);
      removed += 1;
    }

    return removed;
  },
});

/** كل المحفوظات مرتبة من الأحدث — لقسم «محفوظاتي» وحالة الحفظ الفورية. */
export const getFavorites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const items = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_FAVORITES);
    return items.sort((a, b) => b.savedAt - a.savedAt);
  },
});

/** حذف صريح من المحفوظات: لا يُدرج شيئًا أبدًا — أمان عند الحذف من «محفوظاتي». */
export const removeFavorite = mutation({
  args: {
    itemId: v.string(),
  },
  handler: async (ctx, { itemId }) => {
    const userId = await requireUserId(ctx);
    if (!ITEM_ID_PATTERN.test(itemId)) throw new Error("معرّف العنصر غير صحيح");

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_item", (q) => q.eq("userId", userId).eq("itemId", itemId))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
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

