import type { FastifyReply, FastifyRequest } from 'fastify'
import * as service from './user-action-log.service'

export async function listUserActionLogsController(
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	const logs = await service.listUserActionLogs()
	return reply.status(200).send(logs)
}
