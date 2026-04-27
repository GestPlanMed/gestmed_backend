import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/lib/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function loginPatient(
	cpf: string,
	password: string,
): Promise<string> {
	const patient = await prisma.patient.findUnique({ where: { cpf } })
	if (!patient) throw new AppError('CPF ou senha incorretos', 401)

	const passwordMatch = await bcrypt.compare(password, patient.password)
	if (!passwordMatch) throw new AppError('CPF ou senha incorretos', 401)

	return patient.id
}
