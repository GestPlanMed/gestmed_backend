import { Resend } from 'resend'
import { getEmailLogos } from './branding'

const resend = new Resend(process.env.RESEND_API_KEY)
const emailLogos = getEmailLogos()
const defaultFromName = 'Amparo Exames'

type EmailTemplateParams = {
	title: string
	intro: string
	buttonLabel?: string
	buttonUrl?: string
	helperText: string
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function getResendFrom(): string {
	const from = process.env.RESEND_FROM_EMAIL?.trim()

	if (!from) {
		throw new Error('RESEND_FROM_EMAIL is not configured')
	}

	if (from.includes('@')) {
		return from
	}

	return `${defaultFromName} <noreply@${from}>`
}

function buildEmailTemplate({
	title,
	intro,
	buttonLabel,
	buttonUrl,
	helperText,
}: EmailTemplateParams): string {
	const safeTitle = escapeHtml(title)
	const safeIntro = escapeHtml(intro)
	const safeButtonLabel = buttonLabel ? escapeHtml(buttonLabel) : null
	const safeButtonUrl = buttonUrl ? escapeHtml(buttonUrl) : null
	const safeHelperText = escapeHtml(helperText)
	const logoMarkup = emailLogos.gestmed
		? `
          <img
            src="${escapeHtml(emailLogos.gestmed)}"
            alt="GestMed Exames"
            width="156"
            style="display:block;width:156px;max-width:100%;height:auto;margin:0 auto 24px"
          />
        `
		: `
          <div style="text-align:center;font-size:24px;font-weight:800;letter-spacing:0.04em;color:#0f172a;margin-bottom:24px">
            GestMed Exames
          </div>
        `

	const buttonMarkup =
		safeButtonLabel && safeButtonUrl
			? `
              <div style="margin:0 0 24px">
                <a
                  href="${safeButtonUrl}"
                  style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700"
                >
                  ${safeButtonLabel}
                </a>
              </div>
            `
			: ''

	return `
      <div style="margin:0;padding:32px 16px;background:#f3f7fb;font-family:Arial,sans-serif;color:#0f172a">
        <div style="max-width:560px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);border-radius:24px;padding:32px 28px 20px">
            ${logoMarkup}
            <div style="background:#ffffff;border-radius:20px;padding:32px 28px;box-shadow:0 18px 50px rgba(15,23,42,0.14)">
              <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase">
                Acesso seguro
              </div>
              <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.2;color:#0f172a">
                ${safeTitle}
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#334155">
                ${safeIntro}
              </p>
              ${buttonMarkup}
              <div style="padding:16px 18px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff">
                <p style="margin:0;font-size:14px;line-height:1.7;color:#475569">
                  ${safeHelperText}
                </p>
              </div>
            </div>
          </div>
          <p style="margin:18px auto 0;max-width:520px;text-align:center;font-size:12px;line-height:1.6;color:#64748b">
            Se você não reconhece esta solicitação, ignore este e-mail. Para sua segurança, este link expira em <strong>15 minutos</strong>.
          </p>
        </div>
      </div>
    `
}

export async function sendMagicLink(
	email: string,
	link: string,
): Promise<void> {
	await resend.emails.send({
		from: getResendFrom(),
		to: email,
		subject: 'Seu link de acesso - GestMed Exames',
		html: buildEmailTemplate({
			title: 'Acesse o painel administrativo',
			intro:
				'Recebemos uma solicitação de acesso para a área administrativa. Use o botão abaixo para entrar com segurança.',
			buttonLabel: 'Acessar painel',
			buttonUrl: link,
			helperText:
				'Se o botão não abrir, copie e cole este link no navegador: ' + link,
		}),
		text:
			`Acesse o painel administrativo pelo link: ${link}\n\n` +
			'Recebemos uma solicitação de acesso para a área administrativa.\n' +
			'Este link expira em 15 minutos.\n' +
			'Se você não solicitou este acesso, ignore este e-mail.',
	})
}

export async function sendAdminPasswordResetEmail(
	email: string,
	link: string,
): Promise<void> {
	await resend.emails.send({
		from: getResendFrom(),
		to: email,
		subject: 'Recuperação de senha - GestMed Exames',
		html: buildEmailTemplate({
			title: 'Redefina sua senha',
			intro:
				'Recebemos uma solicitação para redefinir a senha da área administrativa. Para continuar, clique no botão abaixo.',
			buttonLabel: 'Redefinir senha',
			buttonUrl: link,
			helperText:
				'Se o botão não funcionar, copie e cole este link no navegador: ' + link,
		}),
		text:
			`Redefina sua senha pelo link: ${link}\n\n` +
			'Recebemos uma solicitação para redefinir a senha da área administrativa.\n' +
			'Este link expira em 15 minutos.\n' +
			'Se você não solicitou esta alteração, ignore este e-mail.',
	})
}

export async function sendAdminWelcomeEmail(
	email: string,
	name: string,
	password: string,
): Promise<void> {
	await resend.emails.send({
		from: getResendFrom(),
		to: email,
		subject: 'Seu acesso administrativo - GestMed Exames',
		html: buildEmailTemplate({
			title: 'Sua conta administrativa foi criada',
			intro: `Ola, ${name}. Seu acesso ao painel administrativo foi liberado.`,
			helperText:
				`Use o e-mail ${email} e a senha provisoria ${password} para entrar. ` +
				'Por seguranca, recomendamos alterar essa senha no primeiro acesso.',
		}),
		text:
			`Ola, ${name}.\n\n` +
			'Sua conta administrativa foi criada.\n' +
			`E-mail: ${email}\n` +
			`Senha provisoria: ${password}\n\n` +
			'Recomendamos alterar essa senha no primeiro acesso.',
	})
}
