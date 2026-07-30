import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ExamTypeService } from './exam-type.service'

const service = new ExamTypeService()

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

const updateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

export class ExamTypeController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const examTypes = await service.list()
    return reply.send(examTypes)
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { name } = createSchema.parse(request.body)
    const examType = await service.create(name)
    return reply.status(201).send(examType)
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { name } = updateSchema.parse(request.body)
    const examType = await service.update(id, name)
    return reply.send(examType)
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await service.delete(id)
    return reply.status(204).send()
  }
}
