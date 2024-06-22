-- AlterTable
ALTER TABLE "systems" ADD COLUMN     "last_failure_screenshot" TIMESTAMP(3),
ADD COLUMN     "last_success_screenshot" TIMESTAMP(3);
