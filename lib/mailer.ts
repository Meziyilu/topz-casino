// lib/mailer.ts
export type SendEmailInput = { to: string; subject: string; html: string };

const mode = process.env.MAIL_MODE ?? 'console';

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  if (mode === 'console') {
    // DEV：直接在伺服器端印出，並提供 previewUrl 給呼叫端
    const previewUrl = extractFirstHref(html) ?? '';
    console.log('📧 [DEV mail] To:', to, '\nSubject:', subject, '\nHTML:', html, '\nPreview:', previewUrl);
    return { ok: true, previewUrl };
  }
  if (mode === 'smtp') {
    // 之後要真的寄再補這段（例如 nodemailer），現在先不做
    return { ok: false, reason: 'SMTP not configured' };
  }
  return { ok: true };
}

function extractFirstHref(html: string) {
  const m = html.match(/href="([^"]+)"/i);
  return m?.[1];
}
