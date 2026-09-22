/**
 * تخزين رموز الدخول بشكل دائم.
 *
 * نكتب الرمز في localStorage (الأسرع والأكمل) ومرآة له في cookie مدّتها سنة كاملة،
 * فإن حُذفت الحافظة أو حُجبت (بعض المتصفحات تمسح localStorage في الوضع المستقل)
 * استرجعنا الجلسة من الكوكي بدل مطالبة المستخدم بتسجيل الدخول من جديد.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ٤٠٠ يوم

function readCookie(key: string): string | null {
  try {
    const prefix = `${encodeURIComponent(key)}=`;
    for (const chunk of document.cookie.split("; ")) {
      if (chunk.startsWith(prefix)) return decodeURIComponent(chunk.slice(prefix.length));
    }
  } catch {
    /* لا شيء */
  }
  return null;
}

function writeCookie(key: string, value: string) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(
      value,
    )}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* لا شيء */
  }
}

function deleteCookie(key: string) {
  try {
    document.cookie = `${encodeURIComponent(key)}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    /* لا شيء */
  }
}

/** مفاتيح الجلسة التي يكتبها مزوّد المصادقة (بعد إزالة الرموز غير الأبجدية من النطاق). */
const SESSION_KEYS = ["__convexAuthJWT_oudapp", "__convexAuthRefreshToken_oudapp"];

/** هل يوجد رمز دخول محفوظ على هذا الجهاز؟ */
export function hasStoredSession(): boolean {
  return SESSION_KEYS.some((key) => {
    try {
      if (window.localStorage.getItem(key)) return true;
    } catch {
      /* الحافظة غير متاحة */
    }
    return readCookie(key) !== null;
  });
}

export const authStorage = {
  getItem(key: string): string | null {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      /* الحافظة غير متاحة */
    }
    const mirrored = readCookie(key);
    if (mirrored !== null) {
      // نُعيد كتابته في الحافظة ليصبح الوصول لاحقًا أسرع.
      try {
        window.localStorage.setItem(key, mirrored);
      } catch {
        /* لا شيء */
      }
    }
    return mirrored;
  },

  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* لا شيء */
    }
    writeCookie(key, value);
  },

  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* لا شيء */
    }
    deleteCookie(key);
  },
};
