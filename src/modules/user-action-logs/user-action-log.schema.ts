import { z } from 'zod'

const jsonValueSchema: z.ZodType<
	string | number | boolean | null | { [key: string]: unknown } | unknown[]
> = z.lazy(() =>
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.null(),
		z.array(jsonValueSchema),
		z.record(z.string(), jsonValueSchema),
	]),
)

export const createUserActionLogSchema = z.object({
	action: z.string().trim().min(1, 'Acao obrigatoria'),
	payload: jsonValueSchema.optional(),
})

export type CreateUserActionLogInput = z.infer<typeof createUserActionLogSchema>
