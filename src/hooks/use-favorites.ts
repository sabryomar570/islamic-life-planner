/**
 * نظام الحفظ الموحّد: حالة فورية من الخادم (استعلام reactive) + نسخة محلية
 * تُعرض لحظة الضغط حتى قبل وصول الرد، وتُدمج عند عودة الشبكة.
 * بهذا يتغيّر لون علامة الحفظ فورًا، وتبقى المحفوظات بعد إغلاق التطبيق.
 */
import { api } from "@/convex/_generated/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";

export type FavoriteRecord = {
  itemId: string;
  kind: "hadith" | "poem" | "dhikr" | "ayah" | "story";
  // story: قصص الأنبياء — تُحفظ عبر النظام الموحّد نفسه.
  title: string;
  savedAt: number;
};

export type FavoriteKind = FavoriteRecord["kind"];

const LOCAL_KEY = "oud:favorites:local";

function readLocalFavorites(): FavoriteRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { value?: FavoriteRecord[] };
    if (!Array.isArray(parsed?.value)) return [];
    return parsed.value
      .filter((item) => typeof item?.itemId === "string")
      .slice(-500);
  } catch {
    return [];
  }
}

function writeLocalFavorites(items: FavoriteRecord[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify({ value: items, at: Date.now() }));
  } catch {
    /* الحافظة ممتلئة */
  }
}

function toRecords(serverItems: readonly { itemId: string; kind: string; title: string; savedAt: number }[]): FavoriteRecord[] {
  return serverItems
    .filter((item) => typeof item?.itemId === "string")
    .map((item) => ({
      itemId: item.itemId,
      kind: (item.kind as FavoriteKind) ?? "dhikr",
      title: item.title ?? "",
      savedAt: item.savedAt ?? 0,
    }));
}

export function useFavorites() {
  const serverFavorites = useQuery(api.planner.getFavorites);
  const setFavoriteMutation = useMutation(api.planner.setFavorite);
  const removeFavorite = useMutation(api.planner.removeFavorite);

  // النسخة المحلية تُعرض فورًا حتى قبل أول ردّ من الخادم.
  const [local, setLocal] = useState<FavoriteRecord[]>(() => readLocalFavorites());
  const [pending, setPending] = useState<Set<string>>(new Set());
  // مرآة للـpending تُقرأ داخل callback بلا اعتماديات زائدة.
  const pendingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // عند وصول بيانات الخادم ندمجها مع المحلية (اتحاد) ونكتب النتيجة محليًا.
  useEffect(() => {
    if (!serverFavorites) return;
    const server = toRecords(serverFavorites);
    const map = new Map<string, FavoriteRecord>();
    for (const item of [...readLocalFavorites(), ...server]) {
      const existing = map.get(item.itemId);
      map.set(item.itemId, existing && existing.savedAt > item.savedAt ? existing : item);
    }
    const merged = [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
    setLocal(merged);
    writeLocalFavorites(merged);
  }, [serverFavorites]);

  const ids = useMemo(() => new Set(local.map((item) => item.itemId)), [local]);

  const isSaved = useCallback((itemId: string) => ids.has(itemId), [ids]);

  const toggle = useCallback(
    (itemId: string, kind: FavoriteKind, title: string) => {
      // نقرتان سريعتان لا تُقرآن كعكسين: الثاني يُتجاهل حتى وصول الأول.
      if (pendingRef.current.has(itemId)) return;
      const saved = !ids.has(itemId);
      const nextLocal: FavoriteRecord[] = saved
        ? [{ itemId, kind, title, savedAt: Date.now() }, ...local]
        : local.filter((item) => item.itemId !== itemId);
      setLocal(nextLocal);
      writeLocalFavorites(nextLocal);

      // مزامنة الخادم مع مؤشّر «جارٍ» حتى لا يومض الزر بين حالتين.
      setPending((current) => new Set(current).add(itemId));
      setFavoriteMutation({ itemId, kind, title, saved })
        .catch(() => {
          // فشل الاتصال: نُبقي الحالة المحلية وتُتزامن لاحقًا عند تحديث الاستعلام.
        })
        .finally(() => {
          setPending((current) => {
            const next = new Set(current);
            next.delete(itemId);
            return next;
          });
        });
    },
    [ids, local, setFavoriteMutation],
  );

  const remove = useCallback(
    (itemId: string) => {
      const nextLocal = local.filter((item) => item.itemId !== itemId);
      setLocal(nextLocal);
      writeLocalFavorites(nextLocal);
      // حذف صريح على الخادم: لا يُدرج شيئًا حتى لو لم يكن العنصر محفوظًا هناك بعد.
      void removeFavorite({ itemId }).catch(() => undefined);
    },
    [local, removeFavorite],
  );

  const byKind = useCallback(
    (kind: FavoriteKind) => local.filter((item) => item.kind === kind),
    [local],
  );

  return {
    favorites: local,
    ids,
    isSaved,
    pending,
    toggle,
    remove,
    byKind,
    ready: serverFavorites !== undefined,
  };
}
