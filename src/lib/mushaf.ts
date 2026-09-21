/** تقسيم آيات السورة إلى صفحات بحجم صفحات المصحف الورقي. */
import type { Ayah } from "@/lib/quran-store";
import { toArabicDigits } from "@/lib/hijri";

/** عدد الأحرف التقريبي في صفحة المصحف (١٥ سطرًا في المتوسط). */
export const CHARS_PER_PAGE = 750;

export const QURAN_FONT_SIZES = [1, 1.15, 1.3, 1.45, 1.6, 1.8, 2] as const;

export function paginateAyahs(ayahs: Ayah[], charsPerPage = CHARS_PER_PAGE): Ayah[][] {
  const pages: Ayah[][] = [];
  let current: Ayah[] = [];
  let size = 0;

  for (const ayah of ayahs) {
    const length = ayah.text.length + 8;
    if (current.length > 0 && size + length > charsPerPage) {
      pages.push(current);
      current = [];
      size = 0;
    }
    current.push(ayah);
    size += length;
  }
  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export function ayahRangeLabel(from: number, to: number) {
  if (from === to) return `الآية ${toArabicDigits(from)}`;
  return `الآيات ${toArabicDigits(from)}–${toArabicDigits(to)}`;
}

export function pageLabel(pageIndex: number, total: number) {
  return `صفحة ${toArabicDigits(pageIndex + 1)} من ${toArabicDigits(total)}`;
}
