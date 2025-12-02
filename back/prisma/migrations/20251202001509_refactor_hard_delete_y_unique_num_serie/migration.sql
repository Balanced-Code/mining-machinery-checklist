/*
  Warnings:

  - You are about to drop the column `eliminado_en` on the `asignacion_inspeccion` table. All the data in the column will be lost.
  - You are about to drop the column `eliminado_por` on the `asignacion_inspeccion` table. All the data in the column will be lost.
  - You are about to drop the column `eliminado_en` on the `eleccion_respuesta` table. All the data in the column will be lost.
  - You are about to drop the column `eliminado_por` on the `eleccion_respuesta` table. All the data in the column will be lost.
  - You are about to drop the column `eliminado_en` on the `eleccion_template` table. All the data in the column will be lost.
  - You are about to drop the column `eliminado_por` on the `eleccion_template` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[inspeccion_id,usuario_id]` on the table `asignacion_inspeccion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eleccion_template_id,template_seccion_id]` on the table `eleccion_respuesta` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inspeccion_id,template_id]` on the table `eleccion_template` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[num_serie]` on the table `inspeccion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "asignacion_inspeccion" DROP CONSTRAINT "asignacion_inspeccion_eliminado_por_fkey";

-- DropForeignKey
ALTER TABLE "eleccion_respuesta" DROP CONSTRAINT "eleccion_respuesta_eliminado_por_fkey";

-- DropForeignKey
ALTER TABLE "eleccion_template" DROP CONSTRAINT "eleccion_template_eliminado_por_fkey";

-- DropIndex
DROP INDEX "asignacion_inspeccion_eliminado_en_idx";

-- DropIndex
DROP INDEX "asignacion_inspeccion_inspeccion_id_usuario_id_eliminado_en_key";

-- DropIndex
DROP INDEX "eleccion_respuesta_eleccion_template_id_template_seccion_id_key";

-- DropIndex
DROP INDEX "eleccion_respuesta_eliminado_en_idx";

-- DropIndex
DROP INDEX "eleccion_template_eliminado_en_idx";

-- DropIndex
DROP INDEX "eleccion_template_inspeccion_id_template_id_eliminado_en_key";

-- DropIndex
DROP INDEX "inspeccion_num_serie_idx";

-- AlterTable
ALTER TABLE "asignacion_inspeccion" DROP COLUMN "eliminado_en",
DROP COLUMN "eliminado_por";

-- AlterTable
ALTER TABLE "eleccion_respuesta" DROP COLUMN "eliminado_en",
DROP COLUMN "eliminado_por";

-- AlterTable
ALTER TABLE "eleccion_template" DROP COLUMN "eliminado_en",
DROP COLUMN "eliminado_por";

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_inspeccion_inspeccion_id_usuario_id_key" ON "asignacion_inspeccion"("inspeccion_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "eleccion_respuesta_eleccion_template_id_template_seccion_id_key" ON "eleccion_respuesta"("eleccion_template_id", "template_seccion_id");

-- CreateIndex
CREATE UNIQUE INDEX "eleccion_template_inspeccion_id_template_id_key" ON "eleccion_template"("inspeccion_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspeccion_num_serie_key" ON "inspeccion"("num_serie");
