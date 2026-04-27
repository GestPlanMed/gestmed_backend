CREATE TABLE "UserActionLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "userRole" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserActionLog_userId_idx" ON "UserActionLog"("userId");
CREATE INDEX "UserActionLog_createdAt_idx" ON "UserActionLog"("createdAt");
