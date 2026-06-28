-- AlterTable Unit: add spaced-repetition fields
ALTER TABLE "Unit" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Unit" ADD COLUMN "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "Unit" ADD COLUMN "reviewIntervalDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable Resource: add file keys and tags
ALTER TABLE "Resource" ADD COLUMN "imageKey" TEXT;
ALTER TABLE "Resource" ADD COLUMN "fileKey" TEXT;
ALTER TABLE "Resource" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable Course: add shareToken
ALTER TABLE "Course" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Course_shareToken_key" ON "Course"("shareToken");

-- CreateTable StudySession
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
