/**
 * ساعة مشتركة: كل المكوّنات التي تحتاج وقتًا حيًّا تشترك في مؤقّت واحد لكل خطوة
 * زمنية، فلا نُنشئ عشرات المؤقّتات ولا نُعيد تصيير الشاشة كلها كل ثانية.
 */
import { useEffect, useState } from "react";

type Bucket = {
  timer: number | null;
  listeners: Set<(value: Date) => void>;
  value: Date;
};

const buckets = new Map<number, Bucket>();

function bucketFor(stepMs: number): Bucket {
  const existing = buckets.get(stepMs);
  if (existing) return existing;
  const bucket: Bucket = { timer: null, listeners: new Set(), value: new Date() };
  buckets.set(stepMs, bucket);
  return bucket;
}

function start(bucket: Bucket, stepMs: number) {
  if (bucket.timer !== null) return;
  bucket.timer = window.setInterval(() => {
    bucket.value = new Date();
    for (const listener of bucket.listeners) listener(bucket.value);
  }, stepMs);
}

function stop(bucket: Bucket) {
  if (bucket.timer === null) return;
  window.clearInterval(bucket.timer);
  bucket.timer = null;
}

/** يعيد الوقت الحالي محدَّثًا كل `stepMs` مللي ثانية (افتراضيًا كل ثانية). */
export function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const bucket = bucketFor(stepMs);
    bucket.value = new Date();
    setNow(bucket.value);
    bucket.listeners.add(setNow);
    start(bucket, stepMs);
    return () => {
      bucket.listeners.delete(setNow);
      if (bucket.listeners.size === 0) stop(bucket);
    };
  }, [stepMs]);

  return now;
}

