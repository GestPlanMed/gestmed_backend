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

const examInclude = {
	patient: { select: { name: true } },
	items: { orderBy: { createdAt: 'asc' as const } },
}

export async function uploadExam(data: CreateExamInput, files: ExamFileUpload[]) {
	const patient = await prisma.patient.findUnique({
		where: { id: data.patientId },
	})
	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	const exam = await prisma.$transaction(async (tx) => {
		const createdExam = await tx.exam.create({
			data: {
				patientId: data.patientId,
				examDate: new Date(data.examDate),
				examType: data.examType,
			},
		})

		for (const file of files) {
			const suffix = randomBytes(8).toString('hex')
			const fileKey = `exams/${data.patientId}/${Date.now()}-${suffix}.${file.extension}`

			await uploadFile(fileKey, file.buffer, file.contentType)

			await tx.examItem.create({
				data: {
					examId: createdExam.id,
					fileKey,
				},
			})
		}

		return tx.exam.findUniqueOrThrow({
			where: { id: createdExam.id },
			include: examInclude,
		})
	})

	await notifyNewExam(patient, data.examType, exam.items.length)

	return formatExam(exam)
}

export async function listExams(patientId?: string) {
	const exams = await prisma.exam.findMany({
		where: patientId ? { patientId } : undefined,
		include: examInclude,
		orderBy: { examDate: 'desc' },
	})
	return exams.map(formatExam)
}

export async function listMyExams(patientId: string) {
	return listExams(patientId)
}

export async function getExamItemDownloadUrl(
	examId: string,
	itemId: string,
	requestingPatientId?: string,
) {
	const item = await prisma.examItem.findFirst({
		where: { id: itemId, examId },
		include: {
			exam: {
				include: { patient: { select: { name: true } }, items: true },
			},
		},
	})

	if (!item) throw new AppError('Arquivo do exame nao encontrado', 404)

	if (requestingPatientId && item.exam.patientId !== requestingPatientId) {
		throw new AppError('Acesso negado', 403)
	}

	const itemIndex = getItemIndex(item.exam.items, item.id)
	const extension = getFileExtension(item.fileKey)
	const filename = buildDownloadFilename({
		patientName: item.exam.patient.name,
		examType: item.exam.examType,
		examDate: item.exam.examDate,
		extension,
		itemIndex,
		totalItems: item.exam.items.length,
	})
	const url = await getPresignedDownloadUrl(item.fileKey, filename)

	return { url }
}

export async function getExamDownloadUrls(
	examId: string,
	requestingPatientId?: string,
) {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		include: {
			patient: { select: { name: true } },
			items: { orderBy: { createdAt: 'asc' } },
		},
	})

	if (!exam) throw new AppError('Exame nao encontrado', 404)

	if (requestingPatientId && exam.patientId !== requestingPatientId) {
		throw new AppError('Acesso negado', 403)
	}

	const items = await Promise.all(
		exam.items.map(async (item, index) => {
			const extension = getFileExtension(item.fileKey)
			const filename = buildDownloadFilename({
				patientName: exam.patient.name,
				examType: exam.examType,
				examDate: exam.examDate,
				extension,
				itemIndex: index,
				totalItems: exam.items.length,
			})
			const url = await getPresignedDownloadUrl(item.fileKey, filename)

			return {
				id: item.id,
				extension,
				filename,
				url,
			}
		}),
	)

	return { items }
}

export async function deleteExam(examId: string) {
	const exam = await prisma.exam.findUnique({
		where: { id: examId },
		include: { items: true },
	})

	if (!exam) throw new AppError('Exame nao encontrado', 404)

	for (const item of exam.items) {
		await deleteFile(item.fileKey)
	}

	await prisma.exam.delete({
		where: { id: examId },
	})
}

function getFileExtension(fileKey: string): string {
	return fileKey.split('.').pop() ?? 'pdf'
}

function getItemIndex(
	items: Array<{ id: string; createdAt: Date }>,
	itemId: string,
): number {
	const sorted = [...items].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
	)
	return sorted.findIndex((item) => item.id === itemId)
}

function buildDownloadFilename(params: {
	patientName: string
	examType: string
	examDate: Date
	extension: string
	itemIndex: number
	totalItems: number
}): string {
	const date = params.examDate.toISOString().split('T')[0]
	const suffix = params.totalItems > 1 ? `-${params.itemIndex + 1}` : ''
	return `${params.patientName}-${params.examType}-${date}${suffix}.${params.extension}`
}

function formatExamItem(item: { id: string; fileKey: string; createdAt: Date }) {
	return {
		id: item.id,
		extension: getFileExtension(item.fileKey),
		createdAt: item.createdAt,
	}
}

function formatExam(exam: {
	id: string
	patientId: string
	examDate: Date
	examType: string
	createdAt: Date
	patient: { name: string }
	items: Array<{ id: string; fileKey: string; createdAt: Date }>
}) {
	return {
		id: exam.id,
		patientId: exam.patientId,
		patientName: exam.patient.name,
		examDate: exam.examDate,
		examType: exam.examType,
		createdAt: exam.createdAt,
		items: exam.items.map(formatExamItem),
	}
}

async function notifyNewExam(
	patient: { name: string; whatsapp: string | null },
	examType: string,
	fileCount: number,
): Promise<void> {
	try {
		await sendNewExamWhatsApp({
			whatsapp: patient.whatsapp,
			message: buildNewExamMessage({
				name: patient.name,
				examType,
				examCount: fileCount,
				accessUrl: getPatientAccessUrl(),
			}),
		})
	} catch (error) {
		console.error('Erro ao enviar notificacao de exame por WhatsApp', error)
	}
}
