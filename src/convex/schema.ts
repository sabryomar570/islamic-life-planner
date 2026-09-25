import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // إجابات أسئلة البداية (٧ أسئلة أساسية + ٤ أسئلة «حياتك») — كل إجابة تُغيّر سلوكًا فعليًا.
    profiles: defineTable({
      userId: v.id("users"),
      wakeTime: v.string(),
      sleepTime: v.string(),
      prayerCommitment: v.string(),
      mostMissedPrayer: v.string(),
      quranAmount: v.string(),
      mainGoal: v.string(),
      startingRitual: v.string(),
      // ——— أسئلة «حياتك» (اختيارية: ملفات قديمة تعمل بلا كسر) ———
      // شكل اليوم: study | work | both | open
      dayRhythm: v.optional(v.string()),
      // نهاية الالتزام اليومي (HH:MM) — يفتح مراجعة اليوم بعدها.
      dayEnd: v.optional(v.string()),
      // أول مسؤولية مهمة في اليوم (HH:MM) — يختصر خط سير اليوم.
      focusTime: v.optional(v.string()),
      // حركة يومية قابلة للاستمرار: walk | sport | active | rest
      movement: v.optional(v.string()),
      // أكثر مشتت يومي: phone | social | fatigue | noise
      distraction: v.optional(v.string()),
      // ختام هادئ قبل النوم: quran | adhkar | reflection | calm
      eveningReset: v.optional(v.string()),
      // مستوى المتابعة المطلوب: gentle | balanced | firm
      disciplineLevel: v.optional(v.string()),
      // تركيز الأسبوع: prayer | adhkar | consistency
      weeklyFocus: v.optional(v.string()),
      // المدينة المستنتجة من المنطقة الزمنية أو المُعدّل عليها من الإعدادات.
      city: v.optional(v.string()),
      // إحداثيات اختيارية عند السماح بالموقع — لحساب مواقيت أدق من اسم المدينة.
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      locationLabel: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // سجل الصلوات اليومية (في جماعة/في الوقت/متأخرة/فائتة).
    prayerLogs: defineTable({
      userId: v.id("users"),
      date: v.string(),
      prayer: v.string(),
      status: v.string(),
      updatedAt: v.number(),
    })
      .index("by_user_and_date", ["userId", "date"])
      .index("by_user_and_date_and_prayer", ["userId", "date", "prayer"]),

    // إنجاز الأذكار: صباح / مساء / نوم.
    adhkarLogs: defineTable({
      userId: v.id("users"),
      date: v.string(),
      kind: v.string(),
      doneAt: v.number(),
    })
      .index("by_user_and_date", ["userId", "date"])
      .index("by_user_and_date_and_kind", ["userId", "date", "kind"]),

    // المحفوظات: أحاديث وأبيات وأذكار يريد الرجوع إليها.
    favorites: defineTable({
      userId: v.id("users"),
      itemId: v.string(),
      kind: v.string(),
      title: v.string(),
      savedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_item", ["userId", "itemId"]),

    // المراجعة اليومية: كيف كان يومك + أكبر عائق + ملاحظة — أساس المحاسبة والتكيّف.
    dayReviews: defineTable({
      userId: v.id("users"),
      date: v.string(),
      // bad | ok | good | great
      mood: v.string(),
      // none | busy | tired | forgot | mood
      blocker: v.string(),
      // ملاحظة حرة قصيرة (قد تكون فارغة).
      note: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_date", ["userId", "date"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
