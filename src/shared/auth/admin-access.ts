import { AdminProfile } from '@prisma/client'

export const adminScreens = [
	'dashboard',
	'patients',
	'exams',
	'logs',
	'admins',
] as const

export type AdminScreen = (typeof adminScreens)[number]

export const adminProfileScreens: Record<AdminProfile, AdminScreen[]> = {
	SUPER_ADMIN: [...adminScreens],
	ADMIN: ['exams'],
	RECEPCAO: ['patients'],
	GESTOR: [...adminScreens.filter((screen) => screen !== 'admins')],
}

export function getScreensForProfile(profile: AdminProfile): AdminScreen[] {
	return adminProfileScreens[profile]
}

export function profileCanAccessScreen(
	profile: AdminProfile,
	screen: AdminScreen,
) {
	return adminProfileScreens[profile].includes(screen)
}
