import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { RING_TONES, playRingTone, type RingTone } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PRAYER_METHODS, type Preferences } from "@/hooks/use-preferences";
import type { GeoStatus } from "@/hooks/use-location";
import { arabicNumber } from "@/lib/time";
import {
  Bell,
  BellRing,
  CloudDownload,
  Compass,
  HardDriveDownload,
  Info,
  MapPin,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

type GeoProps = {
  status: GeoStatus;
  coords: { latitude: number; longitude: number } | null;
  label: string | null;
  error: string | null;
  timezone: string | null;
  request: () => Promise<unknown>;
  clear: () => void;
};

type InstallProps = {
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-tile flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
      <div className="max-w-md">
        <p className="text-[13px] font-semibold">{title}</p>
        {hint ? <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsView({
  prefs,
  setPref,
  resetPrefs,
  permission,
  supported,
  onRequestPermission,
  onTestNotification,
  geo,
  install,
  online,
  cachedCount,
  quranTotal,
  downloading,
  downloadProgress,
  onDownload,
  onCancelDownload,
  onClearQuran,
  onResetNudges,
  onExportData,
  onEditCity,
  onSignOut,
  city,
}: {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  resetPrefs: () => void;
  permission: NotificationPermission | "unsupported";
  supported: boolean;
  onRequestPermission: () => void;
  onTestNotification: () => void;
  geo: GeoProps;
  install: InstallProps;
  online: boolean;
  cachedCount: number;
  quranTotal: number;
  downloading: boolean;
  downloadProgress: number;
  onDownload: () => void;
  onCancelDownload: () => void;
  onClearQuran: () => void;
  onResetNudges: () => void;
  onExportData: () => void;
  onEditCity: () => void;
  onSignOut: () => void;
  city: string;
}) {
  const permissionLabel =
    permission === "granted"
      ? "مفعّلة"
      : permission === "denied"
        ? "مرفوضة من المتصفح"
        : permission === "unsupported"
          ? "غير مدعومة"
          : "لم تُطلب بعد";

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Bell className="size-5" />}
          title="الإشعارات والتذكيرات"
          hint="أذّن لك عند دخول وقت الصلاة، وأذكّرك بوردك وبأذكار الصباح والمساء والنوم"
          action={
            <Badge
              variant={permission === "granted" ? "secondary" : "outline"}
              className="rounded-full gap-1"
            >
              <BellRing className="size-3.5" />
              {permissionLabel}
            </Badge>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {permission !== "granted" ? (
            <Button
              type="button"
              className="rounded-full"
              disabled={!supported}
              onClick={onRequestPermission}
            >
              <Bell className="size-4" />
              اسمح بالإشعارات
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-full" onClick={onTestNotification}>
            <Sparkles className="size-4" />
            إرسال تذكير تجريبي
          </Button>
        </div>

        {!supported ? (
          <p className="mt-3 text-[11px] leading-5 text-amber-700">
            متصفحك لا يدعم إشعارات النظام؛ ستظهر التذكيرات داخل التطبيق فقط، وتبقى مفيدة
            أثناء فتحه.
          </p>
        ) : permission === "denied" ? (
          <p className="mt-3 text-[11px] leading-5 text-amber-700">
            رفضت الإشعارات سابقًا. لا يمكن للموقع أن يطلبها مرة أخرى؛ فعّلها من إعدادات
            الموقع في المتصفح (أيقونة القفل ← الإشعارات ← السماح).
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          <Row title="تنبيه وقت الصلاة" hint="إشعار في الوقت نفسه، مع تنبيه قبله بدقائق.">
            <Switch
              checked={prefs.prayerAlerts}
              onCheckedChange={(value) => setPref("prayerAlerts", value)}
              aria-label="تنبيه وقت الصلاة"
            />
          </Row>

          <Row
            title="التنبيه قبل الصلاة"
            hint="كم دقيقة قبله تريد أن يعلمك حتى تتوضأ وتهيّأ؟"
          >
            <Select
              value={String(prefs.leadMinutes)}
              onValueChange={(value) => setPref("leadMinutes", Number(value))}
            >
              <SelectTrigger className="glass-tile h-9 w-32 rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">بلا تنبيه مسبق</SelectItem>
                <SelectItem value="5">٥ دقائق</SelectItem>
                <SelectItem value="10">١٠ دقائق</SelectItem>
                <SelectItem value="15">١٥ دقيقة</SelectItem>
                <SelectItem value="30">٣٠ دقيقة</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row title="تذكير أذكار الصباح والمساء" hint="لا يذكّرك بها إن كانت منجزة في يومك.">
            <Switch
              checked={prefs.adhkarReminders}
              onCheckedChange={(value) => setPref("adhkarReminders", value)}
              aria-label="تذكير الأذكار"
            />
          </Row>

          <div className="grid gap-3 sm:grid-cols-2">
            <Row title="موعد أذكار الصباح">
              <Input
                type="time"
                value={prefs.morningTime}
                onChange={(event) => setPref("morningTime", event.target.value)}
                className="glass-tile h-9 w-28 rounded-2xl border-white/70 text-xs"
              />
            </Row>
            <Row title="موعد أذكار المساء">
              <Input
                type="time"
                value={prefs.eveningTime}
                onChange={(event) => setPref("eveningTime", event.target.value)}
                className="glass-tile h-9 w-28 rounded-2xl border-white/70 text-xs"
              />
            </Row>
          </div>

          <Row title="تذكير ورد القرآن" hint="في الوقت الذي تختاره، مرة واحدة يوميًا.">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={prefs.wirdTime}
                onChange={(event) => setPref("wirdTime", event.target.value)}
                className="glass-tile h-9 w-28 rounded-2xl border-white/70 text-xs"
              />
              <Switch
                checked={prefs.wirdReminder}
                onCheckedChange={(value) => setPref("wirdReminder", value)}
                aria-label="تذكير ورد القرآن"
              />
            </div>
          </Row>

          <Row title="تذكير أذكار النوم" hint="قبل وقت نومك (حسب إجاباتك) بعشرين دقيقة.">
            <Switch
              checked={prefs.sleepReminder}
              onCheckedChange={(value) => setPref("sleepReminder", value)}
              aria-label="تذكير أذكار النوم"
            />
          </Row>

          <Row title="تذكير يوم الجمعة" hint="سورة الكهف والتبكير إلى المسجد والصلاة على النبي ﷺ.">
            <Switch
              checked={prefs.fridayReminder}
              onCheckedChange={(value) => setPref("fridayReminder", value)}
              aria-label="تذكير يوم الجمعة"
            />
          </Row>

          <Row title="تذكيرات رمضان" hint="السحور، الإفطار، وأرجى ليالي العشر الأواخر.">
            <Switch
              checked={prefs.ramadanReminders}
              onCheckedChange={(value) => setPref("ramadanReminders", value)}
              aria-label="تذكيرات رمضان"
            />
          </Row>

          <Row title="نغمة تنبيه قصيرة" hint="نغمة هادئة مع التنبيه (يُفضّل تشغيلها لمن يفتح التطبيق أثناء العمل).">
            <Switch
              checked={prefs.soundOn}
              onCheckedChange={(value) => setPref("soundOn", value)}
              aria-label="نغمة التنبيه"
            />
          </Row>

          <Row
            title="رنين عند دخول وقت الصلاة"
            hint="اختر النغمة التي تناسبك: هادئة، مطر، طبيعة، أو رنين عميق — جرّبها بالضغط على الزر."
          >
            <div className="flex flex-wrap items-center gap-2">
              <Switch
                checked={prefs.prayerRing}
                onCheckedChange={(value) => setPref("prayerRing", value)}
                aria-label="رنين الصلاة"
              />
              <Select
                value={prefs.ringTone}
                onValueChange={(value) => {
                  setPref("ringTone", value as RingTone);
                  playRingTone(value as RingTone);
                }}
              >
                <SelectTrigger className="glass-tile h-9 w-36 rounded-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RING_TONES.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Row>

          <Row
            title="رسالة «هل صلّيت؟» بعد الصلاة"
            hint="رسالة بعد اثنتي عشرة دقيقة من دخول الوقت تسألك بصدق — ويسندها سطر يحثّك على عدم الكذب."
          >
            <Switch
              checked={prefs.postPrayerPrompt}
              onCheckedChange={(value) => setPref("postPrayerPrompt", value)}
              aria-label="رسالة ما بعد الصلاة"
            />
          </Row>

          <Row
            title="نافذة «صلِّ على محمد» عند الفتح"
            hint="نافذة عدّاد صلوات تظهر مرة واحدة كل مرة تفتح فيها التطبيق."
          >
            <Switch
              checked={prefs.salawatPopup}
              onCheckedChange={(value) => setPref("salawatPopup", value)}
              aria-label="نافذة الصلاة على النبي"
            />
          </Row>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Compass className="size-5" />}
          title="الموقع ومواقيت دقيقة"
          hint="إذن الموقع يجعل الحساب على إحداثياتك مباشرة، وهو أدق من اسم المدينة"
          action={
            <Badge variant={geo.coords ? "secondary" : "outline"} className="rounded-full gap-1">
              <MapPin className="size-3.5" />
              {geo.coords ? "موقعك محفوظ" : "لم يُحدَّد"}
            </Badge>
          }
        />

        <div className="mt-5 space-y-3">
          <Row
            title="مدينتك الحالية"
            hint="نستخدمها إن لم تسمح بالموقع. تغييرها من إجابات الأسئلة الخمسة عشر."
          >
            <div className="flex items-center gap-2">
              <span className="glass-tile rounded-full px-3 py-1.5 text-xs">{city}</span>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onEditCity}>
                تعديل
              </Button>
            </div>
          </Row>

          <Row
            title="استخدم موقعي الحالي"
            hint={
              geo.label
                ? `حدّدناك في: ${geo.label}`
                : "نطلب من المتصفح إذن الموقع مرة واحدة، ويمكنك إلغاؤه في أي وقت."
            }
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void geo.request()}
                disabled={geo.status === "loading" || geo.status === "unsupported"}
              >
                <MapPin className="size-3.5" />
                {geo.status === "loading" ? "جارٍ التحديد..." : "سماح بالموقع"}
              </Button>
              {geo.coords ? (
                <GlassPill onClick={geo.clear}>
                  <span className="flex items-center gap-1.5">
                    <Trash2 className="size-3.5" /> إلغاء
                  </span>
                </GlassPill>
              ) : null}
            </div>
          </Row>

          {geo.error ? (
            <p className="text-[11px] leading-5 text-amber-700">{geo.error}</p>
          ) : null}

          <Row title="طريقة حساب المواقيت" hint="اختر ما تعتمده الجهة الشرعية في بلدك.">
            <Select
              value={String(prefs.method)}
              onValueChange={(value) => setPref("method", Number(value))}
            >
              <SelectTrigger className="glass-tile h-9 w-56 rounded-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRAYER_METHODS.map((method) => (
                  <SelectItem key={method.value} value={String(method.value)}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>

          {geo.timezone ? (
            <p className="text-[11px] text-muted-foreground">
              المنطقة الزمنية لجهازك: {geo.timezone}
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Smartphone className="size-5" />}
          title="التطبيق والعمل دون إنترنت"
          hint="ثبّت سكينة على شاشتك، ونزّل المصحف كاملًا ليُقرأ دون شبكة"
          action={
            <Badge variant="secondary" className="rounded-full gap-1">
              {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {online ? "متصل" : "دون إنترنت"}
            </Badge>
          }
        />

        <div className="mt-5 space-y-3">
          <Row
            title="تثبيت التطبيق"
            hint={
              install.installed
                ? "سكينة مثبّتة على جهازك بالفعل."
                : install.isIos
                  ? "على آيفون: زر المشاركة ← «إضافة إلى الشاشة الرئيسية»."
                  : "يثبَّت كتطبيق مستقل بأيقونته الخاصة، ويعمل حتى بلا شبكة."
            }
          >
            {install.installed ? (
              <Badge className="rounded-full bg-emerald-500/90 text-white">مثبّت</Badge>
            ) : install.canInstall ? (
              <Button
                type="button"
                className="rounded-full"
                onClick={async () => {
                  const result = await install.promptInstall();
                  if (result === "dismissed") toast.info("لم يُثبَّت بعد، يمكنك المحاولة لاحقًا.");
                }}
              >
                <Smartphone className="size-4" />
                ثبّت الآن
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {install.isIos ? "من قائمة المشاركة في المتصفح" : "يظهر زر التثبيت في المتصفح المدعوم"}
              </span>
            )}
          </Row>

          <div className="glass-tile rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold">المصحف كاملًا على جهازك</p>
                <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                  محفوظ الآن {arabicNumber(cachedCount)} من {arabicNumber(quranTotal)} سورة.
                  التنزيل يجري في الخلفية، ويمكنك متابعة القراءة أثناءه.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {downloading ? (
                  <Button type="button" variant="outline" className="rounded-full" onClick={onCancelDownload}>
                    إيقاف
                  </Button>
                ) : (
                  <Button type="button" className="rounded-full" onClick={onDownload}>
                    <CloudDownload className="size-4" />
                    نزّل المصحف
                  </Button>
                )}
                <GlassPill onClick={onClearQuran}>
                  <span className="flex items-center gap-1.5">
                    <HardDriveDownload className="size-3.5" /> تفريغ
                  </span>
                </GlassPill>
              </div>
            </div>
            {downloading ? (
              <Progress value={downloadProgress} className="mt-3 h-2 bg-white/60" />
            ) : null}
          </div>

          <Row
            title="عدم إنترنت أول مرة"
            hint="افتح التطبيق مرة واحدة مع اتصال ليُحفظ هيكله وخطوطه، ثم يعمل بعده دون شبكة."
          >
            <Badge variant="outline" className="rounded-full text-[10px]">
              تخزين تدريجي
            </Badge>
          </Row>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Moon className="size-5" />}
          title="النوافذ المنبثقة والقراءة"
          hint="نافذة واحدة كل مرة، تظهر إذا لم تدخل القسم المعني أو فات وقت عبادة — وبإمكانك إيقافها"
        />

        <div className="mt-5 space-y-3">
          <Row title="تفعيل التنبيهات المنبثقة الذكية" hint="أطفئها إن أردت أن يبقى التطبيق هادئًا تمامًا.">
            <Switch
              checked={prefs.nudgesEnabled}
              onCheckedChange={(value) => setPref("nudgesEnabled", value)}
              aria-label="التنبيهات المنبثقة"
            />
          </Row>

          <Row
            title="إعادة ضبط ما تجاهلته"
            hint="إذا أغلقت تنبيهًا سابقًا فسيظهر مرة أخرى بعد إعادة الضبط."
          >
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                onResetNudges();
                toast.success("أُعيد ضبط التنبيهات المنبثقة.");
              }}
            >
              <RotateCcw className="size-4" />
              إعادة الضبط
            </Button>
          </Row>

          <Row title="عرض المصحف بصفحات" hint="أو عرضٌ آيةً آية مع خيارات النسخ والمشاركة.">
            <Switch
              checked={prefs.mushafMode}
              onCheckedChange={(value) => setPref("mushafMode", value)}
              aria-label="عرض المصحف بصفحات"
            />
          </Row>

          <Row title="حجم خط المصحف" hint="يُحفظ ويُطبَّق على كل السور.">
            <div className="flex items-center gap-2">
              <GlassPill onClick={() => setPref("fontScale", Math.max(0.8, Number((prefs.fontScale - 0.1).toFixed(2))))}>
                أصغر
              </GlassPill>
              <span className="text-xs text-muted-foreground">
                {arabicNumber(Math.round(prefs.fontScale * 100))}٪
              </span>
              <GlassPill onClick={() => setPref("fontScale", Math.min(2, Number((prefs.fontScale + 0.1).toFixed(2))))}>
                أكبر
              </GlassPill>
            </div>
          </Row>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<ShieldCheck className="size-5" />}
          title="بياناتك وخصوصيتك"
          hint="بياناتك محفوظة في حسابك على قاعدة بيانات التطبيق، وما يُخزَّن في جهازك يخصّك وحدك"
        />

        <div className="mt-5 space-y-3">
          <Row
            title="تصدير نسخة من إعداداتك"
            hint="ملف واحد فيه تفضيلاتك وعلامات القراءة وما تجاهلته من تنبيهات."
          >
            <Button type="button" variant="outline" className="rounded-full" onClick={onExportData}>
              <HardDriveDownload className="size-4" />
              تصدير JSON
            </Button>
          </Row>

          <Row title="إعادة تفضيلاتي للوضع الافتراضي" hint="لا يمسّ إجاباتك ولا سجل صلواتك.">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                resetPrefs();
                toast.success("أُعيدت التفضيلات الافتراضية.");
              }}
            >
              <RotateCcw className="size-4" />
              استعادة الافتراضي
            </Button>
          </Row>

          <Row title="تسجيل الخروج" hint="يمكنك الدخول مرة أخرى بالبريد نفسه.">
            <Button type="button" variant="ghost" className="rounded-full text-destructive" onClick={onSignOut}>
              خروج
            </Button>
          </Row>
        </div>
      </GlassCard>

      <GlassCard soft className="p-5">
        <p className="flex items-start gap-2 text-[11px] leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          المصادر: نصوص المصحف بالرسم العثماني من واجهات متعددة مع نسخة محفوظة داخل
          التطبيق، ومواقيت الصلاة من خدمة Aladhan حسب الطريقة التي اخترتها، والأحاديث
          والأذكار مذكور مصدرها على كل بطاقة. لا يرسل التطبيق موقعك لأي طرف آخر غير خدمة
          المواقيت لحساب الوقت.
        </p>
      </GlassCard>
    </div>
  );
}
