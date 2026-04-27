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

function readOptionalPublicAsset(...filenames: string[]): Buffer | null {
	const fullPath = resolveOptionalAssetPath(...filenames)
	return fullPath ? fs.readFileSync(fullPath) : null
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
		gestmed: readOptionalPublicAsset(
			LOGO_FILES.gestmed.pdf.filename,
			LOGO_FILES.gestmed.email.filename,
		),
		hamilton: readOptionalPublicAsset(
			LOGO_FILES.hamilton.pdf.filename,
			LOGO_FILES.hamilton.email.filename,
		),
	}
}

export function getOptionalPdfLogos() {
	return getPdfLogos()
}

export function getEmailLogos() {
	const baseUrl = getEmailAssetsBaseUrl()
	const gestmedPath = resolveOptionalAssetPath(LOGO_FILES.gestmed.email.filename)
	const hamiltonPath = resolveOptionalAssetPath(LOGO_FILES.hamilton.email.filename)

	return {
		gestmed:
			baseUrl && gestmedPath
				? `${baseUrl}/public-assets/${LOGO_FILES.gestmed.email.filename}`
				: null,
		hamilton:
			baseUrl && hamiltonPath
				? `${baseUrl}/public-assets/${LOGO_FILES.hamilton.email.filename}`
				: null,
	}
}

export function getEmailLogoAttachments() {
	const gestmed = readOptionalPublicAsset(LOGO_FILES.gestmed.email.filename)
	const hamilton = readOptionalPublicAsset(LOGO_FILES.hamilton.email.filename)

	return {
		gestmed: gestmed
			? {
					filename: LOGO_FILES.gestmed.email.filename,
					contentType: LOGO_FILES.gestmed.email.mimeType,
					content: gestmed.toString('base64'),
					contentId: 'gestmed-logo',
				}
			: null,
		hamilton: hamilton
			? {
					filename: LOGO_FILES.hamilton.email.filename,
					contentType: LOGO_FILES.hamilton.email.mimeType,
					content: hamilton.toString('base64'),
					contentId: 'hamilton-logo',
				}
			: null,
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
