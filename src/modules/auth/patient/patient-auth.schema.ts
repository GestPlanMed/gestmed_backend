import { z } from 'zod'

export const patientLoginSchema = z.object({
	cpf: z.string().regex(/^\d{11}$/, 'CPF deve conter 11 dígitos numéricos'),
	password: z.string().min(1, 'Senha obrigatória'),
})

export type PatientLoginInput = z.infer<typeof patientLoginSchema>
