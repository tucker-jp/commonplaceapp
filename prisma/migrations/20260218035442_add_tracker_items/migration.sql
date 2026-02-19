-- CreateEnum
CREATE TYPE "TrackerType" AS ENUM ('BOOK', 'MOVIE', 'MUSIC');

-- CreateEnum
CREATE TYPE "TrackerStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TrackerSource" AS ENUM ('MANUAL', 'NOTE_AUTO', 'IMPORT');

-- CreateTable
CREATE TABLE "TrackerItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TrackerType" NOT NULL,
    "status" "TrackerStatus" NOT NULL DEFAULT 'PLANNED',
    "title" TEXT NOT NULL,
    "titleNormalized" TEXT NOT NULL,
    "creator" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "tags" TEXT[],
    "source" "TrackerSource" NOT NULL DEFAULT 'MANUAL',
    "isRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "sourceNoteId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackerItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackerItem_userId_idx" ON "TrackerItem"("userId");

-- CreateIndex
CREATE INDEX "TrackerItem_type_idx" ON "TrackerItem"("type");

-- CreateIndex
CREATE INDEX "TrackerItem_status_idx" ON "TrackerItem"("status");

-- CreateIndex
CREATE INDEX "TrackerItem_sourceNoteId_idx" ON "TrackerItem"("sourceNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerItem_userId_type_titleNormalized_key" ON "TrackerItem"("userId", "type", "titleNormalized");

-- AddForeignKey
ALTER TABLE "TrackerItem" ADD CONSTRAINT "TrackerItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerItem" ADD CONSTRAINT "TrackerItem_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
