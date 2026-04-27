import Fastify, { type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import fs from 'fs'
import { ZodError } from 'zod'
import { jwtPlugin } from './shared/plugins/jwt.plugin'
import { adminAuthRoutes } from './modules/auth/admin/admin-auth.routes'
import { patientAuthRoutes } from './modules/auth/patient/patient-auth.routes'
import { patientRoutes } from './modules/patients/patient.routes'
import { examRoutes } from './modules/exams/exam.routes'
import { userActionLogRoutes } from './modules/user-action-logs/user-action-log.routes'
import { adminRoutes } from './modules/admins/admin.routes'
import { AppError } from './shared/errors/app-error'
import { getPublicAssets } from './shared/lib/branding'

function serializeUnknownError(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		}
	}

	return { value: error }
}

function buildInternalErrorResponse(error: unknown) {
	if (process.env.NODE_ENV === 'production') {
		return { message: 'Erro interno do servidor' }
	}

	if (error instanceof Error && error.message) {
		return {
			message: 'Erro interno do servidor',
			details: error.message,
		}
	}

	return { message: 'Erro interno do servidor' }
}

function logUnhandledError(
	app: ReturnType<typeof Fastify>,
	request: FastifyRequest,
	error: unknown,
) {
	app.log.error(
		{
			err: serializeUnknownError(error),
			method: request.method,
			url: request.url,
			params: request.params,
			query: request.query,
		},
		'Unhandled request error',
	)
}

export function buildApp() {
	const app = Fastify({ logger: true })
	const allowedOrigin = process.env.PATIENT_ACCESS_URL

	app.register(cors, {
		origin: allowedOrigin ?? false,
		credentials: true,
	})
	app.register(multipart, {
		limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
	})
	app.register(rateLimit, {
		global: true,
		max: 100,
		timeWindow: '1 minute',
		errorResponseBuilder: () => ({
			message: 'Muitas requisições. Tente novamente em instantes.',
		}),
	})
	app.register(jwtPlugin)

	app.get('/', async () => ({
		status: 'ok',
		service: 'gestmed-exams-backend',
	}))

	app.get('/health', async () => ({
		status: 'ok',
	}))

	app.get('/public-assets/:filename', async (request, reply) => {
		const { filename } = request.params as { filename: string }
		const files = getPublicAssets()
		const file = files[filename as keyof typeof files]
		if (!file) {
			return reply.status(404).send({ message: 'Arquivo nao encontrado' })
		}

		if (!fs.existsSync(file.path)) {
			return reply.status(404).send({ message: 'Arquivo nao encontrado' })
		}

		return reply.type(file.contentType).send(fs.createReadStream(file.path))
	})

	app.setErrorHandler((error, request, reply) => {
		if (error instanceof AppError) {
			return reply.status(error.statusCode).send({ message: error.message })
		}

		if (error instanceof ZodError) {
			return reply
				.status(400)
				.send({ message: 'Dados inválidos', errors: error.errors })
		}

		logUnhandledError(app, request, error)
		return reply.status(500).send(buildInternalErrorResponse(error))
	})

	app.register(adminAuthRoutes, { prefix: '/auth/admin' })
	app.register(patientAuthRoutes, { prefix: '/auth/patient' })
	app.register(patientRoutes, { prefix: '/patients' })
	app.register(examRoutes, { prefix: '/exams' })
	app.register(userActionLogRoutes, { prefix: '/user-action-logs' })
	app.register(adminRoutes, { prefix: '/admins' })

	return app
}
