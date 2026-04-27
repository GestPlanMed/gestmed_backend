import 'dotenv/config'
import { buildApp } from './app'

const app = buildApp()

app.listen(
	{ port: Number(process.env.PORT ?? 4444), host: '0.0.0.0' },
	(err, address) => {
		if (err) {
			app.log.error(err)
			process.exit(1)
		}
		app.log.info(`Servidor rodando em ${address}`)
	},
)
