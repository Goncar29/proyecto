/*
  Warnings:

  - A unique constraint covering the columns `[timeBlockId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Appointment_timeBlockId_key" ON "Appointment"("timeBlockId");
