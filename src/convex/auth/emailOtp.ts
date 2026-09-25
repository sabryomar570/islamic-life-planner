import { Email } from "@convex-dev/auth/providers/Email";
import axios from "axios";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

/**
 * إرسال رمز التحقق عبر مرحّل البريد الخاص بالمنصة.
 * مفتاح البروتوكول يُقرأ من متغير البيئة FREEBUFF_OTP_KEY (يُدار عبر `convex env set`)
 * ولا يُكتب في الشيفرة أبدًا — لا أسرار في المستودع، ولا حاجة لتعديل الكود عند تدوير المفتاح.
 */
export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // 15 minutes
  // This function can be asynchronous
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 6);
  },
  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.FREEBUFF_OTP_KEY;
    if (!apiKey) {
      throw new Error(
        "إرسال البريد غير مهيأ: متغير البيئة FREEBUFF_OTP_KEY مفقود على نشر Convex.",
      );
    }
    try {
      await axios.post(
        "https://auth.freebuff.app/send_otp",
        {
          to: email,
          otp: token,
          // اسم التطبيق كما يظهر للمستخدم في بريد التحقق. لا اسم منصة بناة.
          appName: process.env.VLY_APP_NAME || "عود",
        },
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});
