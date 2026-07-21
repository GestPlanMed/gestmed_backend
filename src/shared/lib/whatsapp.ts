import { getWhatsAppLogoImage } from './branding'

type ZApiSendTextPayload = {
	phone: string
	message: string
}

type ZApiSendImagePayload = {
	phone: string
	image: string
	caption: string
	viewOnce: boolean
}

type ZApiConfig = {
	instanceId: string
	token: string
	clientToken: string
}

type PatientCredentialsMessageParams = {
	name: string
	cpf: string
	password: string
	accessUrl: string
}

type NewExamMessageParams = {
	name: string
	examType: string
	examCount: number
	accessUrl: string
}

export async function sendPatientCredentialsWhatsApp(params: {
	whatsapp?: string | null
	message: string
}): Promise<void> {
	await sendWhatsAppMessage(params)
}

export async function sendNewExamWhatsApp(params: {
	whatsapp?: string | null
	message: string
}): Promise<void> {
	await sendWhatsAppMessage(params)
}

export function buildPatientCredentialsMessage({
	name,
	cpf,
	password,
	accessUrl,
}: PatientCredentialsMessageParams): string {
	return [
		'Guia de acesso aos seus exames',
		'',
		'Seus dados de acesso:',
		`Nome:  ${name}`,
		`CPF:   ${formatCpf(cpf)}`,
		`Senha: ${password}`,
		'',
		'Como acessar seus exames:',
		'1. Abra um navegador de internet no seu celular ou computador.',
		`2. Acesse o endereco: ${normalizeAccessUrl(accessUrl)}`,
		'3. Digite seu CPF (somente os numeros, sem pontos ou tracos).',
		'4. Digite a senha indicada acima.',
		'5. Clique em "Entrar" para visualizar seus exames.',
		'',
		'Em caso de duvidas, entre em contato com a clinica.',
	].join('\n')
}

export function buildNewExamMessage({
	name,
	examType,
	examCount,
	accessUrl,
}: NewExamMessageParams): string {
	const examLabel = examCount > 1 ? 'novos exames' : 'novo exame'
	const verb = examCount > 1 ? 'foram disponibilizados' : 'foi disponibilizado'

	return [
		`Olá, ${name}.`,
		'',
		`${examCount} ${examLabel} ${verb} para você no Amparo Exames.`,
		`Tipo: ${examType}`,
		'',
		`Acesse: ${normalizeAccessUrl(accessUrl)}`,
		'Entre com seu CPF e sua senha para visualizar seus exames.',
	].join('\n')
}

async function sendWhatsAppMessage(params: {
	whatsapp?: string | null
	message: string
}): Promise<void> {
	const logo = getWhatsAppLogoImage()

	if (logo) {
		await sendWhatsAppImage(params.whatsapp, logo, params.message)
		return
	}

	await sendWhatsAppText(params.whatsapp, params.message)
}

async function sendWhatsAppText(
	whatsapp: string | null | undefined,
	text: string,
): Promise<void> {
	const config = getZApiConfig()
	const phone = normalizeWhatsappNumber(whatsapp)

	if (!phone || !config) return

	await zApiRequest(config, 'send-text', {
		phone,
		message: text,
	} satisfies ZApiSendTextPayload)
}

async function sendWhatsAppImage(
	whatsapp: string | null | undefined,
	image: string,
	caption: string,
): Promise<void> {
	const config = getZApiConfig()
	const phone = normalizeWhatsappNumber(whatsapp)

	if (!phone || !config) return

	await zApiRequest(config, 'send-image', {
		phone,
		image,
		caption,
		viewOnce: false,
	} satisfies ZApiSendImagePayload)
}

async function zApiRequest(
	config: ZApiConfig,
	endpoint: string,
	body: unknown,
): Promise<void> {
	const response = await fetch(buildZApiUrl(config, endpoint), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Client-Token': config.clientToken,
		},
		body: JSON.stringify(body),
	})

	if (!response.ok) {
		const details = await response.text().catch(() => '')
		throw new Error(
			`Z-API failed with status ${response.status}${
				details ? `: ${details}` : ''
			}`,
		)
	}
}

function buildZApiUrl(config: ZApiConfig, endpoint: string): string {
	return `https://api.z-api.io/instances/${config.instanceId}/token/${config.token}/${endpoint}`
}

function getZApiConfig(): ZApiConfig | null {
	const instanceId = process.env.ZAPI_INSTANCE_ID?.trim()
	const token = process.env.ZAPI_INSTANCE_TOKEN?.trim()
	const clientToken = process.env.ZAPI_CLIENT_TOKEN?.trim()

	if (!instanceId || !token || !clientToken) return null

	return { instanceId, token, clientToken }
}

function normalizeWhatsappNumber(value: string | null | undefined): string | null {
	const digits = value?.replace(/\D/g, '')
	if (!digits) return null

	const defaultCountryCode = '55'

	if (
		(digits.length === 10 || digits.length === 11) &&
		!digits.startsWith(defaultCountryCode)
	) {
		return `${defaultCountryCode}${digits}`
	}

	return digits
}

function formatCpf(cpf: string): string {
	return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function normalizeAccessUrl(accessUrl: string): string {
	const value = accessUrl.trim()
	if (!value || value === '*') {
		return 'Nao informado'
	}

	return value
}
