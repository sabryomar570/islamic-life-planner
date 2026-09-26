import {
  Panel,
  PrimaryButton,
  QuietButton,
  SectionHead,
} from "@/components/app/Surfaces";
import { RING_TONES, playRingTone, type RingTone } from "@/lib/notify";
import { PermissionReasonDialog } from "@/components/app/PermissionReasonDialog";
import {
  AUDIO_CHANNELS,
  playCue,
  unlockAudio,
} from "@/lib/audio";
import { audioPreferencesOf, PRAYER_METHODS, type Preferences } from "@/hooks/use-preferences";
import { Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import type { GeoStatus } from "@/hooks/use-location";
import { arabicNumber } from "@/lib/time";
import {
  Bell,
  BellRing,
  CloudDownload,
  HardDriveDownload,
  Info,
  MapPin,
  RotateCcw,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatBytes, storageEstimate } from "@/lib/pwa";
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

/**
 * PHASE 2M — صف إعداد واحد.
 *
 * سطر مفصول بشعرة لا صندوق. كل إعداد في بطاقة منفصلة كان يجعل القائمة
 * تبدو كشبكة من القطع بدل إعدادات قابلة للقراءة.
 */
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] py-3.5 last:border-b-0">
      <div className="max-w-md">
        <p className="text-[13px] font-semibold">{title}</p>
        {hint ? <p className="label-meta mt-0.5 leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** مجموعة إعدادات: عنوان واحد، ثم صفوفه بلا صناديق إضافية. */
function Group({
  eyebrow,
  title,
  hint,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <SectionHead eyebrow={eyebrow} title={title} hint={hint} action={action} />
      </div>
      <div className="rule-t px-5 pb-4 sm:px-6">{children}</div>
    </Panel>
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
  onClearCaches,
  onResetNudges,
  onExportData,
  onSetCity,
  onEditProfile,
  onSignOut,
  onDeleteAllData,
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
  onClearCaches: () => Promise<void>;
  onResetNudges: () => void;
  onExportData: () => void;
  /** حفظ مدينة يدوية (بلا سؤال في البداية). */
  onSetCity: (value: string) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  onDeleteAllData: () => void;
  city: string;
}) {
  const [cityDraft, setCityDraft] = useState(city);
  // قياس حقيقي من المتصفح: لا رقم مُقدَّر. null = غير مدعوم أوCalculation لم تجرِ.
  const [storageLabel, setStorageLabel] = useState<string | null>(null);
  const [clearingCaches, setClearingCaches] = useState(false);
  // نطلب الإذن **بعد** أن نقول لماذا. لا نافذة نظام بلا سبب.
  const [locationReasonOpen, setLocationReasonOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void storageEstimate().then((estimate) => {
      if (!active) return;
      setStorageLabel(
        estimate === null
          ? "المتصفح لا يبلّغ عن المساحة"
          : `${formatBytes(estimate.usage)} من ${formatBytes(estimate.quota)}`,
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const handleClearCaches = useCallback(async () => {
    setClearingCaches(true);
    try {
      await onClearCaches();
    } finally {
      setClearingCaches(false);
    }
  }, [onClearCaches]);

  useEffect(() => {
    setCityDraft(city);
  }, [city]);
  const permissionLabel =
    permission === "granted"
      ? "مفعّلة"
      : permission === "denied"
        ? "مرفوضة من المتصفح"
        : permission === "unsupported"
          ? "غير مدعومة"
          : "لم تُطلب بعد";

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="الحساب"
          title="فهم يومك"
          hint="عدّل أوقاتك وهدفك، أو أضف التفاصيل الاختيارية التي تجعل فهم عود ليومك أدق."
          action={
            <QuietButton onClick={onEditProfile} className="px-4">
              تعديل الفهم
            </QuietButton>
          }
        />
      </Panel>

      <Group
        eyebrow="التطبيق"
        title="الإشعارات والتذكيرات"
        hint="أذّن لك عند دخول وقت الصلاة، وأذكّرك بوردك وبأذكار الصباح والمساء والنوم."
        action={
          <span className="label-meta shrink-0 text-muted-foreground">{permissionLabel}</span>
        }
      >

        {/* الأذونان معًا: إشعارات + موقع */}
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div className="surface-secondary flex flex-col items-start gap-2 rounded-2xl p-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <BellRing className="size-4 text-primary" />
              إذن الإشعارات
            </span>
            <span className="label-meta leading-5 text-muted-foreground">{permissionLabel}</span>
            {permission !== "granted" ? (
              <PrimaryButton
                onClick={onRequestPermission}
                disabled={!supported}
                className="mt-1 px-4 text-[12px]"
              >
                <Bell className="size-3.5" />
                اسمح بالإشعارات
              </PrimaryButton>
            ) : (
              <span className="mt-1 text-[11px] font-medium text-[var(--status-success)]">
                مفعّلة ✓
              </span>
            )}
          </div>

          <div className="surface-secondary flex flex-col items-start gap-2 rounded-2xl p-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold">
              <MapPin className="size-4 text-primary" />
              إذن الموقع
            </span>
            <span className="label-meta leading-5 text-muted-foreground">
              {geo.coords ? "موقعك محفوظ — المواقيت على إحداثياتك" : "لم يُحدَّد بعد — يجعل المواقيت أدق"}
            </span>
            {geo.coords ? (
              <QuietButton onClick={geo.clear} className="mt-1 px-4 text-[12px]">
                <Trash2 className="size-3.5" />
                إلغاء الإذن
              </QuietButton>
            ) : (
              <PrimaryButton
                onClick={() => setLocationReasonOpen(true)}
                disabled={geo.status === "loading" || geo.status === "unsupported"}
                className="mt-1 px-4 text-[12px]"
              >
                <MapPin className="size-3.5" />
                {geo.status === "loading" ? "جارٍ التحديد..." : "سماح بالموقع"}
              </PrimaryButton>
            )}
            {geo.error ? (
              <span className="label-meta leading-4 text-[var(--status-attention)]">{geo.error}</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QuietButton onClick={onTestNotification}>
            <Sparkles className="size-3.5" />
            إرسال تذكير تجريبي
          </QuietButton>
        </div>

        {!supported ? (
          <p className="label-body mt-2 text-[var(--status-attention)]">
            متصفحك لا يدعم إشعارات النظام؛ ستظهر التذكيرات داخل التطبيق فقط، وتبقى مفيدة أثناء فتحه.
          </p>
        ) : permission === "denied" ? (
          <p className="label-body mt-2 text-[var(--status-attention)]">
            رفضت الإشعارات سابقًا. فعّلها من إعدادات الموقع في المتصفح (أيقونة القفل ← الإشعارات ← السماح).
          </p>
        ) : null}

        <div className="mt-3">
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

          {/* PHASE 3 — نظام الصوت: مفتاح عام ثم قناة لكل صوت. */}
          <Row
            title="صوت التطبيق"
            hint="المفتاح العام. إيقافه يسكت كل النغمات، ويبقى كل مفتاح آخر على حاله."
          >
            <div className="flex items-center gap-2">
              <Switch
                checked={prefs.soundOn}
                onCheckedChange={(value) => {
                  if (value) unlockAudio();
                  setPref("soundOn", value);
                  if (value) playCue("toggle-on", audioPreferencesOf({ ...prefs, soundOn: true }));
                }}
                aria-label="تشغيل أصوات التطبيق"
              />
              <QuietButton
                disabled={!prefs.soundOn}
                onClick={() => {
                  unlockAudio();
                  playCue("reminder", audioPreferencesOf(prefs));
                }}
                aria-label="تجربة نغمة التنبيه"
              >
                <Volume2 className="size-3.5" />
                جرّب
              </QuietButton>
            </div>
          </Row>

          {AUDIO_CHANNELS.map((channel) => {
            const key = {
              notification: "notificationSound",
              prayer: "prayerRing",
              completion: "completionSound",
              feedback: "gentleFeedback",
            }[channel.key] as
              | "notificationSound"
              | "prayerRing"
              | "completionSound"
              | "gentleFeedback";
            return (
              <Row
                key={channel.key}
                title={channel.label}
                hint={
                  channel.key === "prayer"
                    ? `${channel.hint}. إن أطفأت الصوت العام فلا نغمة هنا.`
                    : channel.hint
                }
              >
                <Switch
                  checked={prefs[key]}
                  disabled={!prefs.soundOn}
                  onCheckedChange={(value) => {
                    if (value) unlockAudio();
                    setPref(key, value);
                    const next = audioPreferencesOf({ ...prefs, [key]: value });
                    playCue(value ? "toggle-on" : "toggle-off", {
                      ...next,
                      appSounds: true,
                    });
                  }}
                  aria-label={channel.label}
                />
              </Row>
            );
          })}

          <Row
            title="مستوى الصوت"
            hint="هادئ في الغالب. الصمت الكامل ممكن: اضبطه على الصفر."
          >
            <div className="flex min-w-[12rem] flex-1 items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(prefs.soundVolume * 100)}
                disabled={!prefs.soundOn}
                onChange={(event) =>
                  setPref("soundVolume", Number(event.target.value) / 100)
                }
                aria-label="مستوى الصوت"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--status-idle)] accent-[var(--primary)] disabled:cursor-not-allowed"
              />
              <span className="label-meta w-12 text-end text-muted-foreground">
                {arabicNumber(Math.round(prefs.soundVolume * 100))}٪
              </span>
            </div>
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
      </Group>

      <Group
        eyebrow="الصلاة"
        title="الموقع ومواقيت دقيقة"
        hint="إذن الموقع يجعل الحساب على إحداثياتك مباشرة، وهو أدق من اسم المدينة."
        action={
          <span className="label-meta shrink-0 text-muted-foreground">
            {geo.coords ? "موقعك محفوظ" : "لم يُحدَّد"}
          </span>
        }
      >
        <div>
          <Row
            title="مدينتك الحالية"
            hint="استنتجناها من منطقتك الزمنية، أو حدّدناها من إذن الموقع. عدّلها إن أردت."
          >
            <div className="flex items-center gap-2">
              <Input
                value={cityDraft}
                onChange={(event) => setCityDraft(event.target.value)}
                className="glass-tile h-9 w-40 rounded-full text-xs"
                aria-label="المدينة"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="btn-edge rounded-full"
                disabled={cityDraft.trim().length < 2 || cityDraft.trim() === city}
                onClick={() => onSetCity(cityDraft.trim())}
              >
                حفظ
              </Button>
            </div>
          </Row>

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
      </Group>

      <Group
        eyebrow="التطبيق"
        title="التطبيق والعمل دون إنترنت"
        hint="ثبّت عود على شاشتك، ونزّل المصحف كاملًا ليُقرأ دون شبكة."
        action={
          <span className="label-meta shrink-0 text-muted-foreground">
            {online ? "متصل" : "دون إنترنت"}
          </span>
        }
      >
        <div>
          <Row
            title="تثبيت التطبيق"
            hint={
              install.installed
                ? "عود مثبّت على جهازك بالفعل."
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
                <QuietButton onClick={onClearQuran} className="px-3 text-[12px]">
                  <HardDriveDownload className="size-3.5" /> تفريغ
                </QuietButton>
              </div>
            </div>
            {downloading ? (
              <Progress value={downloadProgress} className="mt-3 h-2 bg-white/60" />
            ) : null}
          </div>

          <Row
            title="مساحة التخزين"
            hint="ما يستخدمه عود على جهازك: المصحف المحفوظ، القشرة، والصفحات المقروءة."
          >
            <span className="label-meta text-muted-foreground">
              {storageLabel ?? "جارٍ الحساب…"}
            </span>
          </Row>

          <Row
            title="تفريغ الحفظ المؤقت"
            hint="يحذف القشرة والصفحات المقروءة فقط. لا يمسّ المصحف المنزَّل ولا حسابك ولا موضع قراءتك."
          >
            <QuietButton
              onClick={() => void handleClearCaches()}
              disabled={clearingCaches}
              className="px-3 text-[12px]"
            >
              <HardDriveDownload className="size-3.5" />
              {clearingCaches ? "جارٍ…" : "تفريغ الحفظ"}
            </QuietButton>
          </Row>

          <Row
            title="عدم إنترنت أول مرة"
            hint="افتح التطبيق مرة واحدة مع اتصال ليُحفظ هيكله وخطوطه، ثم يعمل بعده دون شبكة."
          >
            <Badge variant="outline" className="rounded-full text-[11px]">
              تخزين تدريجي
            </Badge>
          </Row>
        </div>
      </Group>

      <Group
        eyebrow="التطبيق"
        title="النوافذ المنبثقة والقراءة"
        hint="نافذة واحدة كل مرة، تظهر إذا لم تدخل القسم المعني أو فات وقت عبادة — وبإمكانك إيقافها."
      >
        <div>
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

          <Row title="حجم خط المصحف" hint="يُحفظ ويُطبَّق على كل السور، والعرض آيةٌ آية.">
            <div className="flex items-center gap-2">
              <QuietButton
                onClick={() =>
                  setPref("fontScale", Math.max(0.8, Number((prefs.fontScale - 0.1).toFixed(2))))
                }
                className="px-3"
                aria-label="تصغير خط المصحف"
              >
                أصغر
              </QuietButton>
              <span className="text-xs text-muted-foreground">
                {arabicNumber(Math.round(prefs.fontScale * 100))}٪
              </span>
              <QuietButton
                onClick={() =>
                  setPref("fontScale", Math.min(2, Number((prefs.fontScale + 0.1).toFixed(2))))
                }
                className="px-3"
                aria-label="تكبير خط المصحف"
              >
                أكبر
              </QuietButton>
            </div>
          </Row>
        </div>
      </Group>

      <Group
        eyebrow="البيانات"
        title="بياناتك وخصوصيتك"
        hint="بياناتك محفوظة في حسابك، وما يُخزَّن في جهازك يخصّك وحدك."
      >
        <div>
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

          <Row
            title="حذف كل بياناتي من الخادم"
            hint="يزيل ملفك وسجل صلواتك وأذكارك ومراجعاتك ومحفوظاتك وخططك. لا رجعة فيه."
          >
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" className="rounded-full text-destructive">
                  <Trash2 className="size-4" />
                  حذف بياناتي
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl" className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف كل بياناتك نهائيًا؟</AlertDialogTitle>
                  <AlertDialogDescription className="leading-7">
                    سيُحذف كل ما سجّلته في حسابك: نموذج الحياة، سجل الصلوات والأذكار،
                    المراجعات، المحفوظات، وخطط الأسبوع. يبقى الحساب نفسه، ويبدأ من الصفر.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">تراجع</AlertDialogCancel>
                  <AlertDialogAction
                    className="rounded-full bg-destructive text-destructive-foreground"
                    onClick={onDeleteAllData}
                  >
                    نعم، احذف كل شيء
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Row>

          <Row title="تسجيل الخروج" hint="يمكنك الدخول مرة أخرى بالبريد نفسه.">
            <Button type="button" variant="ghost" className="rounded-full text-destructive" onClick={onSignOut}>
              خروج
            </Button>
          </Row>
        </div>
      </Group>

      <p className="label-meta flex items-start gap-2 px-1 leading-6 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        المصادر: نصوص المصحف بالرسم العثماني من واجهات متعددة مع نسخة محفوظة داخل التطبيق،
        ومواقيت الصلاة من خدمة Aladhan حسب الطريقة التي اخترتها، والأحاديث والأذكار مذكور
        مصدرها على كل عنصر. لا يرسل التطبيق موقعك لأي طرف آخر غير خدمة المواقيت لحساب الوقت.
      </p>

      <PermissionReasonDialog
        kind="location"
        open={locationReasonOpen}
        onOpenChange={setLocationReasonOpen}
        onAllow={() => void geo.request()}
        pending={geo.status === "loading"}
      />
    </div>
  );
}
