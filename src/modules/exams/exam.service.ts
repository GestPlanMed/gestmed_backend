import { randomBytes } from 'crypto'
import { prisma } from '../../shared/lib/prisma'
import {
	uploadFile,
	getPresignedDownloadUrl,
	deleteFile,
} from '../../shared/lib/r2'
import { AppError } from '../../shared/errors/app-error'
import type { CreateExamInput } from './exam.schema'

export async function uploadExam(data: CreateExamInput, fileBuffer: Buffer) {
	const patient = await prisma.patient.findUnique({
		where: { id: data.patientId },
	})
	if (!patient) throw new AppError('Paciente não encontrado', 404)

	const suffix = randomBytes(8).toString('hex')
	const fileKey = `exams/${data.patientId}/${Date.now()}-${suffix}.pdf`

	await uploadFile(fileKey, fileBuffer, 'application/pdf')

	const exam = await prisma.exam.create({
		data: {
			patientId: data.patientId,
			examDate: new Date(data.examDate),
			examType: data.examType,
			fileKey,
		},
		include: { patient: { select: { name: true } } },
	})

	return formatExam(exam)
}

export async function listExams(patientId?: string) {
	const exams = await prisma.exam.findMany({
		where: patientId ? { patientId } : undefined,
		include: { patient: { select: { name: true } } },
		orderBy: { examDate: 'desc' },
	})
	return exams.map(formatExam)
}

export async function listMyExams(patientId: string) {
	return listExams(patientId)
}

export async function getExamDownloadUrl(
	examId: string,
	requestingPatientId?: string,
) {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		include: { patient: { select: { name: true } } },
	})

	if (!exam) throw new AppError('Exame não encontrado', 404)

	if (requestingPatientId && exam.patientId !== requestingPatientId) {
		throw new AppError('Acesso negado', 403)
	}

	const date = exam.examDate.toISOString().split('T')[0]
	const filename = `${exam.patient.name}-${exam.examType}-${date}.pdf`
	const url = await getPresignedDownloadUrl(exam.fileKey, filename)

	return { url }
}

export async function deleteExam(examId: string) {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
	})

	if (!exam) throw new AppError('Exame não encontrado', 404)

	await deleteFile(exam.fileKey)
	await prisma.exam.delete({
		where: { id: examId },
	})
}

function formatExam(exam: {
	id: string
	patientId: string
	examDate: Date
	examType: string
	createdAt: Date
	patient: { name: string }
}) {
	return {
		id: exam.id,
		patientId: exam.patientId,
		patientName: exam.patient.name,
		examDate: exam.examDate,
		examType: exam.examType,
		createdAt: exam.createdAt,
	}
}
