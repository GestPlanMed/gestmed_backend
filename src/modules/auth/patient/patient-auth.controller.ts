import type { FastifyRequest, FastifyReply } from 'fastify'
import { patientLoginSchema } from './patient-auth.schema'
import * as service from './patient-auth.service'
import { logUserAction } from '../../user-action-logs/user-action-log.service'
export async function loginPatientController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { cpf, password } = patientLoginSchema.parse(request.body)
	const patient = await service.loginPatient(cpf, password)
	await logUserAction({
		request,
		user: { sub: patient.id, role: 'patient' },
		action: 'login_patient',
		payload: { cpf },
	})

	request.log.info({ patientId: patient.id, action: 'login_patient' }, 'Verificação de acesso: Paciente realizou login com sucesso')

	const token = await reply.jwtSign({ sub: patient.id, role: 'patient' })
	return reply.status(200).send({
		token,
		patient: { id: patient.id, name: patient.name },
	})
}

export async function getPatientMeController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const patient = await service.getAuthenticatedPatient(request.user.sub)
	return reply.status(200).send(patient)
}
