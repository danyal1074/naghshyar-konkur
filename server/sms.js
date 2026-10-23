// SMS Service for Naghshyar (sms.ir integration)
import { db } from './db.js';

export function getSmsConfig() {
  let apiKey = process.env.SMS_IR_API_KEY || '';
  let templateId = process.env.SMS_IR_TEMPLATE_ID || '822360';

  try {
    const rowKey = db.prepare("SELECT value FROM settings WHERE key = 'sms_api_key'").get();
    if (rowKey?.value) apiKey = rowKey.value;
    const rowTpl = db.prepare("SELECT value FROM settings WHERE key = 'sms_template_id'").get();
    if (rowTpl?.value) templateId = rowTpl.value;
  } catch (e) {
    // DB might not be initialized yet
  }

  return { apiKey, templateId };
}

/**
 * Send OTP via sms.ir verify API (pattern / ultra-fast send)
 * @param {string} mobile - 11 digit Iranian phone (e.g. 09123456789)
 * @param {string} code - 5-digit verification code
 * @param {number|null} customTemplateId - Optional custom template ID
 */
export async function sendOtpSms(mobile, code, customTemplateId = null) {
  const { apiKey, templateId: defaultTemplateId } = getSmsConfig();
  const activeTemplateId = customTemplateId || defaultTemplateId;

  // Clean phone to standard 09xxxxxxxxx
  let cleanPhone = String(mobile).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).trim();
  if (cleanPhone.startsWith('+98')) cleanPhone = '0' + cleanPhone.slice(3);
  if (cleanPhone.startsWith('98')) cleanPhone = '0' + cleanPhone.slice(2);

  // If we have an active template ID, use verify endpoint
  if (activeTemplateId) {
    try {
      const resp = await fetch('https://api.sms.ir/v1/send/verify', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          mobile: cleanPhone,
          templateId: Number(activeTemplateId),
          parameters: [
            {
              name: 'CODE',
              value: String(code),
            },
          ],
        }),
      });

      const resData = await resp.json().catch(() => ({}));
      if (resp.ok && resData.status === 1) {
        console.log(`[SMS.IR] Verify OTP sent successfully to ${cleanPhone}. Cost: ${resData.data?.cost || 'ok'}`);
        return { success: true, method: 'verify', data: resData };
      }
      console.warn('[SMS.IR] verify warning:', resData);
      return { success: false, error: resData.message || 'خطا در ارسال پیامک اعتبارسنجی' };
    } catch (err) {
      console.error('[SMS.IR] verify exception:', err);
      return { success: false, error: err.message };
    }
  }

  console.warn(`[SMS.IR] TemplateId is not configured. OTP was not sent to ${cleanPhone}.`);
  return {
    success: false,
    method: 'dev_mock',
    error: 'ارسال پیامک فعال نیست. شناسه قالب را در پنل مدیر ثبت کنید.',
  };
}
