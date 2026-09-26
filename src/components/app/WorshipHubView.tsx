import { Panel, SectionHead } from "@/components/app/Surfaces";
import { LIBRARY_GROUPS, type DashView, type NavGroup } from "@/components/app/Navigation";
import { ChevronLeft } from "lucide-react";

/**
 * «عبادتي» — فهرس أدوات العبادة.
 *
 * **ليست لوحة ثانية:** لا مخطط ولا إحصاء ولا توصيات. سؤالها واحد:
 * «أين أداة الصلاة أو الأذكار أو القبلة؟» فجوابها فهرس واضح.
 *
 * **بلا نصوص جديدة:** النصوص كلها مأخوخة من `LIBRARY_GROUPS`، وهو
 * مصدر واحد للاسم والوصف. فلا يمكن أن يختلف ما يراه المستخدم في الفهرس
 * عمّا يراه في قائمة «كل الأقسام».
 *
 * **«المعرفة» هنا أم لا:** مجموعات القراءة التي لا تُؤدّى (قصص الأنبياء،
 * الأبيات، المناسبات) ليست عبادة يومية، فبقيت في لوحة «كل الأقسام»
 * ولم تُكرَّر هنا. من أراد العبادة فقط وجدها في صفحة واحدة.
 */

type Props = {
  onOpen: (view: DashView) => void;
  onOpenAll: () => void;
};

/** أول مجموعة فقط: ما يؤدّيه كل يوم. */
const WORSHIP_GROUP: NavGroup = LIBRARY_GROUPS[0];

export function WorshipHubView({ onOpen, onOpenAll }: Props) {
  return (
    <div className="stack">
      <Panel className="px-5 py-6 sm:px-6">
        <SectionHead
          eyebrow="عبادتي"
          title={WORSHIP_GROUP.title}
          hint={WORSHIP_GROUP.hint}
          action={
            <button
              type="button"
              onClick={onOpenAll}
              className="touch-target inline-flex items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-primary"
            >
              كل الأقسام
              <ChevronLeft className="size-3.5" />
            </button>
          }
        />
      </Panel>

      {WORSHIP_GROUP.entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onOpen(entry.key)}
          className="motion-press surface-primary focus-ring flex min-h-16 w-full items-center gap-3.5 rounded-3xl px-4 py-3.5 text-start sm:px-5"
        >
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden
          >
            <entry.icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="label-section block text-foreground">{entry.label}</span>
            <span className="label-meta block truncate text-muted-foreground">{entry.hint}</span>
          </span>
          <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      ))}
    </div>
  );
}
