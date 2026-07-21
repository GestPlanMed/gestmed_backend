import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type R2Config = {
	client: S3Client
	bucket: string
}

let r2State: R2Config | null = null

function getR2Config(): R2Config {
	if (r2State) return r2State

	const endpoint = process.env.R2_ENDPOINT?.trim()
	const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
	const bucket = process.env.R2_BUCKET_NAME?.trim()

	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error(
			'Armazenamento R2 nao configurado. Defina R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME no .env',
		)
	}

	try {
		new URL(endpoint)
	} catch {
		throw new Error(
			`R2_ENDPOINT invalido (${endpoint}). Use o endpoint do Cloudflare R2, ex.: https://<account-id>.r2.cloudflarestorage.com`,
		)
	}

	r2State = {
		client: new S3Client({
			region: 'auto',
			endpoint,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		}),
		bucket,
	}

	return r2State
}

export async function uploadFile(
	key: string,
	body: Buffer,
	contentType: string,
): Promise<void> {
	const { client, bucket } = getR2Config()

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	)
}

export async function getPresignedDownloadUrl(
	key: string,
	filename: string,
): Promise<string> {
	const { client, bucket } = getR2Config()

	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${filename}"`,
	})
	return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function deleteFile(key: string): Promise<void> {
	const { client, bucket } = getR2Config()

	await client.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
	)
}
