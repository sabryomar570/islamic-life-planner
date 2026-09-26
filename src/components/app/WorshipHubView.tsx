import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import {
  QUICK_SERVICES,
  SERVICE_SECTIONS,
  serviceEntry,
  type DashView,
  type ServiceSection,
  type ServiceTier,
} from "@/components/app/Navigation";
import {
  EmptyState,
  Field,
  ListRow,
  ScreenTitle,
  SectionHeader,
  ServiceCard,
  Surface,
  TextLink,
} from "@/components/oud/primitives";

/**
 * «عبادتي» — the service hub.
 *
 * **The page answers one question: which tool do I need?** Not a dashboard,
 * not a plan, not a report. So there is no score, no progress and no
 * recommendation here — those belong to «يومي», and having them here too is
 * how a hub stops being a hub.
 *
 * **Three prominence tiers, never one grid.** The services you perform every
 * day are cards. The tools you reach for weekly are cards. What you read is
 * a row. A flat grid of fifteen equal cards would look organised and read as
 * noise.
 *
 * **Every service appears exactly once.** «ابدأ من هنا» shows four, and the
 * search filters the same list, so nothing is duplicated in two blocks.
 *
 * **No new copy.** Names and hints come from `serviceEntry`, the same source
 * the all-sections sheet reads. The section titles are the names the product
 * already agreed on.
 */

type Props = {
  onOpen: (view: DashView) => void;
  onOpenAdhkar: (group: "morning" | "evening" | "sleep") => void;
  onOpenAll: () => void;
};

/**
 * درجات الحضور: البطاقة الكبيرة للأساس، والمتوسطة للأدوات الأسبوعية.
 * الفرق مقصود لكنه صغير — الفارق الكبير يصنع فوضى، لا تدرجا.
 */
const TIER_CLASS: Record<ServiceTier, string> = {
  primary: "py-6",
  secondary: "py-4",
  compact: "",
};

/** تطبيع عربي بسيط حتى يجد البحث «الاذكار» و«الأذكار» معا. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ٰٟ]/g, "")
    .trim();
}

function openService(key: DashView, onOpen: Props["onOpen"], onOpenAdhkar: Props["onOpenAdhkar"]) {
  if (key === "adhkar") onOpenAdhkar("morning");
  else onOpen(key);
}

export function WorshipHubView({ onOpen, onOpenAdhkar, onOpenAll }: Props) {
  const [query, setQuery] = useState("");

  const needle = normalize(query);

  const matches = useMemo(
    () =>
      SERVICE_SECTIONS.map((section) => ({
        section,
        services: section.services.filter(({ key }) => {
          if (!needle) return true;
          const entry = serviceEntry(key);
          if (!entry) return false;
          return (
            normalize(entry.label).includes(needle) || normalize(entry.hint).includes(needle)
          );
        }),
      })).filter((group) => group.services.length > 0),
    [needle],
  );

  const quick = QUICK_SERVICES.map((key) => serviceEntry(key)).filter(
    (entry): entry is NonNullable<typeof entry> => Boolean(entry),
  );

  const searching = needle.length > 0;
  const total = SERVICE_SECTIONS.reduce((count, section) => count + section.services.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="عبادتي" subtitle={`${total} خدمة، مجمّعة بحسب صلتها بيومك`} />

      {/* 1 — the four you reach for, before anything else. */}
      {!searching ? (
        <section aria-label="ابدأ من هنا" className="flex flex-col gap-3">
          <SectionHeader title="ابدأ من هنا" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quick.map((entry) => (
              <li key={entry.key}>
                <ServiceCard
                  icon={entry.icon}
                  title={entry.label}
                  description={entry.hint}
                  onClick={() => openService(entry.key, onOpen, onOpenAdhkar)}
                  className="h-full w-full"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Field
        label="ابحث في خدماتك"
        icon={Search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="الصلاة، القرآن، الأذكار…"
      />

      {/* 2 — everything else, grouped and tiered. */}
      {matches.length === 0 ? (
        <EmptyState
          icon={Search}
          title="لا توجد خدمة بهذا الاسم"
          body="جرّب كلمة أقصر، أو افتح كل الأقسام من أعلى الشاشة."
          action={<TextLink onClick={onOpenAll}>كل الأقسام</TextLink>}
        />
      ) : (
        <>
          {!searching ? (
            <SectionHeader
              title="كل عبادتك"
              action={<TextLink onClick={onOpenAll}>كل الأقسام</TextLink>}
            />
          ) : null}

          <div className="flex flex-col gap-5">
            {matches.map(({ section, services }) => (
              <ServiceGroup
                key={section.id}
                section={section}
                services={services}
                onOpen={onOpen}
                onOpenAdhkar={onOpenAdhkar}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ServiceGroup({
  section,
  services,
  onOpen,
  onOpenAdhkar,
}: {
  section: ServiceSection;
  services: { key: DashView; tier: ServiceTier }[];
  onOpen: Props["onOpen"];
  onOpenAdhkar: Props["onOpenAdhkar"];
}) {
  const cards = services.filter((service) => service.tier !== "compact");
  const rows = services.filter((service) => service.tier === "compact");

  return (
    <section aria-label={section.title} className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold text-foreground">{section.title}</h3>

      {cards.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cards.map((service) => {
            const entry = serviceEntry(service.key);
            if (!entry) return null;
            return (
              <li key={service.key}>
                <ServiceCard
                  icon={entry.icon}
                  title={entry.label}
                  description={entry.hint}
                  onClick={() => openService(service.key, onOpen, onOpenAdhkar)}
                  className={cn("h-full w-full", TIER_CLASS[service.tier])}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      {rows.length > 0 ? (
        <Surface className="overflow-hidden">
          <ul>
            {rows.map((service) => {
              const entry = serviceEntry(service.key);
              if (!entry) return null;
              return (
                <li key={service.key} className="border-b border-[var(--oud-line-soft)] last:border-b-0">
                  <ListRow
                    icon={entry.icon}
                    title={entry.label}
                    meta={entry.hint}
                    flat
                    onClick={() => openService(service.key, onOpen, onOpenAdhkar)}
                  />
                </li>
              );
            })}
          </ul>
        </Surface>
      ) : null}
    </section>
  );
}
