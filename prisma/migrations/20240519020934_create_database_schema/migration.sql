-- CreateTable
CREATE TABLE "pings" (
    "id" SERIAL NOT NULL,
    "system_id" INTEGER,
    "latency" DECIMAL(65,30),
    "http_status" INTEGER NOT NULL,
    "body_length" INTEGER,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systems" (
    "id" SERIAL NOT NULL,
    "host" TEXT NOT NULL,
    "uri" TEXT,
    "jurisdiction" TEXT,
    "programs" TEXT,
    "name" TEXT,

    CONSTRAINT "systems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_systems_host" ON "systems"("host");
