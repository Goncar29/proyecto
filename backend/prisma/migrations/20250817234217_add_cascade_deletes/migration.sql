/*
  Warnings:

  - A unique constraint covering the columns `[timeBlockId,patientId]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId,startTime,endTime]` on the table `TimeBlock` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "TimeBlock" DROP CONSTRAINT "TimeBlock_doctorId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_timeBlockId_patientId_key" ON "Appointment"("timeBlockId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeBlock_doctorId_startTime_endTime_key" ON "TimeBlock"("doctorId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
