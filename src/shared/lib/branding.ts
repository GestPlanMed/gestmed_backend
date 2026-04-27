import fs from 'fs'
import path from 'path'

const publicDirCandidates = [
	path.resolve(process.cwd(), 'public'),
	path.resolve(__dirname, '../../../public'),
	path.resolve(__dirname, '../../../../public'),
]
const LOGO_FILES = {
	gestmed: {
		pdf: { filename: 'logo.png', mimeType: 'image/png' },
		email: { filename: 'logo_email.png', mimeType: 'image/png' },
	},
	hamilton: {
		pdf: { filename: 'logo_ham.png', mimeType: 'image/png' },
		email: { filename: 'logo_ham_email.png', mimeType: 'image/png' },
		web: { filename: 'logo_ham.webp', mimeType: 'image/webp' },
	},
} as const

function resolveExistingAssetPath(...filenames: string[]): string {
	const fullPath = resolveOptionalAssetPath(...filenames)
	if (fullPath) return fullPath

	throw new Error(
		`Asset nao encontrado: ${filenames.join(', ')}. Diretórios verificados: ${publicDirCandidates.join(', ')}`,
	)
}

function resolveOptionalAssetPath(...filenames: string[]): string | null {
	for (const publicDir of publicDirCandidates) {
		for (const filename of filenames) {
			const fullPath = path.join(publicDir, filename)
			if (fs.existsSync(fullPath)) {
				return fullPath
			}
		}
	}

	return null
}

function readPublicAsset(...filenames: string[]): Buffer {
	return fs.readFileSync(resolveExistingAssetPath(...filenames))
}

function getEmailAssetsBaseUrl(): string | null {
	const candidates = [
		process.env.EMAIL_ASSETS_BASE_URL,
		process.env.API_PUBLIC_URL,
	]

	for (const value of candidates) {
		if (!value || value === '*') continue

		try {
			const origin = new URL(value).origin
			const hostname = new URL(origin).hostname

			if (hostname === '127.0.0.1' || hostname === 'localhost') {
				continue
			}

			return origin
		} catch {
			continue
		}
	}

	return null
}

export function getPdfLogos() {
	return {
		gestmed: readPublicAsset(
			LOGO_FILES.gestmed.pdf.filename,
			LOGO_FILES.gestmed.email.filename,
		),
		hamilton: readPublicAsset(
			LOGO_FILES.hamilton.pdf.filename,
			LOGO_FILES.hamilton.email.filename,
		),
	}
}

export function getOptionalPdfLogos() {
	const gestmedPath = resolveOptionalAssetPath(
		LOGO_FILES.gestmed.pdf.filename,
		LOGO_FILES.gestmed.email.filename,
	)
	const hamiltonPath = resolveOptionalAssetPath(
		LOGO_FILES.hamilton.pdf.filename,
		LOGO_FILES.hamilton.email.filename,
	)

	return {
		gestmed: gestmedPath ? fs.readFileSync(gestmedPath) : null,
		hamilton: hamiltonPath ? fs.readFileSync(hamiltonPath) : null,
	}
}

export function getEmailLogos() {
	const baseUrl = getEmailAssetsBaseUrl()

	return {
		gestmed: baseUrl
			? `${baseUrl}/public-assets/${LOGO_FILES.gestmed.email.filename}`
			: null,
		hamilton: baseUrl
			? `${baseUrl}/public-assets/${LOGO_FILES.hamilton.email.filename}`
			: null,
	}
}

export function getEmailLogoAttachments() {
	return {
		gestmed: {
			filename: LOGO_FILES.gestmed.email.filename,
			contentType: LOGO_FILES.gestmed.email.mimeType,
			content: readPublicAsset(LOGO_FILES.gestmed.email.filename).toString('base64'),
			contentId: 'gestmed-logo',
		},
		hamilton: {
			filename: LOGO_FILES.hamilton.email.filename,
			contentType: LOGO_FILES.hamilton.email.mimeType,
			content: readPublicAsset(LOGO_FILES.hamilton.email.filename).toString('base64'),
			contentId: 'hamilton-logo',
		},
	}
}

export function getPublicAssets() {
	const assets: Record<string, { path: string; contentType: string }> = {}

	addPublicAsset(
		assets,
		'logo.png',
		LOGO_FILES.gestmed.pdf.mimeType,
		LOGO_FILES.gestmed.pdf.filename,
		LOGO_FILES.gestmed.email.filename,
	)
	addPublicAsset(
		assets,
		'logo_ham.png',
		LOGO_FILES.hamilton.pdf.mimeType,
		LOGO_FILES.hamilton.pdf.filename,
		LOGO_FILES.hamilton.email.filename,
	)
	addPublicAsset(
		assets,
		'logo_email.png',
		LOGO_FILES.gestmed.email.mimeType,
		LOGO_FILES.gestmed.email.filename,
	)
	addPublicAsset(
		assets,
		'logo_ham_email.png',
		LOGO_FILES.hamilton.email.mimeType,
		LOGO_FILES.hamilton.email.filename,
	)
	addPublicAsset(
		assets,
		'logo_ham.webp',
		LOGO_FILES.hamilton.web.mimeType,
		LOGO_FILES.hamilton.web.filename,
	)

	return assets
}

function addPublicAsset(
	assets: Record<string, { path: string; contentType: string }>,
	publicFilename: string,
	contentType: string,
	...sourceFilenames: string[]
) {
	const assetPath = resolveOptionalAssetPath(...sourceFilenames)
	if (!assetPath) return

	assets[publicFilename] = {
		path: assetPath,
		contentType,
	}
}
