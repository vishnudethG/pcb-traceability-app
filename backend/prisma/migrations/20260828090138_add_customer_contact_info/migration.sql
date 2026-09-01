/*
  Warnings:

  - A unique constraint covering the columns `[traceability_id]` on the table `iqir_records` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "iqir_records" ADD COLUMN     "traceability_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "iqir_records_traceability_id_key" ON "iqir_records"("traceability_id");
