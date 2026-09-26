/**
 * PHASE NEXT — تقدير الزكاة.
 *
 * **هذه الشاشة تحسب، ولا تحكم.** لا نصاب مقرَّر في التطبيق ولا نسبة مقرَّرة
 * ولا حكم على ما يدخل. النصاب والنسبة يكتبهما المستخدم من مرجعه، وحدود
 * الأداة مكتوبة فوق الحقول لا في آخر الصفحة.
 *
 * الحقول نص لا رقم: لو نسّقها المتصفح كرقم لأخفى الكسور والفواصل. نكتب
 * ما نريده، والحساب كله في `zakatTotals` وهي وحدها مغطاة باختبار.
 */
import { Panel, PrimaryButton, QuietButton, SectionHead, Sunken } from "@/components/app/Surfaces";
import {
  EMPTY_ZAKAT_DRAFT,
  ZAKAT_ASK_SCHOLAR,
  ZAKAT_ASSETS,
  ZAKAT_NO_RULING,
  ZAKAT_WHY_USER_INPUT,
  parseAmount,
  readZakatDraft,
  writeZakatDraft,
  zakatTotals,
  type ZakatDraft,
} from "@/lib/zakat";
import { arabicNumber } from "@/lib/time";
import { Check, Info, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** حقل واحد: تسمية مربوطة بالحقل، ووصف مرتبط به. */
function AmountField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[12px] font-semibold text-foreground">
        {label}
      </label>
      <p id={`${id}-hint`} className="label-meta mt-0.5 text-muted-foreground">
        {hint}
      </p>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        dir="ltr"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 24))}
        aria-describedby={`${id}-hint`}
        placeholder="0"
        className="mt-1.5 h-11 w-full rounded-2xl border border-border/60 bg-background/60 px-3 text-end text-[14px] font-semibold text-foreground"
      />
    </div>
  );
}

