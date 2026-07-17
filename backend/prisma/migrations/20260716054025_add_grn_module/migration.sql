-- CreateTable
CREATE TABLE "grns" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "dc_number" TEXT NOT NULL,
    "dc_date" TIMESTAMP(3) NOT NULL,
    "grn_number" TEXT NOT NULL,
    "grn_date" TIMESTAMP(3) NOT NULL,
    "discrepancy_reported" BOOLEAN NOT NULL DEFAULT false,
    "store_remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Awaiting IQC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" SERIAL NOT NULL,
    "grn_id" INTEGER NOT NULL,
    "part_number" TEXT NOT NULL,
    "dc_quantity" INTEGER,
    "received_quantity" INTEGER NOT NULL,
    "variance_status" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grns_grn_number_key" ON "grns"("grn_number");

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
