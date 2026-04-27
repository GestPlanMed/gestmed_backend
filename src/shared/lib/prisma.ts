import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
	throw new Error('DATABASE_URL nao configurada')
}

if (
	!databaseUrl.startsWith('postgresql://') &&
	!databaseUrl.startsWith('postgres://')
) {
	throw new Error(
		`DATABASE_URL invalida para este projeto: esperado postgres/postgresql, recebido ${databaseUrl.split(':')[0]}:`,
	)
}

declare global {
	var __prisma__: PrismaClient | undefined
}

export const prisma =
	globalThis.__prisma__ ??
	new PrismaClient({
		datasources: {
			db: {
				url: databaseUrl,
			},
		},
	})

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma__ = prisma
}
