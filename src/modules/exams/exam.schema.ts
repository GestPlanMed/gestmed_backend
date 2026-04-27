import { z } from 'zod'

export const createExamSchema = z.object({
	patientId: z.string().min(1, 'ID do paciente obrigatório'),
	examDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
	examType: z.string().min(1, 'Tipo do exame obrigatório'),
})

export type CreateExamInput = z.infer<typeof createExamSchema>
