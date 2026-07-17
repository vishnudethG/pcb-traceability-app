-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "project_name" TEXT NOT NULL,
    "bom_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "mpn" TEXT NOT NULL,
    "designator" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "quantity_per_board" INTEGER NOT NULL,
    "alternative_part_no" TEXT,
    "package" TEXT NOT NULL,
    "tolerance" TEXT NOT NULL,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_settings" (
    "id" SERIAL NOT NULL,
    "document_no" TEXT NOT NULL,
    "revision_number" TEXT NOT NULL,
    "revision_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_lots" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "document_setting_id" INTEGER NOT NULL,
    "customer_dc_number" TEXT NOT NULL,
    "work_order_number" TEXT NOT NULL,
    "work_order_date" TIMESTAMP(3) NOT NULL,
    "kit_quantity" INTEGER NOT NULL,
    "inspection_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iqir_records" (
    "id" SERIAL NOT NULL,
    "inspection_lot_id" INTEGER NOT NULL,
    "bom_item_id" INTEGER NOT NULL,
    "received_make" TEXT NOT NULL,
    "received_mpn" TEXT NOT NULL,
    "measured_value" TEXT NOT NULL,
    "bodymark_package" TEXT NOT NULL,
    "date_code_lot_number" TEXT NOT NULL,
    "msl_level" TEXT NOT NULL,
    "inspector_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "remarks" TEXT,

    CONSTRAINT "iqir_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customers_company_name_key" ON "customers"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE UNIQUE INDEX "models_project_name_bom_version_key" ON "models"("project_name", "bom_version");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_lots" ADD CONSTRAINT "inspection_lots_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_lots" ADD CONSTRAINT "inspection_lots_document_setting_id_fkey" FOREIGN KEY ("document_setting_id") REFERENCES "document_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iqir_records" ADD CONSTRAINT "iqir_records_inspection_lot_id_fkey" FOREIGN KEY ("inspection_lot_id") REFERENCES "inspection_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iqir_records" ADD CONSTRAINT "iqir_records_bom_item_id_fkey" FOREIGN KEY ("bom_item_id") REFERENCES "bom_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iqir_records" ADD CONSTRAINT "iqir_records_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
