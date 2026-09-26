-- Stage 2: каталог, баға тарихы, қалдық себептері, поставка статустары, монобукет статустары.
-- Ескі мәндер жаңаларына аударылады (деректер жоғалмайды).

CREATE TYPE "PriceType" AS ENUM ('PRICE_PER_UNIT', 'PRICE_PER_PACKAGE');
CREATE TYPE "StockReason" AS ENUM ('RECEIPT', 'DAMAGE', 'WRITE_OFF', 'RETURN', 'CORRECTION_PLUS', 'CORRECTION_MINUS');

-- ProductStatus: HIDDEN / ARCHIVED → INACTIVE
CREATE TYPE "ProductStatus_new" AS ENUM ('ACTIVE', 'INACTIVE');
ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus_new"
  USING (CASE WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE' ELSE 'INACTIVE' END)::"ProductStatus_new";
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
ALTER TYPE "ProductStatus_new" RENAME TO "ProductStatus";
DROP TYPE "ProductStatus_old";
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- SupplyStatus: PREORDER_CLOSED → PLANNED, CLOSED → COMPLETED
ALTER TABLE "Supply" ADD COLUMN "preorderOpen" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Supply" SET "preorderOpen" = true WHERE "status"::text = 'PREORDER_OPEN';
CREATE TYPE "SupplyStatus_new" AS ENUM ('PLANNED', 'PREORDER_OPEN', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Supply" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Supply" ALTER COLUMN "status" TYPE "SupplyStatus_new"
  USING (CASE "status"::text
           WHEN 'PREORDER_CLOSED' THEN 'PLANNED'
           WHEN 'CLOSED' THEN 'COMPLETED'
           ELSE "status"::text END)::"SupplyStatus_new";
ALTER TYPE "SupplyStatus" RENAME TO "SupplyStatus_old";
ALTER TYPE "SupplyStatus_new" RENAME TO "SupplyStatus";
DROP TYPE "SupplyStatus_old";
ALTER TABLE "Supply" ALTER COLUMN "status" SET DEFAULT 'PLANNED';

-- MonobouquetStatus: QUOTED → CONTACTED, ACCEPTED → CONFIRMED, CONVERTED → COMPLETED, REJECTED → CANCELLED
CREATE TYPE "MonobouquetStatus_new" AS ENUM ('NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "MonobouquetRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MonobouquetRequest" ALTER COLUMN "status" TYPE "MonobouquetStatus_new"
  USING (CASE "status"::text
           WHEN 'QUOTED' THEN 'CONTACTED'
           WHEN 'ACCEPTED' THEN 'CONFIRMED'
           WHEN 'CONVERTED' THEN 'COMPLETED'
           WHEN 'REJECTED' THEN 'CANCELLED'
           ELSE "status"::text END)::"MonobouquetStatus_new";
ALTER TYPE "MonobouquetStatus" RENAME TO "MonobouquetStatus_old";
ALTER TYPE "MonobouquetStatus_new" RENAME TO "MonobouquetStatus";
DROP TYPE "MonobouquetStatus_old";
ALTER TABLE "MonobouquetRequest" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- PriceHistory: бір жолда екі баға → әр түрге бөлек жол
ALTER TABLE "PriceHistory"
  ADD COLUMN "priceType" "PriceType",
  ADD COLUMN "oldPrice" INTEGER,
  ADD COLUMN "newPrice" INTEGER;

INSERT INTO "PriceHistory" ("id", "productId", "priceType", "oldPrice", "newPrice", "changedById", "createdAt")
SELECT "id" || '_pkg', "productId", 'PRICE_PER_PACKAGE', "oldPricePerPackage", "newPricePerPackage", "changedById", "createdAt"
FROM "PriceHistory"
WHERE "priceType" IS NULL AND "oldPricePerPackage" IS DISTINCT FROM "newPricePerPackage";

UPDATE "PriceHistory"
SET "priceType" = 'PRICE_PER_UNIT', "oldPrice" = "oldPricePerUnit", "newPrice" = "newPricePerUnit"
WHERE "priceType" IS NULL AND "oldPricePerUnit" IS DISTINCT FROM "newPricePerUnit";

DELETE FROM "PriceHistory" WHERE "priceType" IS NULL;

ALTER TABLE "PriceHistory"
  ALTER COLUMN "priceType" SET NOT NULL,
  DROP COLUMN "oldPricePerUnit",
  DROP COLUMN "newPricePerUnit",
  DROP COLUMN "oldPricePerPackage",
  DROP COLUMN "newPricePerPackage";

-- StockMovement: админ таңдаған себеп
ALTER TABLE "StockMovement" ADD COLUMN "reason" "StockReason";

-- Supply: сандар теріс болмайды
ALTER TABLE "SupplyItem"
  ADD CONSTRAINT "supply_item_quantities_nonnegative" CHECK (
    ("expectedQty" IS NULL OR "expectedQty" >= 0) AND
    ("receivedQty" IS NULL OR "receivedQty" >= 0) AND
    ("preorderLimit" IS NULL OR "preorderLimit" >= 0));
ALTER TABLE "Stock" ADD CONSTRAINT "stock_threshold_nonnegative" CHECK ("lowStockThreshold" IS NULL OR "lowStockThreshold" >= 0);

-- Құжат нөмірлері (PO-000001, TF-000001, MB-000001) — қатар жасалса да қайталанбайды
CREATE SEQUENCE IF NOT EXISTS "order_number_seq";
CREATE SEQUENCE IF NOT EXISTS "preorder_number_seq";
CREATE SEQUENCE IF NOT EXISTS "monobouquet_number_seq";
