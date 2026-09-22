import type { Ayah } from "@/lib/quran-store";
import { toArabicDigits } from "@/lib/hijri";
import type { Surah } from "@/data/quran";
import { ayahRangeLabel, pageLabel } from "@/lib/mushaf";
import { BASMALA } from "@/lib/quran-store";
import { cn } from "@/lib/utils";

/**
 * صفحة مصحف: تبدو كالصفحة المطبوعة — إطار مزدوج، اسم السورة في شريط مستقل،
 * و«بسم الله الرحمن الرحيم» مفصولة عن أول آية، ويراعُ الدائري لرقم كل آية.
 */
export function MushafPage({
  surah,
  ayahs,
  pageIndex,
  totalPages,
  fontScale,
  showBasmala,
  onSelectAyah,
  className,
}: {
  surah: Surah;
  ayahs: Ayah[];
  pageIndex: number;
  totalPages: number;
  fontScale: number;
  showBasmala: boolean;
  onSelectAyah?: (ayah: Ayah) => void;
  className?: string;
}) {
  const first = ayahs[0];
  const last = ayahs[ayahs.length - 1];
  const isFirstPage = pageIndex === 0;

  return (
    <div className={cn("mushaf-page", className)}>
      <div className="mushaf-frame">
        <div className="mushaf-inner">
          <header className="mushaf-header">
            <span className="mushaf-surah-name">
              سورة {surah.name}
              <span className="mushaf-surah-meta">
                {surah.type} • {toArabicDigits(surah.ayahs)} آية
              </span>
            </span>
          </header>

          <div className="mushaf-paper" style={{ fontSize: `${1.15 * fontScale}rem` }}>
            {isFirstPage ? (
              <div className="mushaf-opening">
                {showBasmala ? (
                  <p className="mushaf-basmala">{BASMALA}</p>
                ) : null}
                <span className="mushaf-ornament" aria-hidden="true">
                  ۞
                </span>
              </div>
            ) : null}

            <p className="mushaf-text quran-text">
              {ayahs.map((ayah) => (
                <span key={ayah.number}>
                  {ayah.text}
                  <button
                    type="button"
                    onClick={() => onSelectAyah?.(ayah)}
                    className="ayah-medallion"
                    aria-label={`الآية ${ayah.number}`}
                    title={`الآية ${ayah.number} — اضغط لعرض رقمها وخياراتها`}
                  >
                    {toArabicDigits(ayah.number)}
                  </button>{" "}
                </span>
              ))}
            </p>
          </div>

          {/* رأس/تذييل الصفحة: رقم الصفحة ومدى الآيات فقط — التنقّل في شريط التحكم */}
          <footer className="mushaf-footer">
            <span className="mushaf-page-number">
              {pageLabel(pageIndex, totalPages)}
              {first && last ? ` • ${ayahRangeLabel(first.number, last.number)}` : ""}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
