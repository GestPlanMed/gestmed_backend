import 'dotenv/config'
import { AdminProfile, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const validAdminProfiles = new Set<AdminProfile>([
	AdminProfile.SUPER_ADMIN,
	AdminProfile.ADMIN,
	AdminProfile.RECEPCAO,
	AdminProfile.GESTOR,
])

async function main() {
	const name = process.env.ADMIN_NAME
	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD
	const profileEnv = process.env.ADMIN_PROFILE ?? AdminProfile.SUPER_ADMIN

	if (!name || !email || !password) {
		throw new Error(
			'ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD devem estar definidos no .env',
		)
	}

	if (!validAdminProfiles.has(profileEnv as AdminProfile)) {
		throw new Error(
			'ADMIN_PROFILE invalido. Use SUPER_ADMIN, ADMIN, RECEPCAO ou GESTOR.',
		)
	}

	const passwordHash = await bcrypt.hash(password, 10)
	const profile = profileEnv as AdminProfile

	await prisma.admin.upsert({
		where: { email },
		update: { name, password: passwordHash, profile },
		create: { name, email, password: passwordHash, profile },
	})

	console.log(`Admin criado: ${name} (${email}) com perfil ${profile}`)

	const patientName = process.env.PATIENT_NAME ?? 'Paciente Teste'
	const patientCpf = process.env.PATIENT_CPF ?? '52998224725'
	const patientPassword = process.env.PATIENT_PASSWORD ?? 'TEST1234'
	const patientBirthDate = process.env.PATIENT_BIRTH_DATE ?? '1990-01-15'
	const patientWhatsapp = process.env.PATIENT_WHATSAPP

	const patientPasswordHash = await bcrypt.hash(patientPassword, 10)

	await prisma.patient.upsert({
		where: { cpf: patientCpf },
		update: {
			name: patientName,
			password: patientPasswordHash,
			birthDate: new Date(patientBirthDate),
			whatsapp: patientWhatsapp,
		},
		create: {
			name: patientName,
			cpf: patientCpf,
			password: patientPasswordHash,
			birthDate: new Date(patientBirthDate),
			whatsapp: patientWhatsapp,
		},
	})

	console.log(`Paciente criado: ${patientName} (CPF ${patientCpf})`)
	console.log(`Senha do paciente: ${patientPassword}`)
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect())
