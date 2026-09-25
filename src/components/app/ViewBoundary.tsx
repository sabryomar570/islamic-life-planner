import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "@/components/app/Surfaces";

/**
 * PHASE 2E — حاجز خطأ لكل شاشة.
 *
 * `useQuery` في Convex يرمي الاستثناء عند فشل الشبكة، فلا يصلح `try/catch`:
 * الاستثناء يصعد إلى أقرب error boundary. قبل هذا الحاجز كان أي استعلام
 * فاشل يُسقط التطبيق كله إلى `RootErrorBoundary` — شاشة واحدة تختفي بسبب
 * طلب واحد.
 *
 * الحاجز يبقى هادئًا: رسالة عربية + «إعادة المحاولة» تُعيد تركيب الشاشة من
 * نفس البيانات. إن كان الخطأ من الخادم فلن ينفع التكرار، وهو مقصود: لا
 * نُخفي أن شيئًا لم يعمل.
 */
type Props = {
  /** اسم الشاشة العربية، ليعرف المستخدم ما الذي لم يُحمَّل. */
  label: string;
  children: ReactNode;
};

type State = { failed: boolean; nonce: number };

export class ViewBoundary extends Component<Props, State> {
  state: State = { failed: false, nonce: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // نُبقي أثرًا في الطرفية فقط: لا logging خارجي ولا بيانات مستخدم.
    console.error(`[oud] ${this.props.label}:`, error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    // تبديل الشاشة يلغي حالة الفشل: شاشة أخرى ليست خطأً سابقًا.
    if (previous.label !== this.props.label && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  private retry = () => {
    this.setState((current) => ({ failed: false, nonce: current.nonce + 1 }));
  };

  render() {
    if (this.state.failed) {
      return (
        <ErrorState
          title={`تعذّر عرض ${this.props.label}`}
          body="البيانات لم تصل من الخادم. تحقّق من اتصالك ثم أعد المحاولة — لن نعرض أرقامًا تقديرية مكانها."
          onRetry={this.retry}
        />
      );
    }
    // المفتاح يُعيد تركيب الشجرة بالكامل، فتُعاد قراءة كل الاستعلامات.
    return <div key={this.state.nonce} className="contents">{this.props.children}</div>;
  }
}
