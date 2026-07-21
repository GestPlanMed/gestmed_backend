import type { FastifyReply, FastifyRequest } from 'fastify'
import { logUserAction } from '../user-action-logs/user-action-log.service'
import * as service from './user.service'

export async function deleteUserController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const result = await service.deleteUser(request.params.id, request.user.sub)

	if (result.type === 'admin') {
		await logUserAction({
			request,
			action: 'delete_admin',
			payload: {
				adminId: result.user.id,
				email: result.user.email,
				profile: result.user.profile,
			},
		})

		return reply.status(200).send({
			message: 'Administrador excluido com sucesso',
			type: result.type,
			user: result.user,
		})
	}

	await logUserAction({
		request,
		action: 'delete_patient',
		payload: {
			patientId: result.user.id,
			name: result.user.name,
			cpf: result.user.cpf,
		},
	})

	return reply.status(200).send({
		message: 'Paciente excluido com sucesso',
		type: result.type,
		user: result.user,
	})
}
