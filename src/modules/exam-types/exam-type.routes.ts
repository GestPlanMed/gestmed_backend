import type { FastifyInstance } from 'fastify'
import { ExamTypeController } from './exam-type.controller'
import { authenticate, requireAdminScreen } from '../../shared/hooks/authenticate'

const controller = new ExamTypeController()

export async function examTypeRoutes(app: FastifyInstance) {
  // Acesso público (apenas autenticados mas qualquer perfil) para poder listar no cadastro de exame
  app.get('/', { onRequest: [authenticate] }, controller.list)

  // Gerenciamento de exames: restrito a usuários admin
  app.post('/', { onRequest: [requireAdminScreen('exams')] }, controller.create)
  app.put('/:id', { onRequest: [requireAdminScreen('exams')] }, controller.update)
  app.delete('/:id', { onRequest: [requireAdminScreen('exams')] }, controller.delete)
}
