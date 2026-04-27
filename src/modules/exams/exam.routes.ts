import type { FastifyInstance } from 'fastify'
import {
	authenticate,
	requireAdminScreen,
	requireAdminScreenIfAdmin,
	requirePatient,
} from '../../shared/hooks/authenticate'
import {
	uploadExamController,
	listExamsController,
	listMyExamsController,
	downloadExamController,
	deleteExamController,
} from './exam.controller'

export async function examRoutes(app: FastifyInstance) {
	app.post('/', { onRequest: [requireAdminScreen('exams')] }, uploadExamController)
	app.get('/', { onRequest: [requireAdminScreen('exams')] }, listExamsController)
	app.delete<{ Params: { id: string } }>(
		'/:id',
		{ onRequest: [requireAdminScreen('exams')] },
		deleteExamController,
	)

	app.get('/my', { onRequest: [requirePatient] }, listMyExamsController)

	// Admin e paciente podem baixar — o service valida que paciente só acessa seu próprio exame
	app.get<{ Params: { id: string } }>(
		'/:id/download',
		{ onRequest: [authenticate, requireAdminScreenIfAdmin('exams')] },
		downloadExamController,
	)
}
