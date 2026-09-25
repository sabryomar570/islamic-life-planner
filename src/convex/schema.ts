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
      // نافذة الدراسة/العمل وراحة قصيرة — اختيارية لأن اليوم قد يكون مرنًا.
      workStart: v.optional(v.string()),
      workEnd: v.optional(v.string()),
      restTime: v.optional(v.string()),
      // التزام.المستخدم يحميه هذا الأسبوع؛ نص قصير اختياري لا قاعدة ثابتة.
      commitment: v.optional(v.string()),
      // المدينة المستنتجة من المنطقة الزمنية أو المُعدّل عليها من الإعدادات.
      city: v.optional(v.string()),
      // إحداثيات اختيارية عند السماح بالموقع — لحساب مواقيت أدق من اسم المدينة.
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      locationLabel: v.optional(v.string()),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // نتيجة يومية idempotent لكل عنصر؛ mutations تعتمد user/date/item composite indexes.
    planItemLogs: defineTable({
      userId: v.id("users"),
      date: v.string(),
      weekStart: v.string(),
      itemId: v.string(),
      // completed | partial | postponed | skipped
      status: v.string(),
      postponedTo: v.optional(v.string()),
      reason: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_date", ["userId", "date"])
      .index("by_user_and_date_and_item", ["userId", "date", "itemId"]),

    // خطة أسبوعية مولّدة من Life Model؛ قابلة للتعديل مع version لمنع الكتابة المتعارضة.
    weeklyPlans: defineTable({
      userId: v.id("users"),
      weekStart: v.string(),
      timezone: v.string(),
      weeklyFocus: v.string(),
      items: v.array(
        v.object({
          id: v.string(),
          date: v.string(),
          day: v.number(),
          kind: v.string(),
          title: v.string(),
          importance: v.string(),
          recurrence: v.string(),
          origin: v.string(),
          enabled: v.boolean(),
          startTime: v.optional(v.string()),
          endTime: v.optional(v.string()),
          durationMinutes: v.optional(v.number()),
          prayerAnchor: v.optional(v.string()),
        }),
      ),
      version: v.number(),
      sourceProfileUpdatedAt: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_week", ["userId", "weekStart"]),

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
      // Learning fields are optional for backward compatibility with existing reviews.
      plannedCount: v.optional(v.number()),
      completedCount: v.optional(v.number()),
      partialCount: v.optional(v.number()),
      postponedCount: v.optional(v.number()),
      skippedCount: v.optional(v.number()),
      succeeded: v.optional(v.string()),
      failed: v.optional(v.string()),
      why: v.optional(v.string()),
      tomorrowAdjustment: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_date", ["userId", "date"]),
    // مراجعة أسبوعية مشتقة من السجلات؛ التعديلات المقترحة لا تُطبّق تلقائيًا.
    // موافقات المستخدم على تعديلات الخطة؛ سجل تدقيق لا خطة تلقائية.
    adaptiveApprovals: defineTable({
      userId: v.id("users"),
      weekStart: v.string(),
      suggestionId: v.string(),
      kind: v.string(),
      payload: v.string(),
      appliedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_week", ["userId", "weekStart"]),

    weeklyReviews: defineTable({
      userId: v.id("users"),
      weekStart: v.string(),
      summary: v.object({
        weekStart: v.string(),
        planned: v.number(),
        completed: v.number(),
        partial: v.number(),
        postponed: v.number(),
        skipped: v.number(),
        adherence: v.number(),
        reviewedDays: v.number(),
        mostConsistentHabit: v.union(
          v.null(),
          v.object({ kind: v.string(), count: v.number() }),
        ),
        mostPostponed: v.union(
          v.null(),
          v.object({ kind: v.string(), count: v.number() }),
        ),
        successfulPeriods: v.array(v.string()),
        difficultPeriods: v.array(v.string()),
        prayerContext: v.object({
          loggedDays: v.number(),
          onTime: v.number(),
          late: v.number(),
          missed: v.number(),
          note: v.string(),
        }),
        weeklyFocus: v.string(),
        suggestedAdjustments: v.array(
          v.object({
            id: v.string(),
            kind: v.string(),
            target: v.string(),
            reason: v.string(),
            requiresApproval: v.boolean(),
          }),
        ),
      }),
      note: v.string(),
      version: v.number(),
      approvedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_week", ["userId", "weekStart"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
