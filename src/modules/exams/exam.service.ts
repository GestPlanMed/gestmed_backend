import { randomBytes } from 'crypto'
import { prisma } from '../../shared/lib/prisma'
import {
	uploadFile,
	getPresignedDownloadUrl,
	deleteFile,
} from '../../shared/lib/r2'
import { AppError } from '../../shared/errors/app-error'
import { getPatientAccessUrl } from '../../shared/lib/patient-access'
import {
	buildNewExamMessage,
	sendNewExamWhatsApp,
} from '../../shared/lib/whatsapp'
import type { CreateExamInput } from './exam.schema'

type ExamFileMetadata = {
	extension: 'pdf' | 'dcm'
	contentType: string
}

type ExamFileUpload = ExamFileMetadata & {
	buffer: Buffer
}

export async function uploadExam(
	data: CreateExamInput,
	fileBuffer: Buffer,
	file: ExamFileMetadata,
) {
	const [exam] = await uploadExams(data, [{ ...file, buffer: fileBuffer }])
	return exam
}

export async function uploadExams(data: CreateExamInput, files: ExamFileUpload[]) {
	const patient = await prisma.patient.findUnique({
		where: { id: data.patientId },
	})
	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	const exams = []

	for (const file of files) {
		const suffix = randomBytes(8).toString('hex')
		const fileKey = `exams/${data.patientId}/${Date.now()}-${suffix}.${file.extension}`

		await uploadFile(fileKey, file.buffer, file.contentType)

		const exam = await prisma.exam.create({
			data: {
				patientId: data.patientId,
				examDate: new Date(data.examDate),
				examType: data.examType,
				fileKey,
			},
			include: { patient: { select: { name: true } } },
		})

		exams.push(formatExam(exam))
	}

	// WhatsApp em standby: reativar quando a Evolution API estiver pronta.
	// await notifyNewExam(patient, data.examType, exams.length)

	return exams
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

	if (!exam) throw new AppError('Exame nao encontrado', 404)

	if (requestingPatientId && exam.patientId !== requestingPatientId) {
		throw new AppError('Acesso negado', 403)
	}

	const date = exam.examDate.toISOString().split('T')[0]
	const extension = exam.fileKey.split('.').pop() ?? 'pdf'
	const filename = `${exam.patient.name}-${exam.examType}-${date}.${extension}`
	const url = await getPresignedDownloadUrl(exam.fileKey, filename)

	return { url }
}

export async function deleteExam(examId: string) {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
	})

	if (!exam) throw new AppError('Exame nao encontrado', 404)

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

async function notifyNewExam(
	patient: { name: string; whatsapp: string | null },
	examType: string,
	examCount: number,
): Promise<void> {
	try {
		await sendNewExamWhatsApp({
			whatsapp: patient.whatsapp,
			message: buildNewExamMessage({
				name: patient.name,
				examType,
				examCount,
				accessUrl: getPatientAccessUrl(),
			}),
		})
	} catch (error) {
		console.error('Erro ao enviar notificacao de exame por WhatsApp', error)
	}
}
