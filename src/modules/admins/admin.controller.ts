import type { FastifyReply, FastifyRequest } from 'fastify'
import { logUserAction } from '../user-action-logs/user-action-log.service'
import { createAdminSchema, updateAdminSchema } from './admin.schema'
import * as service from './admin.service'

export async function createAdminController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const data = createAdminSchema.parse(request.body)
	const createdAdmin = await service.createAdmin(data)

	await logUserAction({
		request,
		action: 'create_admin',
		payload: {
			adminId: createdAdmin.admin.id,
			name: createdAdmin.admin.name,
			email: createdAdmin.admin.email,
			profile: createdAdmin.admin.profile,
		},
	})

	return reply.status(201).send(createdAdmin)
}

export async function listAdminsController(
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	const admins = await service.listAdmins()
	return reply.status(200).send(admins)
}

export async function getAdminController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const admin = await service.getAdmin(request.params.id)
	return reply.status(200).send(admin)
}

export async function updateAdminController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const data = updateAdminSchema.parse(request.body)
	const admin = await service.updateAdmin(request.params.id, data)

	await logUserAction({
		request,
		action: 'update_admin',
		payload: {
			adminId: request.params.id,
			changes: {
				...(data.name ? { name: data.name } : {}),
				...(data.email ? { email: data.email } : {}),
				...(data.profile ? { profile: data.profile } : {}),
				...(data.password ? { passwordUpdated: true } : {}),
			},
		},
	})

	return reply.status(200).send(admin)
}

export async function deleteAdminController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const admin = await service.deleteAdmin(request.params.id, request.user.sub)

	await logUserAction({
		request,
		action: 'delete_admin',
		payload: {
			adminId: admin.id,
			email: admin.email,
			profile: admin.profile,
		},
	})

	return reply.status(200).send({
		message: 'Administrador excluido com sucesso',
		admin,
	})
}
