import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../../../shared/hooks/authenticate'
import {
	forgotAdminPasswordController,
	getAdminMeController,
	loginAdminController,
	resetAdminPasswordController,
} from './admin-auth.controller'

export async function adminAuthRoutes(app: FastifyInstance) {
	app.post(
		'/login',
		{
			config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
		},
		loginAdminController,
	)

	app.post(
		'/forgot-password',
		{
			config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
		},
		forgotAdminPasswordController,
	)

	app.post(
		'/reset-password',
		{
			config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
		},
		resetAdminPasswordController,
	)

	app.get('/me', { onRequest: [requireAdmin] }, getAdminMeController)
}
