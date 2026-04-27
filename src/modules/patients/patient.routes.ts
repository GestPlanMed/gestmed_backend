import type { FastifyInstance } from 'fastify'
import { requireAdminScreen } from '../../shared/hooks/authenticate'
import {
	createPatientController,
	getPatientController,
	listPatientsController,
	regeneratePatientCredentialsController,
	updatePatientController,
} from './patient.controller'

export async function patientRoutes(app: FastifyInstance) {
	app.addHook('onRequest', requireAdminScreen('patients'))

	app.post('/', createPatientController)
	app.post('/:id/regenerate-credentials', regeneratePatientCredentialsController)
	app.get('/', listPatientsController)
	app.get('/:id', getPatientController)
	app.put('/:id', updatePatientController)
}
