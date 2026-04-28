import type { FastifyRequest, FastifyReply } from 'fastify'
import { createExamSchema } from './exam.schema'
import * as service from './exam.service'
import { AppError } from '../../shared/errors/app-error'
import { logUserAction } from '../user-action-logs/user-action-log.service'

const EXAM_FILE_TYPES = {
	pdf: {
		extension: 'pdf',
		contentType: 'application/pdf',
		mimeTypes: new Set(['application/pdf']),
	},
	dcm: {
		extension: 'dcm',
		contentType: 'application/dicom',
		mimeTypes: new Set([
			'application/dicom',
			'application/octet-stream',
			'binary/octet-stream',
		]),
	},
} as const

type ExamFileType = keyof typeof EXAM_FILE_TYPES

type ParsedExamFile = {
	buffer: Buffer
	type: ExamFileType
}

function hasDicomPreamble(buffer: Buffer) {
	return buffer.length >= 132 && buffer.subarray(128, 132).toString() === 'DICM'
}

function detectExamFileType(file: {
	buffer: Buffer
	filename?: string
	mimetype?: string
}): ExamFileType | null {
	const extension = file.filename?.split('.').pop()?.toLowerCase()

	if (
		extension === 'pdf' &&
		EXAM_FILE_TYPES.pdf.mimeTypes.has(file.mimetype ?? '')
	) {
		return 'pdf'
	}

	if (
		extension === 'dcm' &&
		(EXAM_FILE_TYPES.dcm.mimeTypes.has(file.mimetype ?? '') ||
			hasDicomPreamble(file.buffer))
	) {
		return 'dcm'
	}

	return null
}

export async function uploadExamController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const fields: Record<string, string> = {}
	const files: ParsedExamFile[] = []

	for await (const part of request.parts()) {
		if (part.type === 'file') {
			const buffer = await part.toBuffer()
			const detectedType = detectExamFileType({
				buffer,
				filename: part.filename,
				mimetype: part.mimetype,
			})

			if (!detectedType) {
				throw new AppError('Apenas arquivos PDF ou DCM sao aceitos')
			}

			files.push({
				buffer,
				type: detectedType,
			})
		} else {
			fields[part.fieldname] = part.value as string
		}
	}

	if (files.length === 0) {
		throw new AppError('Ao menos um arquivo PDF ou DCM e obrigatorio')
	}

	const data = createExamSchema.parse(fields)
	const exams = await service.uploadExams(
		data,
		files.map((file) => ({
			buffer: file.buffer,
			extension: EXAM_FILE_TYPES[file.type].extension,
			contentType: EXAM_FILE_TYPES[file.type].contentType,
		})),
	)
	await logUserAction({
		request,
		action: 'upload_exam',
		payload: { ...data, fileCount: files.length },
	})

	return reply.status(201).send(exams)
}

export async function listExamsController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const { patientId } = request.query as { patientId?: string }
	const exams = await service.listExams(patientId)
	return reply.status(200).send(exams)
}

export async function listMyExamsController(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const exams = await service.listMyExams(request.user.sub)
	return reply.status(200).send(exams)
}

export async function downloadExamController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const { sub, role } = request.user
	const patientId = role === 'patient' ? sub : undefined
	const result = await service.getExamDownloadUrl(request.params.id, patientId)
	await logUserAction({
		request,
		action: 'download_exam',
		payload: { examId: request.params.id },
	})
	return reply.status(200).send(result)
}

export async function deleteExamController(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	await service.deleteExam(request.params.id)
	await logUserAction({
		request,
		action: 'delete_exam',
		payload: { examId: request.params.id },
	})
	return reply.status(204).send()
}
