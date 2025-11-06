-- DropIndex
DROP INDEX "public"."cargo_nivel_key";

-- CreateIndex
CREATE INDEX "cargo_nivel_idx" ON "cargo"("nivel");
