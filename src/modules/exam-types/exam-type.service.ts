import { PrismaClient } from '@prisma/client'
import { AppError } from '../../shared/errors/app-error'

const prisma = new PrismaClient()

export class ExamTypeService {
  async list() {
    return prisma.examType.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async create(name: string) {
    const existing = await prisma.examType.findUnique({
      where: { name },
    })

    if (existing) {
      throw new AppError('Tipo de exame já existe', 400)
    }

    return prisma.examType.create({
      data: { name },
    })
  }

  async update(id: string, name: string) {
    const examType = await prisma.examType.findUnique({
      where: { id },
    })

    if (!examType) {
      throw new AppError('Tipo de exame não encontrado', 404)
    }

    const existing = await prisma.examType.findUnique({
      where: { name },
    })

    if (existing && existing.id !== id) {
      throw new AppError('Tipo de exame com esse nome já existe', 400)
    }

    return prisma.examType.update({
      where: { id },
      data: { name },
    })
  }

  async delete(id: string) {
    const examType = await prisma.examType.findUnique({
      where: { id },
    })

    if (!examType) {
      throw new AppError('Tipo de exame não encontrado', 404)
    }

    await prisma.examType.delete({
      where: { id },
    })
  }
}
