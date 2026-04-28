type EvolutionSendTextPayload = {
	number: string
	text: string
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
	await sendWhatsAppText(params.whatsapp, params.message)
}

export async function sendNewExamWhatsApp(params: {
	whatsapp?: string | null
	message: string
}): Promise<void> {
	await sendWhatsAppText(params.whatsapp, params.message)
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
		'Guarde este documento em local seguro.',
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

async function sendWhatsAppText(
	whatsapp: string | null | undefined,
	text: string,
): Promise<void> {
	const config = getEvolutionConfig()
	const number = normalizeWhatsappNumber(whatsapp)

	if (!number || !config) return

	const response = await fetch(
		`${config.apiUrl}/message/sendText/${config.instanceName}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				apikey: config.apiKey,
			},
			body: JSON.stringify({
				number,
				text,
			} satisfies EvolutionSendTextPayload),
		},
	)

	if (!response.ok) {
		const details = await response.text().catch(() => '')
		throw new Error(
			`Evolution API failed with status ${response.status}${
				details ? `: ${details}` : ''
			}`,
		)
	}
}

function getEvolutionConfig() {
	const apiUrl = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '')
	const apiKey = process.env.EVOLUTION_API_KEY?.trim()
	const instanceName = process.env.EVOLUTION_INSTANCE_NAME?.trim()

	if (!apiUrl || !apiKey || !instanceName) return null

	return { apiUrl, apiKey, instanceName }
}

function normalizeWhatsappNumber(value: string | null | undefined): string | null {
	const digits = value?.replace(/\D/g, '')
	if (!digits) return null

	const defaultCountryCode =
		process.env.EVOLUTION_DEFAULT_COUNTRY_CODE?.replace(/\D/g, '') ?? '55'

	if (
		defaultCountryCode &&
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
