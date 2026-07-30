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

	const formatObject = (obj: any) => {
		if (!obj) return ''
		return Object.entries(obj)
			.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
			.join(', ')
	}

	switch (action) {
		case 'login_admin':
			return {
				resource: 'admin',
				details: 'Acessou a plataforma!',
			}
		case 'login_patient':
			return {
				resource: 'patient',
				details: 'Acessou a plataforma!',
			}
		case 'create_patient':
			return {
				resource: 'patient',
				details: payloadRecord?.name ? `Novo paciente: ${payloadRecord.name} (CPF: ${payloadRecord.cpf || 'N/A'})` : stringifyDetail(payload),
			}
		case 'create_admin':
			return {
				resource: 'admin',
				details: payloadRecord?.email ? `Novo admin: ${payloadRecord.email} - Perfil: ${payloadRecord.profile || 'N/A'}` : stringifyDetail(payload),
			}
		case 'update_admin':
			return {
				resource: 'admin',
				details: `Admin ID: ${payloadRecord?.adminId}. Alterações: ${payloadRecord?.changes ? formatObject(payloadRecord.changes) : stringifyDetail(payload)}`,
			}
		case 'delete_admin':
			return {
				resource: 'admin',
				details: payloadRecord?.adminId ? `Excluído admin ID: ${payloadRecord.adminId}` : stringifyDetail(payload),
			}
		case 'update_patient':
			return {
				resource: 'patient',
				details: `Paciente ID: ${payloadRecord?.patientId}. Alterações: ${payloadRecord?.changes ? formatObject(payloadRecord.changes) : stringifyDetail(payload)}`,
			}
		case 'delete_patient':
			return {
				resource: 'patient',
				details: payloadRecord?.patientId ? `Excluído paciente ID: ${payloadRecord.patientId}` : stringifyDetail(payload),
			}
		case 'regenerate_patient_credentials':
			return {
				resource: 'patient_credentials',
				details: payloadRecord?.patientName ? `Credenciais geradas para paciente: ${payloadRecord.patientName}` : (payloadRecord?.patientId ? `Credenciais geradas para paciente ID: ${payloadRecord.patientId}` : stringifyDetail(payload)),
			}
		case 'upload_exam':
			return {
				resource: 'exam',
				details: `Paciente ID: ${payloadRecord?.patientId}. Tipo: ${payloadRecord?.examType || 'N/A'}`,
			}
		case 'download_exam':
			return {
				resource: 'exam',
				details: payloadRecord?.examId ? `Download do exame ID: ${payloadRecord.examId}` : stringifyDetail(payload),
			}
		case 'delete_exam':
			return {
				resource: 'exam',
				details: payloadRecord?.examId ? `Excluído exame ID: ${payloadRecord.examId}` : stringifyDetail(payload),
			}
		default:
			return {
				resource: inferResourceFromAction(action),
				details: stringifyDetail(payload),
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
