-- DropForeignKey
ALTER TABLE "public"."AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropIndex
DROP INDEX "public"."Appointment_timeBlockId_patientId_key";

-- AlterTable
ALTER TABLE "public"."TimeBlock" ALTER COLUMN "date" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "public"."Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "public"."Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_date_idx" ON "public"."Appointment"("date");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "public"."Appointment"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "TimeBlock_doctorId_idx" ON "public"."TimeBlock"("doctorId");

-- CreateIndex
CREATE INDEX "TimeBlock_date_idx" ON "public"."TimeBlock"("date");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "public"."User"("isActive");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
