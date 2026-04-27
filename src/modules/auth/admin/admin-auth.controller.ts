import type { FastifyReply, FastifyRequest } from 'fastify'
import {
	adminForgotPasswordSchema,
	adminLoginSchema,
	adminResetPasswordSchema,
} from './admin-auth.schema'
import * as service from './admin-auth.service'
import { logUserAction } from '../../user-action-logs/user-action-log.service'

export async function loginAdminController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { email, password } = adminLoginSchema.parse(request.body)
	const admin = await service.loginAdmin(email, password)
	await logUserAction({
		request,
		user: { sub: admin.id, role: 'admin' },
		action: 'login_admin',
		payload: { email },
	})

	const token = await reply.jwtSign({ sub: admin.id, role: 'admin' })
	const session = await service.getAdminSession(admin.id)

	return reply.status(200).send({ token, admin: session })
}

export async function getAdminMeController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const session = await service.getAdminSession(request.user.sub)
	return reply.status(200).send(session)
}

export async function forgotAdminPasswordController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { email } = adminForgotPasswordSchema.parse(request.body)
	await service.forgotAdminPassword(email)

	return reply.status(200).send({
		message:
			'Se o e-mail existir, enviaremos as instrucoes de recuperacao de senha.',
	})
}

export async function resetAdminPasswordController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { token, password } = adminResetPasswordSchema.parse(request.body)
	await service.resetAdminPassword(token, password)

	return reply.status(200).send({ message: 'Senha redefinida com sucesso' })
}
