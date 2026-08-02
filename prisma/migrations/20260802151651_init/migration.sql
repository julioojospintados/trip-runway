-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SeasonRisk" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "iataCity" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dailyCostGround" DECIMAL(10,2) NOT NULL,
    "fixedExtras" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateSeasonality" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "riskLevel" "SeasonRisk" NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateSeasonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAdvisory" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityAdvisory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackedRoute" (
    "id" TEXT NOT NULL,
    "originIata" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "departureYear" INTEGER NOT NULL,
    "departureMonth" INTEGER NOT NULL,
    "lastPrice" DECIMAL(10,2),
    "priceSource" TEXT,
    "lastCheckedAt" TIMESTAMP(3),

    CONSTRAINT "TrackedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackedRouteId" TEXT NOT NULL,
    "totalBudget" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_iataCity_key" ON "Destination"("iataCity");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateSeasonality_destinationId_month_key" ON "ClimateSeasonality"("destinationId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityAdvisory_destinationId_key" ON "SecurityAdvisory"("destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedRoute_originIata_destinationId_departureYear_departu_key" ON "TrackedRoute"("originIata", "destinationId", "departureYear", "departureMonth");

-- CreateIndex
CREATE UNIQUE INDEX "SavedRoute_userId_trackedRouteId_key" ON "SavedRoute"("userId", "trackedRouteId");

-- AddForeignKey
ALTER TABLE "ClimateSeasonality" ADD CONSTRAINT "ClimateSeasonality_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAdvisory" ADD CONSTRAINT "SecurityAdvisory_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackedRoute" ADD CONSTRAINT "TrackedRoute_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedRoute" ADD CONSTRAINT "SavedRoute_trackedRouteId_fkey" FOREIGN KEY ("trackedRouteId") REFERENCES "TrackedRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
