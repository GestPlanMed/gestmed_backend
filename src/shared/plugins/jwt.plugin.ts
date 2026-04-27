import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'

declare module '@fastify/jwt' {
	interface FastifyJWT {
		payload: { sub: string; role: 'admin' | 'patient' }
		user: { sub: string; role: 'admin' | 'patient' }
	}
}

export const jwtPlugin = fp(async (app: FastifyInstance) => {
	app.register(fastifyJwt, {
		secret: process.env.JWT_SECRET!,
		sign: { expiresIn: '1h' },
	})
})
