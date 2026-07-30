import { buildApp } from './src/app'

async function printRoutes() {
	const app = buildApp()
	await app.ready()
	console.log(app.printRoutes())
}

printRoutes()
