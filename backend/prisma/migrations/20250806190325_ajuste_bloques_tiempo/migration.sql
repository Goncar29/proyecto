/*
  Warnings:

  - Added the required column `doctorId` to the `TimeBlock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TimeBlock" ADD COLUMN     "doctorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
