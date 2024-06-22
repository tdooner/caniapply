-- CreateTable
CREATE TABLE "screenshots" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER NOT NULL,
    "s3_path" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screenshots_pkey" PRIMARY KEY ("id")
);
