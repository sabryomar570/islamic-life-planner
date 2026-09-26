/**
 * PHASE NEXT — كلّم عود.
 *
 * **هذا امتداد الشخصية، لا Chatbot.** يردّ من `oud-chat` بنفس لهجة `oud-voice`،
 * ومن حالة جهازك الحقيقية. لا يخرج من جهازك ما ليس عليه، ولا يجيب في الدين
 * من نفسه، فيحوّل السؤال الشرعي إلى نصّ موثّق داخل التطبيق.
 *
 * **لماذا لا نموذجا لغويا هنا:** الردّ الصحيح يحتاج أرقامك لا كلاما حسنا.
 * ولو أردنا إضافة نموذج حقيقي، تكون **طبقة فوق** هذا المحرك، وتحتاج مفتاحا
 * وConvex action — وهي خطوة تالية موثّقة في التقرير، لا ادّعاء هنا.
 */
import { Panel, PrimaryButton, SectionHead } from "@/components/app/Surfaces";
import { openingLine, respond, type ChatContext, type ChatReply } from "@/lib/oud-chat";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  id: string;
  from: "user" | "oud";
  text: string;
  /** الخطوة المقترحة، إن وُجدت. */
  action?: ChatReply["action"];
  /** ما بُني عليه الردّ — يظهر عند طلبه، حتى لا يكون صندوق أسود. */
  basedOn?: string;
};

/** أسئلة جاهزة: تقترحان أكثر من الكتابة، ولا تفعلان عملا. */
const STARTERS = [
  "صليت ولا",
  "مش عارف أعمل إيه",
  "أتأخّرت في المذاكرة",
  "فين أقرب مسجد",
];

export function OudChatView({
  context,
  onOpenSection,
}: {
  context: ChatContext;
  onOpenSection: (view: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: "open", from: "oud", text: openingLine(context), basedOn: "لقطة يومك الآن" },
  ]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const reply = respond(text, context);
    setMessages((current) => [
      ...current,
      { id: `u-${current.length}`, from: "user", text },
      {
        id: `o-${current.length}`,
        from: "oud",
        text: reply.text,
        action: reply.action,
        basedOn: reply.basedOn,
      },
    ]);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="عود"
          title="قولّي بس"
          hint="أقدر أفهم شكوى، وتبريرا، وسؤالا عن يومك. وما بجاوب في الدين من نفسي — أي نص ديني تلاقاه في الأحاديث ومعاه مصدره."
        />
      </Panel>

      <Panel className="flex min-h-[52vh] flex-col p-4 sm:p-5">
        <div
          ref={listRef}
          className="mushaf-scroll flex-1 space-y-3 overflow-y-auto pe-1"
          role="log"
          aria-live="polite"
          aria-label="محادثة عود"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex flex-col gap-1",
                message.from === "user" ? "items-end" : "items-start",
              )}
            >
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-7",
                  message.from === "user"
                    ? "bg-primary text-primary-foreground"
                    : "surface-secondary text-foreground",
                )}
              >
                {message.text}
              </p>
              {message.action ? (
                <button
                  type="button"
                  onClick={() => onOpenSection(message.action!.view)}
                  className="touch-target rounded-full px-2.5 text-[12px] font-semibold text-primary"
                >
                  {message.action.label}
                </button>
              ) : null}
              {message.basedOn ? (
                <p className="px-1 text-[11px] text-muted-foreground">حسب: {message.basedOn}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="motion-press touch-target rounded-full surface-sunken px-3 text-[12px] font-semibold text-foreground/80"
            >
              {starter}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="oud-chat-input" className="sr-only">
            اكتب لعود
          </label>
          <input
            id="oud-chat-input"
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="اكتب عايز تقول…"
            autoComplete="off"
            className="touch-target min-h-11 flex-1 rounded-2xl surface-sunken px-3.5 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
          />
          <PrimaryButton type="submit" disabled={!draft.trim()} className="px-4">
            <Send className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">قول</span>
          </PrimaryButton>
        </form>
      </Panel>
    </div>
  );
}
