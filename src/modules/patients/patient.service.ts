import { randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AppError } from '../../shared/errors/app-error'
import { getPatientAccessUrl } from '../../shared/lib/patient-access'
import { generateCredentialsPDF, generateCredentialsText } from '../../shared/lib/pdf'
import { prisma } from '../../shared/lib/prisma'
import { sendPatientCredentialsWhatsApp } from '../../shared/lib/whatsapp'
import type { CreatePatientInput, UpdatePatientInput } from './patient.schema'

// Caracteres sem ambiguidade visual (sem 0/O, 1/I) para facilitar leitura.
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(): string {
	return Array.from(randomBytes(8))
		.map((b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length])
		.join('')
}

async function generatePatientCredentialsPDF(patient: {
	id: string
	name: string
	cpf: string
	whatsapp?: string | null
}): Promise<Buffer> {
	const rawPassword = generatePassword()
	const hashedPassword = await bcrypt.hash(rawPassword, 10)

	await prisma.patient.update({
		where: { id: patient.id },
		data: { password: hashedPassword },
	})

	const credentials = {
		name: patient.name,
		cpf: patient.cpf,
		password: rawPassword,
		accessUrl: getPatientAccessUrl(),
	}

	const pdfBuffer = await generateCredentialsPDF(credentials)
	// WhatsApp em standby: reativar quando a Evolution API estiver pronta.
	// await notifyPatientCredentials(patient.whatsapp, generateCredentialsText(credentials))

	return pdfBuffer
}

export function buildPatientCredentialsFilename(name: string, date = new Date()): string {
	const formattedName = sanitizeFilenamePart(name)
	const formattedDate = formatFilenameDate(date)

	return `credenciais_${formattedName}_${formattedDate}.pdf`
}

export async function createPatient(data: CreatePatientInput): Promise<Buffer> {
	const existing = await prisma.patient.findUnique({ where: { cpf: data.cpf } })
	if (existing) throw new AppError('CPF ja cadastrado')

	const rawPassword = generatePassword()
	const hashedPassword = await bcrypt.hash(rawPassword, 10)
	const credentials = {
		name: data.name,
		cpf: data.cpf,
		password: rawPassword,
		accessUrl: getPatientAccessUrl(),
	}
	const pdfBuffer = await generateCredentialsPDF(credentials)

	try {
		await prisma.patient.create({
			data: {
				name: data.name,
				cpf: data.cpf,
				whatsapp: data.whatsapp,
				birthDate: new Date(data.birthDate),
				password: hashedPassword,
			},
		})
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			throw new AppError('CPF ja cadastrado')
		}

		throw error
	}

	// WhatsApp em standby: reativar quando a Evolution API estiver pronta.
	// await notifyPatientCredentials(data.whatsapp, generateCredentialsText(credentials))

	return pdfBuffer
}

export async function regeneratePatientCredentials(id: string): Promise<Buffer> {
	const patient = await prisma.patient.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			cpf: true,
			whatsapp: true,
		},
	})

	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	return generatePatientCredentialsPDF(patient)
}

export async function getPatientCredentialsFilename(id: string): Promise<string> {
	const patient = await prisma.patient.findUnique({
		where: { id },
		select: { name: true },
	})

	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	return buildPatientCredentialsFilename(patient.name)
}

export async function updatePatient(id: string, data: UpdatePatientInput) {
	const patient = await prisma.patient.findUnique({ where: { id } })
	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	return prisma.patient.update({
		where: { id },
		data: {
			...(data.name && { name: data.name }),
			...(Object.hasOwn(data, 'whatsapp') && { whatsapp: data.whatsapp ?? null }),
			...(data.birthDate && { birthDate: new Date(data.birthDate) }),
		},
		select: {
			id: true,
			name: true,
			cpf: true,
			whatsapp: true,
			birthDate: true,
			updatedAt: true,
		},
	})
}

export async function listPatients() {
	return prisma.patient.findMany({
		select: {
			id: true,
			name: true,
			cpf: true,
			whatsapp: true,
			birthDate: true,
			createdAt: true,
		},
		orderBy: { name: 'asc' },
	})
}

export async function getPatient(id: string) {
	const patient = await prisma.patient.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			cpf: true,
			whatsapp: true,
			birthDate: true,
			createdAt: true,
		},
	})

	if (!patient) throw new AppError('Paciente nao encontrado', 404)

	return patient
}

function sanitizeFilenamePart(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

function formatFilenameDate(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')

	return `${year}${month}${day}`
}

async function notifyPatientCredentials(
	whatsapp: string | null | undefined,
	message: string,
): Promise<void> {
	try {
		await sendPatientCredentialsWhatsApp({ whatsapp, message })
	} catch (error) {
		console.error('Erro ao enviar credenciais por WhatsApp', error)
	}
}
