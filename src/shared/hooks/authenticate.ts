import { AdminProfile } from '@prisma/client'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AdminScreen } from '../auth/admin-access'
import { profileCanAccessScreen } from '../auth/admin-access'
import { prisma } from '../lib/prisma'

async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
	try {
		await request.jwtVerify()
		return true
	} catch {
		reply.status(401).send({ message: 'Nao autorizado' })
		return false
	}
}

async function getAuthenticatedAdminProfile(
	request: FastifyRequest,
): Promise<AdminProfile | null> {
	const admin = await prisma.admin.findUnique({
		where: { id: request.user.sub },
		select: { profile: true },
	})

	return admin?.profile ?? null
}

export function requireAdminProfiles(allowedProfiles: AdminProfile[]) {
	return async function ensureAdminProfileAccess(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const authenticated = await verifyJwt(request, reply)
		if (!authenticated) return

		if (request.user.role !== 'admin') {
			return reply
				.status(403)
				.send({ message: 'Acesso restrito a administradores' })
		}

		const profile = await getAuthenticatedAdminProfile(request)
		if (!profile) {
			return reply.status(404).send({ message: 'Administrador nao encontrado' })
		}

		if (!allowedProfiles.includes(profile)) {
			return reply.status(403).send({
				message: 'Seu perfil nao possui permissao para esta acao',
			})
		}
	}
}

export const requireSuperAdmin = requireAdminProfiles([AdminProfile.SUPER_ADMIN])

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	await verifyJwt(request, reply)
}

export async function requireAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const authenticated = await verifyJwt(request, reply)
	if (!authenticated) return

	if (request.user.role !== 'admin') {
		return reply
			.status(403)
			.send({ message: 'Acesso restrito a administradores' })
	}
}

export async function requirePatient(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const authenticated = await verifyJwt(request, reply)
	if (!authenticated) return

	if (request.user.role !== 'patient') {
		return reply.status(403).send({ message: 'Acesso restrito a pacientes' })
	}
}

export function requireAdminScreen(screen: AdminScreen) {
	return async function ensureAdminScreenAccess(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const authenticated = await verifyJwt(request, reply)
		if (!authenticated) return

		if (request.user.role !== 'admin') {
			return reply
				.status(403)
				.send({ message: 'Acesso restrito a administradores' })
		}

		const profile = await getAuthenticatedAdminProfile(request)
		if (!profile) {
			return reply.status(404).send({ message: 'Administrador nao encontrado' })
		}

		if (!profileCanAccessScreen(profile, screen)) {
			return reply.status(403).send({
				message: 'Seu perfil nao possui acesso a esta tela',
			})
		}
	}
}

export function requireAdminScreenIfAdmin(screen: AdminScreen) {
	return async function ensureScreenAccessForAdmin(
		request: FastifyRequest,
		reply: FastifyReply,
	) {
		const authenticated = await verifyJwt(request, reply)
		if (!authenticated) return

		if (request.user.role !== 'admin') return

		const profile = await getAuthenticatedAdminProfile(request)
		if (!profile) {
			return reply.status(404).send({ message: 'Administrador nao encontrado' })
		}

		if (!profileCanAccessScreen(profile, screen)) {
			return reply.status(403).send({
				message: 'Seu perfil nao possui acesso a esta tela',
			})
		}
	}
}
