import { randomBytes } from 'crypto'
import { Prisma, type AdminProfile } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getScreensForProfile } from '../../shared/auth/admin-access'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/lib/prisma'
import { sendAdminWelcomeEmail } from '../../shared/lib/resend'
import type { CreateAdminInput, UpdateAdminInput } from './admin.schema'

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(length = 10): string {
	return Array.from(randomBytes(length))
		.map((byte) => PASSWORD_CHARS[byte % PASSWORD_CHARS.length])
		.join('')
}

function buildAdminSelect() {
	return {
		id: true,
		name: true,
		email: true,
		profile: true,
		createdAt: true,
	} as const
}

function withScreens<T extends { profile: AdminProfile }>(admin: T) {
	return {
		...admin,
		screens: getScreensForProfile(admin.profile),
	}
}

function handleUniqueError(error: unknown): never {
	if (
		error instanceof Prisma.PrismaClientKnownRequestError &&
		error.code === 'P2002'
	) {
		throw new AppError('E-mail ja cadastrado', 409)
	}

	throw error
}

export async function createAdmin(data: CreateAdminInput) {
	const rawPassword = generatePassword()
	const passwordHash = await bcrypt.hash(rawPassword, 10)

	try {
		const admin = await prisma.admin.create({
			data: {
				name: data.name,
				email: data.email,
				password: passwordHash,
				profile: data.profile,
			},
			select: buildAdminSelect(),
		})

		await sendAdminWelcomeEmail(admin.email, admin.name, rawPassword)

		return {
			admin: withScreens(admin),
			rawPassword,
		}
	} catch (error) {
		handleUniqueError(error)
	}
}

export async function listAdmins() {
	const admins = await prisma.admin.findMany({
		select: buildAdminSelect(),
		orderBy: [{ profile: 'asc' }, { name: 'asc' }],
	})

	return admins.map(withScreens)
}

export async function getAdmin(id: string) {
	const admin = await prisma.admin.findUnique({
		where: { id },
		select: buildAdminSelect(),
	})

	if (!admin) {
		throw new AppError('Administrador nao encontrado', 404)
	}

	return withScreens(admin)
}

export async function updateAdmin(id: string, data: UpdateAdminInput) {
	const existingAdmin = await prisma.admin.findUnique({
		where: { id },
		select: { id: true },
	})

	if (!existingAdmin) {
		throw new AppError('Administrador nao encontrado', 404)
	}

	try {
		const admin = await prisma.admin.update({
			where: { id },
			data: {
				...(data.name ? { name: data.name } : {}),
				...(data.email ? { email: data.email } : {}),
				...(data.profile ? { profile: data.profile } : {}),
				...(data.password
					? { password: await bcrypt.hash(data.password, 10) }
					: {}),
			},
			select: buildAdminSelect(),
		})

		return withScreens(admin)
	} catch (error) {
		handleUniqueError(error)
	}
}

export async function deleteAdmin(id: string, actorAdminId: string) {
	if (id === actorAdminId) {
		throw new AppError('Nao e permitido excluir o proprio usuario', 400)
	}

	const admin = await prisma.admin.findUnique({
		where: { id },
		select: buildAdminSelect(),
	})

	if (!admin) {
		throw new AppError('Administrador nao encontrado', 404)
	}

	await prisma.admin.delete({ where: { id } })

	return withScreens(admin)
}
