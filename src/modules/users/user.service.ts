import type { AdminProfile } from '@prisma/client'
import { getScreensForProfile, type AdminScreen } from '../../shared/auth/admin-access'
import { AppError } from '../../shared/errors/app-error'
import { prisma } from '../../shared/lib/prisma'
import { deleteExam } from '../exams/exam.service'

function buildAdminSelect() {
	return {
		id: true,
		name: true,
		email: true,
		profile: true,
		createdAt: true,
	} as const
}

function buildPatientSelect() {
	return {
		id: true,
		name: true,
		cpf: true,
		whatsapp: true,
		birthDate: true,
		createdAt: true,
	} as const
}

type AdminRecord = {
	id: string
	name: string
	email: string
	profile: AdminProfile
	createdAt: Date
}

type PatientRecord = {
	id: string
	name: string
	cpf: string
	whatsapp: string | null
	birthDate: Date
	createdAt: Date
}

function withScreens(admin: AdminRecord) {
	return {
		...admin,
		screens: getScreensForProfile(admin.profile),
	}
}

export type DeletedUser =
	| {
			type: 'admin'
			user: AdminRecord & { screens: AdminScreen[] }
	  }
	| { type: 'patient'; user: PatientRecord }

export async function deleteUser(
	id: string,
	actorAdminId: string,
): Promise<DeletedUser> {
	const admin = await prisma.admin.findUnique({
		where: { id },
		select: buildAdminSelect(),
	})

	if (admin) {
		if (id === actorAdminId) {
			throw new AppError('Nao e permitido excluir o proprio usuario', 400)
		}

		await prisma.admin.delete({ where: { id } })

		return { type: 'admin', user: withScreens(admin) }
	}

	const patient = await prisma.patient.findUnique({
		where: { id },
		select: buildPatientSelect(),
	})

	if (!patient) {
		throw new AppError('Usuario nao encontrado', 404)
	}

	const exams = await prisma.exam.findMany({
		where: { patientId: id },
		select: { id: true },
	})

	for (const exam of exams) {
		await deleteExam(exam.id)
	}

	await prisma.patient.delete({ where: { id } })

	return { type: 'patient', user: patient }
}
