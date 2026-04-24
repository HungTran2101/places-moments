-- CreateTable
CREATE TABLE "future_messages" (
    "id" TEXT NOT NULL,
    "author_uuid" TEXT NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "unlock_condition" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlocked_at" TIMESTAMP(3),

    CONSTRAINT "future_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(600) NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "weather_summary" TEXT,
    "weather_code" INTEGER,
    "author_uuid" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "future_messages_author_uuid_idx" ON "future_messages"("author_uuid");

-- CreateIndex
CREATE INDEX "submissions_author_uuid_idx" ON "submissions"("author_uuid");

-- CreateIndex
CREATE INDEX "submissions_lat_lng_idx" ON "submissions"("lat", "lng");
