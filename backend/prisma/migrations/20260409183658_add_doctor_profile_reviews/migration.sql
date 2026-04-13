-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "specialty" TEXT NOT NULL,
    "specialties" TEXT[],
    "hospital" TEXT,
    "location" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "doctorProfileId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewVote" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE INDEX "DoctorProfile_specialty_idx" ON "DoctorProfile"("specialty");

-- CreateIndex
CREATE INDEX "DoctorProfile_location_idx" ON "DoctorProfile"("location");

-- CreateIndex
CREATE INDEX "DoctorProfile_avgRating_idx" ON "DoctorProfile"("avgRating");

-- CreateIndex
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");

-- CreateIndex
CREATE INDEX "Review_doctorProfileId_idx" ON "Review"("doctorProfileId");

-- CreateIndex
CREATE INDEX "Review_patientId_idx" ON "Review"("patientId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "ReviewVote_userId_idx" ON "ReviewVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_userId_key" ON "ReviewVote"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "TimeBlock_doctorId_startTime_idx" ON "TimeBlock"("doctorId", "startTime");

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: enforce Review.rating ∈ [1,5] at the database level (defense in depth beside Joi validation)
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
