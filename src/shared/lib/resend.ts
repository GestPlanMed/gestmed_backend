import { Resend } from 'resend'
import type { CreateEmailOptions, CreateEmailResponse } from 'resend'
import { getEmailLogoAttachments, getEmailLogos } from './branding'

const emailLogos = getEmailLogos()
const AMPARO_LOGO_CID = 'amparo-logo'
const defaultFromName = 'Amparo Exames'
const EMAIL_LOGO_WIDTH = 82
const EMAIL_LOGO_FALLBACK_FONT_SIZE = 13
const emailLogoStyle = `display:inline-block;width:${EMAIL_LOGO_WIDTH}px;max-width:100%;height:auto`

type InlineEmailAttachment = NonNullable<
	CreateEmailOptions['attachments']
>[number] & {
	content_id?: string
}
function getResendClient(): Resend {
	const apiKey = process.env.RESEND_API_KEY?.trim()

	if (!apiKey) {
		throw new Error('RESEND_API_KEY is not configured')
	}

	return new Resend(apiKey)
}

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

function stripEnvQuotes(value: string): string {
	return value.replace(/^["']|["']$/g, '')
}

function normalizeRecipientEmail(email: string): string {
	return stripEnvQuotes(email.trim().toLowerCase())
}

function getResendFrom(): string {
	const from = stripEnvQuotes(process.env.RESEND_FROM_EMAIL?.trim() ?? '')

	if (!from) {
		throw new Error('RESEND_FROM_EMAIL is not configured')
	}

	if (from.includes('@')) {
		return from
	}

	return `${defaultFromName} <notificacoes@${from}>`
}

function getAdminPanelUrl(): string {
	const panelUrl = stripEnvQuotes(process.env.ADMIN_PANEL_URL?.trim() ?? '')

	if (panelUrl) {
		return panelUrl.replace(/\/$/, '')
	}

	const resetPasswordUrl = stripEnvQuotes(
		process.env.ADMIN_RESET_PASSWORD_URL?.trim() ?? '',
	)

	if (resetPasswordUrl) {
		return new URL(resetPasswordUrl).origin
	}

	throw new Error(
		'ADMIN_PANEL_URL ou ADMIN_RESET_PASSWORD_URL is not configured',
	)
}

function formatResendError(error: NonNullable<CreateEmailResponse['error']>): string {
	const details = [error.message]

	if ('statusCode' in error && typeof error.statusCode === 'number') {
		details.unshift(`HTTP ${error.statusCode}`)
	}

	if (error.name) {
		details.unshift(error.name)
	}

	return details.join(' - ')
}

async function sendEmail(
	payload: CreateEmailOptions,
): Promise<NonNullable<CreateEmailResponse['data']>> {
	const normalizedPayload: CreateEmailOptions = {
		...payload,
		to: Array.isArray(payload.to)
			? payload.to.map((email) => normalizeRecipientEmail(String(email)))
			: normalizeRecipientEmail(String(payload.to)),
	}

	const { data, error } = await getResendClient().emails.send(normalizedPayload)

	if (error) {
		throw new Error(
			`Falha ao enviar e-mail via Resend: ${formatResendError(error)}`,
		)
	}

	if (!data) {
		throw new Error('Falha ao enviar e-mail via Resend: resposta vazia')
	}

	return data
}

function buildLogoSection(): {
	markup: string
	attachment: InlineEmailAttachment | null
} {
	const logoAttachment = getEmailLogoAttachments().amparo

	if (logoAttachment) {
		return {
			markup: `
              <div style="text-align:center;margin:0 0 24px">
                <img
                  src="cid:${AMPARO_LOGO_CID}"
                  alt="Amparo Exames"
                  width="${EMAIL_LOGO_WIDTH}"
                  style="${emailLogoStyle}"
                />
              </div>
            `,
			attachment: {
				filename: logoAttachment.filename,
				content: logoAttachment.content,
				content_type: logoAttachment.contentType,
				content_id: logoAttachment.contentId,
			},
		}
	}

	if (emailLogos.amparo) {
		return {
			markup: `
              <div style="text-align:center;margin:0 0 24px">
                <img
                  src="${escapeHtml(emailLogos.amparo)}"
                  alt="Amparo Exames"
                  width="${EMAIL_LOGO_WIDTH}"
                  style="${emailLogoStyle}"
                />
              </div>
            `,
			attachment: null,
		}
	}

	return {
		markup: `
              <div style="text-align:center;margin:0 0 24px">
                <div style="font-size:${EMAIL_LOGO_FALLBACK_FONT_SIZE}px;font-weight:700;letter-spacing:0;color:#111827">
                  Amparo Exames
                </div>
              </div>
            `,
		attachment: null,
	}
}

function buildFallbackLinkHelper(link: string): string {
	const safeLink = escapeHtml(link)

	return (
		'Se o botão não funcionar, copie e cole este link no navegador:<br />' +
		`<a href="${safeLink}" style="display:inline-block;margin-top:8px;color:#1f2937;font-size:13px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;text-decoration:underline">${safeLink}</a>`
	)
}

function buildEmailTemplate({
	title,
	intro,
	buttonLabel,
	buttonUrl,
	helperText,
	helperHtml,
}: EmailTemplateParams): {
	html: string
	attachments?: InlineEmailAttachment[]
} {
	const safeTitle = escapeHtml(title)
	const safeIntro = escapeHtml(intro)
	const safeButtonLabel = buttonLabel ? escapeHtml(buttonLabel) : null
	const safeButtonUrl = buttonUrl ? escapeHtml(buttonUrl) : null
	const helperMarkup = helperHtml ?? escapeHtml(helperText ?? '')
	const { markup: logoMarkup, attachment: logoAttachment } = buildLogoSection()

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

	return {
		html: `
      <div style="margin:0;padding:40px 16px;background:#f4f6f8;font-family:Arial,sans-serif;color:#111827">
        <div style="max-width:560px;margin:0 auto">
          <div style="background:#ffffff;border:1px solid #d9dee5;border-radius:16px;overflow:hidden">
            <div style="padding:30px">
              ${logoMarkup}
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
              <div style="padding:18px 20px;border:1px solid #d9dee5;border-radius:10px;background:#f9fafb;overflow:hidden">
                <p style="margin:0;font-size:14px;line-height:1.75;color:#374151;word-break:break-word">
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
    `,
		attachments: logoAttachment ? [logoAttachment] : undefined,
	}
}

export async function sendMagicLink(
	email: string,
	link: string,
): Promise<void> {
	const template = buildEmailTemplate({
		title: 'Acesse o painel administrativo',
		intro:
			'Recebemos uma solicitação de acesso para a área administrativa. Use o botão abaixo para entrar com segurança.',
		buttonLabel: 'Acessar painel',
		buttonUrl: link,
		helperHtml: buildFallbackLinkHelper(link),
	})

	await sendEmail({
		from: getResendFrom(),
		to: email,
		subject: 'Seu link de acesso - Amparo Exames',
		html: template.html,
		attachments: template.attachments,
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
	const template = buildEmailTemplate({
		title: 'Redefina sua senha',
		intro:
			'Recebemos uma solicitação para redefinir a senha da área administrativa. Para continuar, clique no botão abaixo.',
		buttonLabel: 'Redefinir senha',
		buttonUrl: link,
		helperHtml: buildFallbackLinkHelper(link),
	})

	await sendEmail({
		from: getResendFrom(),
		to: email,
		subject: 'Recuperação de senha - Amparo Exames',
		html: template.html,
		attachments: template.attachments,
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
	const panelUrl = getAdminPanelUrl()
	const template = buildEmailTemplate({
		title: 'Sua conta administrativa foi criada',
		intro: `Olá, ${escapeHtml(name)}. Seu acesso ao painel administrativo foi liberado.`,
		buttonLabel: 'Acessar painel',
		buttonUrl: panelUrl,
		helperHtml:
			`Use o e-mail <a href="mailto:${safeEmail}" style="color:#1f2937;font-weight:700">${safeEmail}</a> ` +
			`e a senha provisória <strong style="color:#111827">${safePassword}</strong> para entrar. ` +
			'Por segurança, recomendamos alterar essa senha no primeiro acesso.',
	})

	await sendEmail({
		from: getResendFrom(),
		to: email,
		subject: 'Seu acesso administrativo - Amparo Exames',
		html: template.html,
		attachments: template.attachments,
		text:
			`Olá, ${name}.\n\n` +
			'Sua conta administrativa foi criada.\n' +
			`E-mail: ${email}\n` +
			`Senha provisória: ${password}\n` +
			`Acesse o painel: ${panelUrl}\n\n` +
			'Recomendamos alterar essa senha no primeiro acesso.',
	})
}
