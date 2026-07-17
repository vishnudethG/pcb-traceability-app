/*
  Warnings:

  - You are about to drop the column `model_id` on the `bom_items` table. All the data in the column will be lost.
  - You are about to drop the column `inspection_date` on the `inspection_lots` table. All the data in the column will be lost.
  - You are about to drop the column `model_id` on the `inspection_lots` table. All the data in the column will be lost.
  - You are about to drop the column `bom_version` on the `models` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customer_id,project_name]` on the table `models` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bom_revision_id` to the `bom_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bom_revision_id` to the `inspection_lots` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `models` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bom_items" DROP CONSTRAINT "bom_items_model_id_fkey";

-- DropForeignKey
ALTER TABLE "inspection_lots" DROP CONSTRAINT "inspection_lots_model_id_fkey";

-- DropIndex
DROP INDEX "models_project_name_bom_version_key";

-- AlterTable
ALTER TABLE "bom_items" DROP COLUMN "model_id",
ADD COLUMN     "bom_revision_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "manufacturer" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "value" DROP NOT NULL,
ALTER COLUMN "package" DROP NOT NULL,
ALTER COLUMN "tolerance" DROP NOT NULL;

-- AlterTable
ALTER TABLE "inspection_lots" DROP COLUMN "inspection_date",
DROP COLUMN "model_id",
ADD COLUMN     "bom_revision_id" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "models" DROP COLUMN "bom_version",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "bom_revisions" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "version_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bom_revisions_model_id_version_name_key" ON "bom_revisions"("model_id", "version_name");

-- CreateIndex
CREATE UNIQUE INDEX "models_customer_id_project_name_key" ON "models"("customer_id", "project_name");

-- AddForeignKey
ALTER TABLE "bom_revisions" ADD CONSTRAINT "bom_revisions_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_revision_id_fkey" FOREIGN KEY ("bom_revision_id") REFERENCES "bom_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_lots" ADD CONSTRAINT "inspection_lots_bom_revision_id_fkey" FOREIGN KEY ("bom_revision_id") REFERENCES "bom_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
