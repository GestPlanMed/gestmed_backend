import PDFDocument from 'pdfkit'
import { getOptionalPdfLogos } from './branding'
import { buildPatientCredentialsMessage } from './whatsapp'

interface PatientCredentials {
	name: string
	cpf: string
	password: string
	accessUrl: string
}

export function generateCredentialsPDF(
	data: PatientCredentials,
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', margin: 60 })
		const logos = getOptionalPdfLogos()
		const accessUrl = normalizeAccessUrl(data.accessUrl)
		const chunks: Buffer[] = []

		doc.on('data', (chunk: Buffer) => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.on('error', reject)

		const topY = doc.y
		const logoWidth = 120

		if (logos.amparo) {
			doc.image(logos.amparo, (doc.page.width - logoWidth) / 2, topY, {
				width: logoWidth,
			})
		} else {
			doc
				.fontSize(18)
				.font('Helvetica-Bold')
				.fillColor('#A87A3C')
				.text('Amparo Exames', {
					align: 'center',
					width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
				})
		}

		doc.x = doc.page.margins.left
		doc.y = topY + 100
		doc
			.fillColor('#111111')
			.fontSize(13)
			.font('Helvetica')
			.text('Guia de acesso aos seus exames', {
				align: 'center',
				width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
			})
			.moveDown(2)

		doc.x = doc.page.margins.left
		doc
			.fontSize(14)
			.font('Helvetica-Bold')
			.text('Seus dados de acesso:')
			.moveDown(0.8)

		doc
			.fontSize(13)
			.font('Helvetica')
			.text(`Nome:  ${data.name}`)
			.moveDown(0.4)
			.text(`CPF:   ${formatCpf(data.cpf)}`)
			.moveDown(0.4)
			.text(`Senha: ${data.password}`)
			.moveDown(2)

		doc
			.fontSize(14)
			.font('Helvetica-Bold')
			.text('Como acessar seus exames:')
			.moveDown(0.8)

		doc
			.fontSize(12)
			.font('Helvetica')
			.text('1.  Abra um navegador de internet no seu celular ou computador.')
			.moveDown(0.4)
			.text(`2.  Acesse o endereço: ${accessUrl}`)
			.moveDown(0.4)
			.text('3.  Digite seu CPF (somente os números, sem pontos ou traços).')
			.moveDown(0.4)
			.text('4.  Digite a senha indicada acima.')
			.moveDown(0.4)
			.text('5.  Clique em "Entrar" para visualizar seus exames.')
			.moveDown(2.5)

		doc
			.fontSize(11)
			.fillColor('#555555')
			.text('Guarde este documento em local seguro.', { align: 'center' })
			.moveDown(0.3)
			.text('Em caso de dúvidas, entre em contato com a clínica.', {
				align: 'center',
			})

		doc.end()
	})
}

export function generateCredentialsText(data: PatientCredentials): string {
	return buildPatientCredentialsMessage({
		...data,
		accessUrl: normalizeAccessUrl(data.accessUrl),
	})
}

function formatCpf(cpf: string): string {
	return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

function normalizeAccessUrl(accessUrl: string): string {
	const value = accessUrl.trim()
	if (!value || value === '*') {
		return 'Não informado'
	}

	return value
}
