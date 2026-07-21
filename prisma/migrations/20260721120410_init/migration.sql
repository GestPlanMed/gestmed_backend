-- DropForeignKey (idempotente: pode já ter sido removida em tentativa anterior)
ALTER TABLE "MagicLink" DROP CONSTRAINT IF EXISTS "MagicLink_adminId_fkey";

-- AlterTable Admin (colunas podem já existir se o banco foi ajustado manualmente ou via db push)
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "password" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;

-- AlterTable Patient
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- DropTable
DROP TABLE IF EXISTS "MagicLink";
