/**
 * PHASE 3 — موضع الإحصاء.
 *
 * **لماذا هذا الملف وحده؟** لأن `insights.ts` يستورد قاعدة الأحاديث
 * كاملة. لو استوردته الأقسام المحمّلة مباشرة، لانتقلت ١٣٣ نصا إلى المسار
 * الحرج وارتفع `Dashboard` نحو ٢٤ kB. قياس هذا الرقم هو ما كشف المشكلة.
 *
 * فالفصل هنا ليس ذوقا: هو ما يبقي قاعدة المحتوى خارج الحزمة الأولى،
 * ويجعلها تُحمَّل عند أول ظهور للإحصاء فقط.
 *
 * **وأخطر ما في هذا الموضع أنه زخرفة.** فلا يجوز أن يُسقط فشل تحميله
 * الشاشة. لذلك هنا حاجز خاص يعيد لا شيء، لا شاشة خطأ كاملة: بقية
 * الشاشة تبقى كما هي، وهذا مقصود لا إهمال.
 */

import { InsightCarousel } from "@/components/app/InsightCarousel";
import type { DashView } from "@/components/app/Navigation";
import { insightsForArea, type InsightArea } from "@/lib/insights";
import { Component, type ReactNode } from "react";

/** حاجز صامت: أخطر ما في موضع زخرفي أنه يعطّل ما هو أساسي. */
class InsightBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey: string }) {
    // فتح الشاشة من جديد يعيد المحاولة بدل بقاء الفراغ.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function InsightBody({
  area,
  onNavigate,
  count,
}: {
  area: InsightArea;
  onNavigate?: (view: DashView) => void;
  count: number;
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

export function InsightSlot({
  area,
  onNavigate,
  count = 2,
}: {
  area: InsightArea;
  onNavigate?: (view: DashView) => void;
  count?: number;
}) {
  // المفتاح يتغير مع الشاشة، فيعيد المحاولة عند فتح قسم آخر.
  const resetKey = `${area}:${count}`;
  return (
    <InsightBoundary resetKey={resetKey}>
      <InsightBody area={area} onNavigate={onNavigate} count={count} />
    </InsightBoundary>
  );
}
