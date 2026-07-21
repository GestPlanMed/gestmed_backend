import bcrypt from 'bcryptjs'
import { prisma } from '../../../shared/lib/prisma'
import { AppError } from '../../../shared/errors/app-error'

export async function loginPatient(
	cpf: string,
	password: string,
): Promise<{ id: string; name: string }> {
	const patient = await prisma.patient.findUnique({ where: { cpf } })
	if (!patient) throw new AppError('CPF ou senha incorretos', 401)

	const passwordMatch = await bcrypt.compare(password, patient.password)
	if (!passwordMatch) throw new AppError('CPF ou senha incorretos', 401)

	return { id: patient.id, name: patient.name }
}

export async function getAuthenticatedPatient(patientId: string) {
	const patient = await prisma.patient.findUnique({
		where: { id: patientId },
		select: {
			id: true,
			name: true,
			cpf: true,
			whatsapp: true,
			birthDate: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	if (!patient) {
		throw new AppError('Paciente nao encontrado', 404)
	}

	return patient
}
