import type { FastifyInstance } from 'fastify'
import { requirePatient } from '../../../shared/hooks/authenticate'
import { getPatientMeController, loginPatientController } from './patient-auth.controller'

export async function patientAuthRoutes(app: FastifyInstance) {
	app.post(
		'/login',
		{
			config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
		},
		loginPatientController,
	)

	app.get('/me', { onRequest: [requirePatient] }, getPatientMeController)
}
