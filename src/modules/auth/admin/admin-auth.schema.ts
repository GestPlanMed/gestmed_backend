import { z } from 'zod'

export const adminLoginSchema = z.object({
	email: z.string().email('E-mail invalido'),
	password: z.string().min(1, 'Senha obrigatoria'),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>

export const adminForgotPasswordSchema = z.object({
	email: z.string().email('E-mail invalido'),
})

export const adminResetPasswordSchema = z.object({
	token: z.string().min(1, 'Token obrigatorio'),
	password: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
})

export const adminChangePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Senha atual obrigatoria'),
	password: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
})
