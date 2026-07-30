import fs from 'fs'
import path from 'path'

const publicDirCandidates = [
	path.resolve(process.cwd(), 'public'),
	path.resolve(__dirname, '../../../public'),
	path.resolve(__dirname, '../../../../public'),
]
const LOGO_FILES = {
	amparo: {
		pdf: { filename: 'logo.png', mimeType: 'image/png' },
		email: {
			filename: 'logo_email.png',
			alternatives: ['logo_ham_email.png'],
			mimeType: 'image/png',
		},
	},
} as const

const AMPARO_EMAIL_LOGO_FILENAMES = [
	LOGO_FILES.amparo.email.filename,
	...LOGO_FILES.amparo.email.alternatives,
] as const

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
		process.env.TRAEFIK_HOST
			? `https://${process.env.TRAEFIK_HOST.trim()}`
			: undefined,
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
		amparo: readOptionalPublicAsset(
			LOGO_FILES.amparo.pdf.filename,
			...AMPARO_EMAIL_LOGO_FILENAMES,
		),
	}
}

export function getOptionalPdfLogos() {
	return getPdfLogos()
}

export function getEmailLogos() {
	const baseUrl = getEmailAssetsBaseUrl()
	const amparoPath = resolveOptionalAssetPath(...AMPARO_EMAIL_LOGO_FILENAMES)

	return {
		amparo:
			baseUrl && amparoPath
				? `${baseUrl}/public-assets/${LOGO_FILES.amparo.email.filename}`
				: null,
	}
}

export function getWhatsAppLogoImage(): string | null {
	const logoUrl = getEmailLogos().amparo
	if (logoUrl) return logoUrl

	const logoContent = readOptionalPublicAsset(...AMPARO_EMAIL_LOGO_FILENAMES)
	if (!logoContent) return null

	return `data:${LOGO_FILES.amparo.email.mimeType};base64,${logoContent.toString('base64')}`
}

export function getEmailLogoAttachments() {
	const amparoPath = resolveOptionalAssetPath(...AMPARO_EMAIL_LOGO_FILENAMES)
	const amparo = readOptionalPublicAsset(...AMPARO_EMAIL_LOGO_FILENAMES)

	return {
		amparo:
			amparo && amparoPath
				? {
						filename: path.basename(amparoPath),
						contentType: LOGO_FILES.amparo.email.mimeType,
						content: amparo.toString('base64'),
						contentId: 'amparo-logo',
					}
				: null,
	}
}

export function getPublicAssets() {
	const assets: Record<string, { path: string; contentType: string }> = {}

	addPublicAsset(
		assets,
		'logo.png',
		LOGO_FILES.amparo.pdf.mimeType,
		LOGO_FILES.amparo.pdf.filename,
		LOGO_FILES.amparo.email.filename,
	)
	addPublicAsset(
		assets,
		'logo_email.png',
		LOGO_FILES.amparo.email.mimeType,
		...AMPARO_EMAIL_LOGO_FILENAMES,
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
