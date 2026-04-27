import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
	region: 'auto',
	endpoint: process.env.R2_ENDPOINT!,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
})

const bucket = process.env.R2_BUCKET_NAME!

export async function uploadFile(
	key: string,
	body: Buffer,
	contentType: string,
): Promise<void> {
	await r2.send(
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
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		ResponseContentDisposition: `attachment; filename="${filename}"`,
	})
	return getSignedUrl(r2, command, { expiresIn: 3600 })
}

export async function deleteFile(key: string): Promise<void> {
	await r2.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: key,
		}),
	)
}
