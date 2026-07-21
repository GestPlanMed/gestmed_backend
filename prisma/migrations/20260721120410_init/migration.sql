/*
  Warnings:

  - You are about to drop the `MagicLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MagicLink" DROP CONSTRAINT "MagicLink_adminId_fkey";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "password" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "whatsapp" TEXT;

-- DropTable
DROP TABLE "MagicLink";
