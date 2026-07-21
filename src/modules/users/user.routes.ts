import type { FastifyInstance } from 'fastify'
import { requireSuperAdmin } from '../../shared/hooks/authenticate'
import { deleteUserController } from './user.controller'

export async function userRoutes(app: FastifyInstance) {
	app.delete<{ Params: { id: string } }>(
		'/:id',
		{ onRequest: [requireSuperAdmin] },
		deleteUserController,
	)
}
