-- CreateTable
CREATE TABLE "public"."UserHeadframe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" "public"."HeadframeCode" NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserHeadframe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHeadframe_userId_expiresAt_idx" ON "public"."UserHeadframe"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserHeadframe_userId_code_key" ON "public"."UserHeadframe"("userId", "code");

-- AddForeignKey
ALTER TABLE "public"."UserHeadframe" ADD CONSTRAINT "UserHeadframe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
