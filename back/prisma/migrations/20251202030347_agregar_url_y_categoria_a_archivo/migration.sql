/*
  Warnings:

  - Added the required column `categoria` to the `archivo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "archivo" ADD COLUMN     "categoria" VARCHAR(50) NOT NULL,
ADD COLUMN     "url" VARCHAR(1000),
ALTER COLUMN "ruta" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "archivo_categoria_idx" ON "archivo"("categoria");
