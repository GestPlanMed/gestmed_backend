import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import type { AdminProfile } from '@prisma/client'
import { getScreensForProfile } from '../../../shared/auth/admin-access'
import { AppError } from '../../../shared/errors/app-error'
import { prisma } from '../../../shared/lib/prisma'
import { sendAdminPasswordResetEmail } from '../../../shared/lib/resend'

const PASSWORD_RESET_TTL_MINUTES = 15

function hashResetToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex')
}

export async function loginAdmin(
	email: string,
	password: string,
): Promise<{ id: string; profile: AdminProfile }> {
	const admin = await prisma.admin.findUnique({ where: { email } })
	if (!admin) throw new AppError('E-mail ou senha incorretos', 401)

	const passwordMatch = await bcrypt.compare(password, admin.password)
	if (!passwordMatch) throw new AppError('E-mail ou senha incorretos', 401)

	return {
		id: admin.id,
		profile: admin.profile,
	}
}

export async function getAdminSession(adminId: string) {
	const admin = await prisma.admin.findUnique({
		where: { id: adminId },
		select: {
			id: true,
			name: true,
			email: true,
			profile: true,
		},
	})

	if (!admin) {
		throw new AppError('Administrador nao encontrado', 404)
	}

	return {
		...admin,
		screens: getScreensForProfile(admin.profile),
	}
}

export async function forgotAdminPassword(email: string): Promise<void> {
	const admin = await prisma.admin.findUnique({ where: { email } })
	if (!admin) return

	const baseUrl =
		process.env.ADMIN_RESET_PASSWORD_URL ?? process.env.MAGIC_LINK_BASE_URL
	if (!baseUrl) {
		throw new AppError(
			'ADMIN_RESET_PASSWORD_URL ou MAGIC_LINK_BASE_URL nao configurada',
			500,
		)
	}

	const rawToken = crypto.randomBytes(32).toString('hex')
	const hashedToken = hashResetToken(rawToken)
	const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000)

	await prisma.admin.update({
		where: { id: admin.id },
		data: {
			passwordResetToken: hashedToken,
			passwordResetExpiresAt: expiresAt,
		},
	})

	const resetUrl = new URL(baseUrl)
	resetUrl.searchParams.set('token', rawToken)

	await sendAdminPasswordResetEmail(admin.email, resetUrl.toString())
}

export async function resetAdminPassword(
	token: string,
	password: string,
): Promise<void> {
	const hashedToken = hashResetToken(token)

	const admin = await prisma.admin.findFirst({
		where: {
			passwordResetToken: hashedToken,
			passwordResetExpiresAt: {
				gt: new Date(),
			},
		},
	})

	if (!admin) {
		throw new AppError('Token de recuperacao invalido ou expirado', 400)
	}

	const passwordHash = await bcrypt.hash(password, 10)

	await prisma.admin.update({
		where: { id: admin.id },
		data: {
			password: passwordHash,
			passwordResetToken: null,
			passwordResetExpiresAt: null,
		},
	})
}