export function ZakatView() {
  const [draft, setDraft] = useState<ZakatDraft>(() => readZakatDraft());
  const [saved, setSaved] = useState(false);

  const totals = useMemo(() => zakatTotals(draft), [draft]);

  // الكتابة على الجهاز فقط، ولا ترسل إلى أي مكان. المسح يمحو المفتاح
  // لأنه مسجل في `local-data`.
  const update = (next: ZakatDraft) => {
    setDraft(next);
    setSaved(writeZakatDraft(next));
  };

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2400);
    return () => window.clearTimeout(timer);
  }, [saved]);

  const setValue = (key: keyof ZakatDraft["values"], value: string) =>
    update({ ...draft, values: { ...draft.values, [key]: value } });

  const setField = (key: "debt" | "nisab" | "rate" | "paid", value: string) =>
    update({ ...draft, [key]: value });

  const paid = parseAmount(draft.paid);
  const due = Math.round(totals.due * 100) / 100;

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="الزكاة"
          title="تقدير على أرقامك"
          hint="اكتب ما تملكه وما عليك، والحساب علينا والحكم لأهل العلم."
        />

        <p className="mt-3 flex items-start gap-2 rounded-2xl surface-sunken p-3 text-[12px] leading-6 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{ZAKAT_NO_RULING}</span>
        </p>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHead eyebrow="ما تملكه" title="أصول المال" hint="بالأرقام التي تريدها، وبأي عملة." />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ZAKAT_ASSETS.map((entry) => (
            <AmountField
              key={entry.key}
              id={`zakat-${entry.key}`}
              label={entry.label}
              hint={entry.hint}
              value={draft.values[entry.key]}
              onChange={(value) => setValue(entry.key, value)}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AmountField
            id="zakat-debt"
            label="ما عليك من دين حالّ"
            hint="يُطرح من أصولك قبل المقارنة بالنصاب"
            value={draft.debt}
            onChange={(value) => setField("debt", value)}
          />
          <AmountField
            id="zakat-paid"
            label="ما أخرجته فعلا"
            hint="للمقارنة فقط، لا يُخصم من الحساب"
            value={draft.paid}
            onChange={(value) => setField("paid", value)}
          />
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="الحدّان"
          title="النصاب والنسبة من مرجعك"
          hint="حقلان بمفتاحك أنت، لا بثوابت: النصاب يتحرك مع أسعار المعادن والسنة، والنسبة تختلف باختلاف المذهب."
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <AmountField
            id="zakat-nisab"
            label="النصاب عندك"
            hint="النصاب الذي تقرؤه في مرجعك"
            value={draft.nisab}
            onChange={(value) => setField("nisab", value)}
          />
          <AmountField
            id="zakat-rate"
            label="النسبة المئوية"
            hint="مثال: 2.5 تعني النسبة الشائعة اليوم"
            value={draft.rate}
            onChange={(value) => setField("rate", value)}
          />
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-2xl surface-sunken p-3 text-[12px] leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            {ZAKAT_WHY_USER_INPUT} {ZAKAT_ASK_SCHOLAR}
          </span>
        </p>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <SectionHead eyebrow="النتيجة" title="الحساب فقط" hint="أرقامك كما كتبتها، بلا زيادة ولا نقصان." />

        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: "مجموع ما تملكه", value: totals.assets },
            { label: "ما عليك", value: totals.debt },
            { label: "صافي المال", value: totals.net },
            { label: "فوق النصاب", value: totals.aboveNisab },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 rounded-2xl surface-sunken px-3 py-2 text-[12px]"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-bold text-foreground">{arabicNumber(Math.round(row.value))}</dd>
            </div>
          ))}
        </dl>

        <Sunken className="mt-3 px-4 py-3.5">
          {totals.empty ? (
            <p className="text-[13px] leading-7 text-muted-foreground">
              اكتب أرقامك فوق، ونحسب لك. من غير أرقام مفيش حاجة نقدر نقولها.
            </p>
          ) : totals.needsNisab ? (
            <p className="text-[13px] leading-7 text-muted-foreground">
              كتبت أموالك، وباقي نصاب من مرجعك عشان نعرف نقارن بيه. اكتبه في «النصاب عندك».
            </p>
          ) : totals.belowNisab ? (
            <p className="text-[13px] leading-7 text-muted-foreground">
              مالك كله تحت النصاب الذي كتبته، فالحساب عليه صفر. ولو شاك في مرجعك، راجع أهل العلم
              فيه.
            </p>
          ) : (
            <p className="text-[15px] leading-8 font-semibold text-foreground">
              يخرج على النسبة التي كتبتها:{" "}
              <span className="text-primary">{arabicNumber(due)}</span>
            </p>
          )}
        </Sunken>

        {paid > 0 && totals.due > 0 ? (
          <p className="label-meta mt-2 leading-6 text-muted-foreground">
            كتبت إنك أخرجت {arabicNumber(paid)}، والتقدير {arabicNumber(due)}. الفرق في سطرين
            بس: إما راجعت، وإما هنقص.
          </p>
        ) : null}
      </Panel>

      <Sunken className="px-4 py-3">
        <p className="label-meta leading-6 text-muted-foreground">
          كل ما تكتبه يبقى على جهازك وحده: لا حساب ولا تتبّع ولا رفع، ومسح بيانات التطبيق يمحوه.
        </p>
      </Sunken>

      <div className="flex flex-wrap items-center gap-3 px-1">
        <PrimaryButton onClick={() => update(draft)} className="px-5">
          <Check className="size-4" aria-hidden />
          {saved ? "محفوظ على جهازك" : "احفظ التقدير"}
        </PrimaryButton>
        <QuietButton onClick={() => update(EMPTY_ZAKAT_DRAFT)} className="px-4 text-[12px]">
          صفّر الأرقام
        </QuietButton>
      </div>
    </div>
  );
}
