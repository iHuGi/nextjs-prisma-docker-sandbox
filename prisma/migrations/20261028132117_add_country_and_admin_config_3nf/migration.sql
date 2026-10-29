/*
  Warnings:

  - Made the column `momDate` on table `AgeRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dadDate` on table `AgeRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "AgeRecord" ALTER COLUMN "birthDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "momDate" SET NOT NULL,
ALTER COLUMN "momDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dadDate" SET NOT NULL,
ALTER COLUMN "dadDate" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryId" INTEGER;

-- AlterTable
ALTER TABLE "UserMetadata" ALTER COLUMN "customData" SET DEFAULT '{}';

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(5) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSection" (
    "id" SERIAL NOT NULL,
    "countryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConfigSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigQuestion" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "displayAs" TEXT NOT NULL DEFAULT 'list',
    "answerType" TEXT NOT NULL DEFAULT 'single',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "confirmAiValue" BOOLEAN NOT NULL DEFAULT false,
    "preFilledText" TEXT,
    "conditionJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConfigQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigAnswer" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isPreFilled" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "conditionJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "ConfigAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE INDEX "ConfigSection_countryId_sortOrder_idx" ON "ConfigSection"("countryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSection_countryId_name_key" ON "ConfigSection"("countryId", "name");

-- CreateIndex
CREATE INDEX "ConfigQuestion_sectionId_sortOrder_idx" ON "ConfigQuestion"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ConfigAnswer_questionId_sortOrder_idx" ON "ConfigAnswer"("questionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigSection" ADD CONSTRAINT "ConfigSection_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigQuestion" ADD CONSTRAINT "ConfigQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ConfigSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigAnswer" ADD CONSTRAINT "ConfigAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ConfigQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
