import { AdminProfile } from '@prisma/client'
import { z } from 'zod'

const adminProfileValues = [
	AdminProfile.SUPER_ADMIN,
	AdminProfile.ADMIN,
	AdminProfile.RECEPCAO,
	AdminProfile.GESTOR,
] as const

export const createAdminSchema = z.object({
	name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
	email: z.string().trim().toLowerCase().email('E-mail invalido'),
	profile: z.enum(adminProfileValues),
})

export const updateAdminSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Nome deve ter ao menos 2 caracteres')
			.optional(),
		email: z.string().trim().toLowerCase().email('E-mail invalido').optional(),
		password: z
			.string()
			.min(8, 'Senha deve ter ao menos 8 caracteres')
			.optional(),
		profile: z.enum(adminProfileValues).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Informe ao menos um campo para atualizar',
	})

export type CreateAdminInput = z.infer<typeof createAdminSchema>
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>
