import type { FastifyRequest } from 'fastify'
import type { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/lib/prisma'

export type AuthenticatedUser = {
	sub: string
	role: 'admin' | 'patient'
}

async function getAuthenticatedUserName(user: AuthenticatedUser) {
	if (user.role === 'admin') {
		const admin = await prisma.admin.findUnique({
			where: { id: user.sub },
			select: { name: true },
		})

		if (!admin) throw new AppError('Usuario nao encontrado', 404)
		return admin.name
	}

	const patient = await prisma.patient.findUnique({
		where: { id: user.sub },
		select: { name: true },
	})

	if (!patient) throw new AppError('Usuario nao encontrado', 404)
	return patient.name
}

export async function createUserActionLog(
	user: AuthenticatedUser,
	data: { action: string; payload?: Prisma.InputJsonValue },
) {
	const userName = await getAuthenticatedUserName(user)

	return prisma.userActionLog.create({
		data: {
			action: data.action,
			userId: user.sub,
			userName,
			userRole: user.role,
			...(Object.hasOwn(data, 'payload') ? { payload: data.payload } : {}),
		},
		select: {
			id: true,
			action: true,
			userId: true,
			userName: true,
			userRole: true,
			createdAt: true,
		},
	})
}

export async function listUserActionLogs() {
	const logs = await prisma.userActionLog.findMany({
		select: {
			id: true,
			action: true,
			userId: true,
			userName: true,
			userRole: true,
			payload: true,
			createdAt: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	return logs.map((log) => ({
		...log,
		...buildUserActionLogPresentation(log.action, log.payload),
	}))
}

function buildUserActionLogPresentation(
	action: string,
	payload: Prisma.JsonValue | null,
) {
	const payloadRecord = isRecord(payload) ? payload : null

	switch (action) {
		case 'login_admin':
			return {
				resource: 'admin',
				detail: stringifyDetail(payloadRecord?.email),
			}
		case 'login_patient':
			return {
				resource: 'patient',
				detail: stringifyDetail(payloadRecord?.cpf),
			}
		case 'create_patient':
			return {
				resource: 'patient',
				detail: stringifyDetail(payloadRecord?.name),
			}
		case 'create_admin':
			return {
				resource: 'admin',
				detail: stringifyDetail(payloadRecord?.email ?? payloadRecord?.name),
			}
		case 'update_admin':
			return {
				resource: 'admin',
				detail: stringifyDetail(payloadRecord?.adminId),
			}
		case 'delete_admin':
			return {
				resource: 'admin',
				detail: stringifyDetail(payloadRecord?.adminId),
			}
		case 'update_patient':
			return {
				resource: 'patient',
				detail: stringifyDetail(payloadRecord?.patientId),
			}
		case 'regenerate_patient_credentials':
			return {
				resource: 'patient_credentials',
				detail: stringifyDetail(payloadRecord?.patientId),
			}
		case 'upload_exam':
			return {
				resource: 'exam',
				detail: stringifyDetail(
					isRecord(payloadRecord)
						? payloadRecord.examType ?? payloadRecord.patientId
						: null,
				),
			}
		case 'download_exam':
		case 'delete_exam':
			return {
				resource: 'exam',
				detail: stringifyDetail(payloadRecord?.examId),
			}
		default:
			return {
				resource: inferResourceFromAction(action),
				detail: stringifyDetail(payload),
			}
	}
}

function inferResourceFromAction(action: string) {
	if (action.includes('exam')) return 'exam'
	if (action.includes('patient')) return 'patient'
	if (action.includes('admin')) return 'admin'
	return action
}

function stringifyDetail(value: Prisma.JsonValue | undefined | null) {
	if (value == null) return null
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		return String(value)
	}

	return JSON.stringify(value)
}

function isRecord(
	value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

type LogUserActionParams = {
	action: string
	payload?: Prisma.InputJsonValue
	request?: FastifyRequest
	user?: AuthenticatedUser
}

export async function logUserAction({
	action,
	payload,
	request,
	user,
}: LogUserActionParams) {
	try {
		const actor = user ?? request?.user
		if (!actor?.sub || !actor.role) return

		await createUserActionLog(actor, {
			action,
			...(payload !== undefined ? { payload } : {}),
		})
	} catch (error) {
		request?.log.error(
			{
				err: error,
				action,
			},
			'Failed to persist user action log',
		)
	}
}
