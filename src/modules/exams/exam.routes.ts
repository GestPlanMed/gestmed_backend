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
	downloadExamItemController,
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

	app.get<{ Params: { examId: string; itemId: string } }>(
		'/:examId/items/:itemId/download',
		{ onRequest: [authenticate, requireAdminScreenIfAdmin('exams')] },
		downloadExamItemController,
	)

	app.get<{ Params: { id: string } }>(
		'/:id/download',
		{ onRequest: [authenticate, requireAdminScreenIfAdmin('exams')] },
		downloadExamController,
	)
}
