import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { LIBRARY_GROUPS, type DashView, type NavGroup } from "@/components/app/Navigation";
import {
  EmptyState,
  Field,
  ScreenTitle,
  SectionHeader,
  ServiceCard,
  TextLink,
} from "@/components/oud/primitives";

/**
 * «عبادتي» — an index of worship services, not a dashboard.
 *
 * **A grid, not a list.** These are things you might open, not steps you
 * follow, so each service is a square you reach for rather than a row
 * with a chevron. The chevron language is kept for lists that do have an
 * order.
 *
 * **One search field, not a title per card.** A hub with a heading above
 * every tile is a list pretending to be a grid.
 *
 * **No new copy.** Names and descriptions come from `LIBRARY_GROUPS`, the
 * same source the all-sections sheet reads, so the two can never disagree.
 */

type Props = {
  onOpen: (view: DashView) => void;
  onOpenAll: () => void;
};

const WORSHIP_GROUP: NavGroup = LIBRARY_GROUPS[0];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ً-ٰٟ]/g, "")
    .trim();
}

export function WorshipHubView({ onOpen, onOpenAll }: Props) {
  const [query, setQuery] = useState("");

  const services = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return WORSHIP_GROUP.entries;
    return WORSHIP_GROUP.entries.filter(
      (entry) =>
        normalize(entry.label).includes(needle) || normalize(entry.hint).includes(needle),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title={WORSHIP_GROUP.title} subtitle={WORSHIP_GROUP.hint} />

      <Field
        label="ابحث في خدماتك"
        icon={Search}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={WORSHIP_GROUP.entries[0]?.label ?? ""}
      />

      {services.length === 0 ? (
        <EmptyState
          icon={Search}
          title="لا توجد خدمة بهذا الاسم"
          body="جرّب كلمة أقصر، أو افتح كل الأقسام من أعلى الشاشة."
          action={<TextLink onClick={onOpenAll}>كل الأقسام</TextLink>}
        />
      ) : (
        <>
          <SectionHeader
            title="ما يؤدّيه كل يوم"
            action={<TextLink onClick={onOpenAll}>كل الأقسام</TextLink>}
          />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {services.map((entry) => (
              <li key={entry.key}>
                <ServiceCard
                  icon={entry.icon}
                  title={entry.label}
                  description={entry.hint}
                  onClick={() => onOpen(entry.key)}
                  className="h-full w-full"
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
