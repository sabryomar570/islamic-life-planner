/**
 * PHASE 3 — موضع الإحصاء.
 *
 * **لماذا هذا الملف وحده؟** لأن `insights.ts` يستورد قاعدة الأحاديث
 * كاملة. لو استوردته الأقسام المحمَّلة مباشرة، لانتقلت ١٣٣ حديثا إلى المسار
 * الحرج وارتفع `Dashboard` نحو ٢٤ kB. قياسُ هذا الرقم هو ما كشف المشكلة.
 *
 * فالفصل هنا ليس ذوقا: هو ما يبقي قاعدة المحتوى خارج الحزمة الأولى،
 * ويجعلها تُحمَّل عند أول ظهور للإحصاء فقط.
 */

import { InsightCarousel } from "@/components/app/InsightCarousel";
import { insightsForArea, type InsightArea } from "@/lib/insights";
import type { DashView } from "@/components/app/Navigation";

export function InsightSlot({
  area,
  onNavigate,
  count = 2,
}: {
  area: InsightArea;
  onNavigate?: (view: DashView) => void;
  count?: number;
}) {
  // بذرة اليوم تُحسب مرة واحدة: لا تقفز الشريحة مع كل رسم.
  const insights = insightsForArea(area, new Date(), count);
  if (insights.length === 0) return null;
  return (
    <InsightCarousel
      insights={insights}
      onNavigate={onNavigate ? (view: string) => onNavigate(view as DashView) : undefined}
    />
  );
}
