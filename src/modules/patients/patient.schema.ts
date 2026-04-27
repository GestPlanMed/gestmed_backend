import { z } from 'zod'
import { isValidCpf, normalizeCpf } from '../../shared/utils/cpf'

const optionalWhatsappSchema = z
	.union([z.string(), z.null()])
	.transform((value) => {
		if (value == null) return undefined

		const digits = value.replace(/\D/g, '')
		return digits.length > 0 ? digits : undefined
	})
	.refine(
		(value) => value === undefined || (value.length >= 10 && value.length <= 13),
		'WhatsApp deve conter entre 10 e 13 digitos',
	)

export const createPatientSchema = z.object({
	name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
	cpf: z
		.string()
		.transform(normalizeCpf)
		.refine((cpf) => /^\d{11}$/.test(cpf), 'CPF deve conter 11 digitos numericos')
		.refine(isValidCpf, 'CPF invalido'),
	whatsapp: optionalWhatsappSchema.optional(),
	birthDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
})

export const updatePatientSchema = z.object({
	name: z.string().min(2).optional(),
	whatsapp: optionalWhatsappSchema.optional(),
	birthDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
