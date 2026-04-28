const PATIENT_ACCESS_PATH = '/patient'

export function getPatientAccessUrl(): string {
	const accessUrl = process.env.PATIENT_ACCESS_URL!
	const trimmedAccessUrl = accessUrl.trim()

	if (!trimmedAccessUrl || trimmedAccessUrl === '*') {
		return trimmedAccessUrl
	}

	try {
		const url = new URL(trimmedAccessUrl)
		const pathname = url.pathname.replace(/\/+$/, '')

		if (pathname.endsWith(PATIENT_ACCESS_PATH)) {
			return url.toString()
		}

		url.pathname = `${pathname}${PATIENT_ACCESS_PATH}`
		return url.toString()
	} catch {
		const baseUrl = trimmedAccessUrl.replace(/\/+$/, '')
		return baseUrl.endsWith(PATIENT_ACCESS_PATH)
			? baseUrl
			: `${baseUrl}${PATIENT_ACCESS_PATH}`
	}
}
