export function normalizeCpf(value: string): string {
	return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
	const cpf = normalizeCpf(value)

	if (!/^\d{11}$/.test(cpf)) return false
	if (/^(\d)\1{10}$/.test(cpf)) return false

	let sum = 0
	for (let index = 0; index < 9; index++) {
		sum += Number(cpf[index]) * (10 - index)
	}

	let remainder = (sum * 10) % 11
	if (remainder === 10) remainder = 0
	if (remainder !== Number(cpf[9])) return false

	sum = 0
	for (let index = 0; index < 10; index++) {
		sum += Number(cpf[index]) * (11 - index)
	}

	remainder = (sum * 10) % 11
	if (remainder === 10) remainder = 0

	return remainder === Number(cpf[10])
}
