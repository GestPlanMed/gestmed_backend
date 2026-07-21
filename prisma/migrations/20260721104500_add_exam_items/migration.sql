-- CreateTable
CREATE TABLE "ExamItem" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamItem_pkey" PRIMARY KEY ("id")
);

-- Migrate existing exams (1 fileKey -> 1 item each)
INSERT INTO "ExamItem" ("id", "examId", "fileKey", "createdAt")
SELECT "id" || '-item', "id", "fileKey", "createdAt"
FROM "Exam";

-- DropColumn
ALTER TABLE "Exam" DROP COLUMN "fileKey";

-- CreateIndex
CREATE INDEX "ExamItem_examId_idx" ON "ExamItem"("examId");

-- AddForeignKey
ALTER TABLE "ExamItem" ADD CONSTRAINT "ExamItem_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
