-- CreateTable
CREATE TABLE "Appintment" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "timeBlockId" INTEGER NOT NULL,

    CONSTRAINT "Appintment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appintment" ADD CONSTRAINT "Appintment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appintment" ADD CONSTRAINT "Appintment_timeBlockId_fkey" FOREIGN KEY ("timeBlockId") REFERENCES "TimeBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
