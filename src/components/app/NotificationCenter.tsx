/**
 * PHASE 3 — مركز الإشعارات.
 *
 * لوح صغير يفتح على هيئة نافذة. **ليس صندوق وارد ولا شبكة اجتماعية:**
 * لا تفاعل ولا تعليق ولا عدّاد متضخم. ما حدث اليوم، وما قبله، ومن أين.
 */

import { Artwork } from "@/components/app/Artworks";
import { EmptyState, QuietButton, Tag } from "@/components/app/Surfaces";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StoredNotification } from "@/lib/notification-center";
import { unreadCount } from "@/lib/notification-center";
import { formatArabicTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BellRing, CheckCheck } from "lucide-react";

const CATEGORY_LABELS: Record<StoredNotification["category"], string> = {
  prayer: "الصلاة",
  task: "المهمة",
  commitment: "الالتزام",
  review: "المراجعة",
  dhikr: "الذكر",
  recovery: "العودة",
  occasion: "المناسبة",
  hadith: "الحديث",
};

/** نقطة الحالة: غير المقروء يلمع، والمقروء يهدأ. */
function UnreadDot({ read }: { read: boolean }) {
  if (read) return null;
  return (
    <span
      className="mt-1.5 block size-2 shrink-0 rounded-full bg-primary"
      aria-label="غير مقروء"
    />
  );
}

function Row({
  item,
  onRead,
  onNavigate,
}: {
  item: StoredNotification;
  onRead: (id: string) => void;
  onNavigate: (item: StoredNotification) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-2xl px-3 py-3",
        item.read ? "opacity-70" : "surface-secondary",
      )}
    >
      <UnreadDot read={item.read} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="label-section text-foreground">{item.title}</p>
          <Tag>{CATEGORY_LABELS[item.category]}</Tag>
          <span className="label-meta text-muted-foreground">
            {formatArabicTime(new Date(item.at).toTimeString().slice(0, 5))}
          </span>
        </div>
        <p className="label-body mt-1 text-muted-foreground">{item.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.view ? (
            <QuietButton onClick={() => onNavigate(item)}>{item.action}</QuietButton>
          ) : null}
          {!item.read ? (
            <QuietButton onClick={() => onRead(item.id)}>علّمه كمقروء</QuietButton>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function NotificationCenter({
  open,
  onOpenChange,
  items,
  today,
  earlier,
  onRead,
  onReadAll,
  onClear,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly StoredNotification[];
  today: readonly StoredNotification[];
  earlier: readonly StoredNotification[];
  onRead: (id: string) => void;
  onReadAll: () => void;
  onClear: () => void;
  onNavigate: (item: StoredNotification) => void;
}) {
  const unread = unreadCount(items);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="surface-veil max-w-lg gap-0 p-0">
        <DialogHeader className="flex-row items-start justify-between gap-3 px-5 pt-5 text-start">
          <div>
            <DialogTitle className="label-display text-foreground">الإشعارات</DialogTitle>
            <DialogDescription className="label-meta mt-1 text-muted-foreground">
              {unread > 0
                ? `${unread} إشعارا لم يُقرأ`
                : items.length > 0
                  ? "لا جديد منذ آخر مرة"
                  : "لا إشعارات بعد"}
            </DialogDescription>
          </div>
          <Artwork name="progress" tone="soft" />
        </DialogHeader>

        <div className="mushaf-scroll max-h-[60vh] overflow-y-auto px-2 py-3">
          {items.length === 0 ? (
            <EmptyState
              title="لا إشعارات بعد"
              body="يظهر هنا ما يهمك فعلا: وقت الصلاة، خطوة باقية في يومك، ومراجعة المساء."
              icon={<BellRing className="size-5" />}
            />
          ) : (
            <div className="stack-sm">
              {today.length > 0 ? (
                <section>
                  <h3 className="eyebrow px-3 py-1">اليوم</h3>
                  <ul className="stack-sm">
                    {today.map((item) => (
                      <Row key={item.id} item={item} onRead={onRead} onNavigate={onNavigate} />
                    ))}
                  </ul>
                </section>
              ) : null}

              {earlier.length > 0 ? (
                <section>
                  <h3 className="eyebrow px-3 py-1">قبل ذلك</h3>
                  <ul className="stack-sm">
                    {earlier.map((item) => (
                      <Row key={item.id} item={item} onRead={onRead} onNavigate={onNavigate} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="rule-t mx-5 flex items-center justify-between gap-2 py-4">
            <QuietButton onClick={onReadAll}>
              <CheckCheck className="size-3.5" />
              علّم الكل كمقروء
            </QuietButton>
            <QuietButton onClick={onClear}>امسح السجل</QuietButton>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** زر الترويسة. الشارة تحمل رقما مكتوبا لا لونا وحده. */
export function NotificationBell({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `الإشعارات، ${count} غير مقروء` : "الإشعارات"}
      className="motion-press touch-target relative flex items-center justify-center rounded-full surface-secondary text-foreground/75"
    >
      <BellRing className="size-4" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {count > 9 ? "+" : count}
        </span>
      ) : null}
    </button>
  );
}
