import type { FastifyInstance } from 'fastify'
import { requireAdminScreen } from '../../shared/hooks/authenticate'
import { listUserActionLogsController } from './user-action-log.controller'

export async function userActionLogRoutes(app: FastifyInstance) {
	app.get('/', { onRequest: requireAdminScreen('logs') }, listUserActionLogsController)
}
