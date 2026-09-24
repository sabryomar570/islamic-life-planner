#!/usr/bin/env bash
# تغليف نسخة المصدر النهائية + نسخة الإنتاج الجاهزة للنشر في /releases
# الاستخدام: bun run package:zip   (أو bash scripts/package-zip.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/releases"
mkdir -p "$OUT"
cd "$ROOT"

# ——— 1) نسخة المصدر: كل ما يلزم لإعادة التشغيل والتطوير، بلا أسرار ولا مؤقتات
rm -f "$OUT/oud-project.zip"
zip -qr "$OUT/oud-project.zip" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "src/convex/_generated/*" \
  -x ".vly/*" \
  -x ".git/*" \
  -x "releases/*" \
  -x "*.zip" \
  -x ".env*" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "sst-env.d.ts"

# ——— 2) تعمية سر المنصة داخل الحزمة فقط (الملف الأصلي في المشروع ملك للمنصة ولا يُلمس):
# ملف قالب المنصة src/convex/auth/emailOtp.ts يحمل مفتاح إرسال OTP مضمّنًا.
# نستبدل قيمته داخل النسخة المُغلّفة بـ placeholder — فلا يُشحن أي سر.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -o -q "$OUT/oud-project.zip" "src/convex/auth/emailOtp.ts" -d "$TMP"
sed -i 's/fb_email_[A-Za-z0-9_-]*/fb_email_REDACTED_SEE_PLATFORM_TEMPLATE/g' "$TMP/src/convex/auth/emailOtp.ts"
( cd "$TMP" && zip -q "$OUT/oud-project.zip" src/convex/auth/emailOtp.ts )

# ——— 3) نسخة الإنتاج: مخرجات bun run build جاهزة للنشر على أي استضافة ثابتة
rm -f "$OUT/oud-production-dist.zip"
zip -qr "$OUT/oud-production-dist.zip" dist

# ——— تقرير موجز
echo "=== المحتويات ==="
unzip -l "$OUT/oud-project.zip" | tail -1
unzip -l "$OUT/oud-production-dist.zip" | tail -1
echo "=== فحص أسرار داخل الحزم (لا نتائج = نظيف) ==="
unzip -p "$OUT/oud-project.zip" | strings 2>/dev/null | grep -c "fb_email_" || true
echo "=== انتهى: $OUT ==="
ls -lh "$OUT"
