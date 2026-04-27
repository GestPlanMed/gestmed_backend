import type { FastifyInstance } from 'fastify'
import {
	requireAdminScreen,
	requireSuperAdmin,
} from '../../shared/hooks/authenticate'
import {
	createAdminController,
	deleteAdminController,
	getAdminController,
	listAdminsController,
	updateAdminController,
} from './admin.controller'

export async function adminRoutes(app: FastifyInstance) {
	app.addHook('onRequest', requireAdminScreen('admins'))

	app.get('/', listAdminsController)
	app.get<{ Params: { id: string } }>('/:id', getAdminController)
	app.post('/', { onRequest: [requireSuperAdmin] }, createAdminController)
	app.put<{ Params: { id: string } }>(
		'/:id',
		{ onRequest: [requireSuperAdmin] },
		updateAdminController,
	)
	app.delete<{ Params: { id: string } }>(
		'/:id',
		{ onRequest: [requireSuperAdmin] },
		deleteAdminController,
	)
}
