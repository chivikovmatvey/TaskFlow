import nodemailer from 'nodemailer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = path.resolve(__dirname, 'assets/logo.png')
const LOGO_CID = 'taskflow-logo'

let transporter = null

export function initEmail() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  if (!host || !user || !pass) {
    console.log('⚠️  SMTP не настроен — письма с кодом будут логироваться в консоль')
    return
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  })
  console.log(`✅ SMTP подключён (${host})`)
}

export function isEmailEnabled() {
  return !!transporter
}

export async function sendVerificationEmail(to, code, purpose = 'register') {
  const subject =
    purpose === 'login'
      ? 'Код для входа в TaskFlow'
      : purpose === 'telegram-register'
        ? 'Подтверждение email — TaskFlow + Telegram'
        : 'Код подтверждения регистрации в TaskFlow'

  const html = renderEmailTemplate({ code, purpose })

  if (!transporter) {
    console.log('\n──────────── EMAIL (mock) ────────────')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Code: ${code}`)
    console.log('──────────────────────────────────────\n')
    return { mocked: true }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER
  await transporter.sendMail({
    from: `"TaskFlow" <${from}>`,
    to,
    subject,
    html,
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 15 минут. Если вы не запрашивали этот код — просто проигнорируйте письмо.`,
    attachments: [
      {
        filename: 'logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
      },
    ],
  })
  return { mocked: false }
}

function renderEmailTemplate({ code, purpose }) {
  const headline =
    purpose === 'login'
      ? 'Код для входа'
      : purpose === 'telegram-register'
        ? 'Подтвердите email'
        : 'Добро пожаловать в TaskFlow'

  const subtitle =
    purpose === 'login'
      ? 'Используйте этот код, чтобы войти в свой аккаунт.'
      : purpose === 'telegram-register'
        ? 'Это последний шаг для привязки аккаунта Telegram к TaskFlow.'
        : 'Введите этот код на странице регистрации, чтобы подтвердить email.'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TaskFlow</title>
</head>
<body style="margin:0;padding:0;background:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#141413;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#faf9f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" style="max-width:520px;background:#ffffff;border:1px solid #e8e6df;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(20,20,19,0.04);">
          <tr>
            <td style="padding:28px 32px 0 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td valign="middle" style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" style="vertical-align:middle;padding-right:12px;">
                          <img src="cid:${LOGO_CID}" alt="TaskFlow" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:10px;" />
                        </td>
                        <td valign="middle" style="vertical-align:middle;">
                          <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;letter-spacing:-0.02em;color:#141413;line-height:1;">TaskFlow</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="vertical-align:middle;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f4654b;"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px 8px 32px;">
              <h1 style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;letter-spacing:-0.02em;color:#141413;line-height:1.2;">
                ${headline}
              </h1>
              <p style="margin:0 0 24px 0;font-size:14px;color:#5d5b54;line-height:1.55;">
                ${subtitle}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 8px 32px;">
              <div style="background:#faf9f5;border:1px solid #e8e6df;border-radius:10px;padding:24px;text-align:center;">
                <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#8a8779;margin-bottom:12px;">Ваш код</div>
                <div style="font-family:'SF Mono','Monaco','Consolas',monospace;font-size:36px;font-weight:600;letter-spacing:0.3em;color:#141413;padding:0 0 0 0.3em;">
                  ${code}
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 28px 32px;">
              <p style="margin:0;font-size:13px;color:#8a8779;line-height:1.55;">
                Код действителен <strong style="color:#5d5b54;">15 минут</strong>. Если вы не запрашивали его — просто проигнорируйте это письмо.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#faf9f5;border-top:1px solid #e8e6df;padding:18px 32px;">
              <p style="margin:0;font-size:12px;color:#8a8779;line-height:1.5;">
                Это автоматическое письмо от TaskFlow. На него не нужно отвечать.
              </p>
            </td>
          </tr>
        </table>

        <p style="margin:16px 0 0 0;font-size:11px;color:#8a8779;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          © TaskFlow · Kanban для команд
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
