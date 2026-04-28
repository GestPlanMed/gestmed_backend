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
	helperText?: string
	helperHtml?: string
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
	helperHtml,
}: EmailTemplateParams): string {
	const safeTitle = escapeHtml(title)
	const safeIntro = escapeHtml(intro)
	const safeButtonLabel = buttonLabel ? escapeHtml(buttonLabel) : null
	const safeButtonUrl = buttonUrl ? escapeHtml(buttonUrl) : null
	const helperMarkup = helperHtml ?? escapeHtml(helperText ?? '')
	const logoMarkup = emailLogos.gestmed
		? `
          <img
            src="${escapeHtml(emailLogos.gestmed)}"
            alt="Amparo Exames"
            width="136"
            style="display:block;width:136px;max-width:100%;height:auto;margin:0"
          />
        `
		: `
          <div style="font-size:22px;font-weight:700;letter-spacing:0;color:#111827">
            Amparo Exames
          </div>
        `

	const buttonMarkup =
		safeButtonLabel && safeButtonUrl
			? `
              <div style="margin:0 0 24px">
                <a
                  href="${safeButtonUrl}"
                  style="display:inline-block;background:#1f2937;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700"
                >
                  ${safeButtonLabel}
                </a>
              </div>
            `
			: ''

	return `
      <div style="margin:0;padding:40px 16px;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827">
        <div style="max-width:560px;margin:0 auto">
          <div style="background:#ffffff;border:1px solid #d9dee5;border-radius:16px;overflow:hidden">
            <div style="padding:28px 30px 22px;border-bottom:1px solid #e5e7eb">
              ${logoMarkup}
            </div>
            <div style="padding:30px">
              <div style="display:inline-block;margin:0 0 16px;padding:5px 10px;border:1px solid #cbd5e1;border-radius:999px;color:#475569;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">
                Acesso seguro
              </div>
              <h1 style="margin:0 0 12px;font-size:26px;line-height:1.24;color:#111827;font-weight:800">
                ${safeTitle}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.65;color:#374151">
                ${safeIntro}
              </p>
              ${buttonMarkup}
              <div style="padding:18px 20px;border:1px solid #d9dee5;border-radius:10px;background:#f9fafb">
                <p style="margin:0;font-size:14px;line-height:1.75;color:#374151">
                  ${helperMarkup}
                </p>
              </div>
            </div>
          </div>
          <p style="margin:16px auto 0;max-width:500px;text-align:center;font-size:12px;line-height:1.6;color:#64748b">
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
		subject: 'Seu link de acesso - Amparo Exames',
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
		subject: 'Recuperação de senha - Amparo Exames',
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
	const safeEmail = escapeHtml(email)
	const safePassword = escapeHtml(password)

	await resend.emails.send({
		from: getResendFrom(),
		to: email,
		subject: 'Seu acesso administrativo - Amparo Exames',
		html: buildEmailTemplate({
			title: 'Sua conta administrativa foi criada',
			intro: `Olá, ${name}. Seu acesso ao painel administrativo foi liberado.`,
			helperHtml:
				`Use o e-mail <a href="mailto:${safeEmail}" style="color:#1f2937;font-weight:700">${safeEmail}</a> ` +
				`e a senha provisória <strong style="color:#111827">${safePassword}</strong> para entrar. ` +
				'Por segurança, recomendamos alterar essa senha no primeiro acesso.',
		}),
		text:
			`Olá, ${name}.\n\n` +
			'Sua conta administrativa foi criada.\n' +
			`E-mail: ${email}\n` +
			`Senha provisória: ${password}\n\n` +
			'Recomendamos alterar essa senha no primeiro acesso.',
	})
}
