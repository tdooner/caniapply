/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `systems` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `systems` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "systems" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "idx_systems_slug" ON "systems"("slug");
