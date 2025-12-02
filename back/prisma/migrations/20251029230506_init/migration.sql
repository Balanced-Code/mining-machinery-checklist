-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "cargo_id" INTEGER NOT NULL,
    "contrasena" VARCHAR(255) NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" BIGSERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "jti" VARCHAR(255) NOT NULL,
    "issued_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP NOT NULL,
    "revoked_at" TIMESTAMP,
    "reason" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "nivel" INTEGER NOT NULL,
    "creado_por" INTEGER,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquina" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "creado_por" INTEGER,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_seccion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(250) NOT NULL,
    "template_id" INTEGER NOT NULL,
    "orden" SMALLINT NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "template_seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspeccion" (
    "id" BIGSERIAL NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_finalizacion" DATE,
    "maquina_id" INTEGER NOT NULL,
    "num_serie" VARCHAR(50) NOT NULL,
    "n_serie_motor" VARCHAR(50),
    "cabinado" BOOLEAN,
    "horometro" DECIMAL(10,2),
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleccion_template" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "inspeccion_id" BIGINT NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "eleccion_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultado_atributo_checklist" (
    "id" BIGSERIAL NOT NULL,
    "cumple" BOOLEAN,
    "observacion_id" BIGINT,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,

    CONSTRAINT "resultado_atributo_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eleccion_respuesta" (
    "id" SERIAL NOT NULL,
    "eleccion_template_id" INTEGER NOT NULL,
    "template_seccion_id" INTEGER NOT NULL,
    "resultado_atributo_checklist_id" BIGINT NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "eleccion_respuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_asignacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "creado_por" INTEGER,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "rol_asignacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignacion_inspeccion" (
    "id" SERIAL NOT NULL,
    "inspeccion_id" BIGINT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "rol_asignacion_id" INTEGER NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,
    "eliminado_por" INTEGER,
    "eliminado_en" TIMESTAMP,

    CONSTRAINT "asignacion_inspeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observacion" (
    "id" BIGSERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,

    CONSTRAINT "observacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivo" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "tamano" BIGINT NOT NULL,
    "ruta" VARCHAR(500) NOT NULL,
    "hash" CHAR(64) NOT NULL,
    "observacion_id" BIGINT,
    "creado_por" INTEGER NOT NULL,
    "creado_en" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_por" INTEGER,
    "actualizado_en" TIMESTAMP,

    CONSTRAINT "archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_operacion" (
    "id" BIGSERIAL NOT NULL,
    "tabla_afectada" VARCHAR(50) NOT NULL,
    "id_registro" BIGINT NOT NULL,
    "operacion" VARCHAR(10) NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha_operacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_operacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_detalle" (
    "id" BIGSERIAL NOT NULL,
    "auditoria_operacion_id" BIGINT NOT NULL,
    "campo_modificado" VARCHAR(100) NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "tipo_dato" VARCHAR(20) NOT NULL,

    CONSTRAINT "auditoria_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "usuario_cargo_id_idx" ON "usuario"("cargo_id");

-- CreateIndex
CREATE INDEX "usuario_correo_idx" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "usuario_eliminado_en_idx" ON "usuario"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "idx_tokens_jti" ON "tokens"("jti");

-- CreateIndex
CREATE INDEX "idx_tokens_user_active" ON "tokens"("user_id", "active");

-- CreateIndex
CREATE INDEX "idx_tokens_expires" ON "tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_nombre_key" ON "cargo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_nivel_key" ON "cargo"("nivel");

-- CreateIndex
CREATE INDEX "cargo_eliminado_en_idx" ON "cargo"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "maquina_nombre_key" ON "maquina"("nombre");

-- CreateIndex
CREATE INDEX "maquina_eliminado_en_idx" ON "maquina"("eliminado_en");

-- CreateIndex
CREATE INDEX "template_eliminado_en_idx" ON "template"("eliminado_en");

-- CreateIndex
CREATE INDEX "template_seccion_template_id_idx" ON "template_seccion"("template_id");

-- CreateIndex
CREATE INDEX "template_seccion_eliminado_en_idx" ON "template_seccion"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "template_seccion_template_id_orden_eliminado_en_key" ON "template_seccion"("template_id", "orden", "eliminado_en");

-- CreateIndex
CREATE INDEX "inspeccion_maquina_id_idx" ON "inspeccion"("maquina_id");

-- CreateIndex
CREATE INDEX "inspeccion_num_serie_idx" ON "inspeccion"("num_serie");

-- CreateIndex
CREATE INDEX "inspeccion_fecha_inicio_idx" ON "inspeccion"("fecha_inicio");

-- CreateIndex
CREATE INDEX "inspeccion_fecha_finalizacion_idx" ON "inspeccion"("fecha_finalizacion");

-- CreateIndex
CREATE INDEX "inspeccion_eliminado_en_idx" ON "inspeccion"("eliminado_en");

-- CreateIndex
CREATE INDEX "inspeccion_maquina_id_fecha_inicio_idx" ON "inspeccion"("maquina_id", "fecha_inicio");

-- CreateIndex
CREATE INDEX "eleccion_template_inspeccion_id_idx" ON "eleccion_template"("inspeccion_id");

-- CreateIndex
CREATE INDEX "eleccion_template_template_id_idx" ON "eleccion_template"("template_id");

-- CreateIndex
CREATE INDEX "eleccion_template_eliminado_en_idx" ON "eleccion_template"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "eleccion_template_inspeccion_id_template_id_eliminado_en_key" ON "eleccion_template"("inspeccion_id", "template_id", "eliminado_en");

-- CreateIndex
CREATE INDEX "resultado_atributo_checklist_observacion_id_idx" ON "resultado_atributo_checklist"("observacion_id");

-- CreateIndex
CREATE INDEX "resultado_atributo_checklist_creado_por_idx" ON "resultado_atributo_checklist"("creado_por");

-- CreateIndex
CREATE INDEX "resultado_atributo_checklist_creado_en_idx" ON "resultado_atributo_checklist"("creado_en");

-- CreateIndex
CREATE INDEX "eleccion_respuesta_eleccion_template_id_idx" ON "eleccion_respuesta"("eleccion_template_id");

-- CreateIndex
CREATE INDEX "eleccion_respuesta_template_seccion_id_idx" ON "eleccion_respuesta"("template_seccion_id");

-- CreateIndex
CREATE INDEX "eleccion_respuesta_resultado_atributo_checklist_id_idx" ON "eleccion_respuesta"("resultado_atributo_checklist_id");

-- CreateIndex
CREATE INDEX "eleccion_respuesta_eliminado_en_idx" ON "eleccion_respuesta"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "eleccion_respuesta_eleccion_template_id_template_seccion_id_key" ON "eleccion_respuesta"("eleccion_template_id", "template_seccion_id", "eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "rol_asignacion_nombre_key" ON "rol_asignacion"("nombre");

-- CreateIndex
CREATE INDEX "rol_asignacion_eliminado_en_idx" ON "rol_asignacion"("eliminado_en");

-- CreateIndex
CREATE INDEX "asignacion_inspeccion_inspeccion_id_idx" ON "asignacion_inspeccion"("inspeccion_id");

-- CreateIndex
CREATE INDEX "asignacion_inspeccion_usuario_id_idx" ON "asignacion_inspeccion"("usuario_id");

-- CreateIndex
CREATE INDEX "asignacion_inspeccion_rol_asignacion_id_idx" ON "asignacion_inspeccion"("rol_asignacion_id");

-- CreateIndex
CREATE INDEX "asignacion_inspeccion_eliminado_en_idx" ON "asignacion_inspeccion"("eliminado_en");

-- CreateIndex
CREATE UNIQUE INDEX "asignacion_inspeccion_inspeccion_id_usuario_id_eliminado_en_key" ON "asignacion_inspeccion"("inspeccion_id", "usuario_id", "eliminado_en");

-- CreateIndex
CREATE INDEX "observacion_creado_por_idx" ON "observacion"("creado_por");

-- CreateIndex
CREATE INDEX "observacion_creado_en_idx" ON "observacion"("creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "archivo_hash_key" ON "archivo"("hash");

-- CreateIndex
CREATE INDEX "archivo_observacion_id_idx" ON "archivo"("observacion_id");

-- CreateIndex
CREATE INDEX "archivo_hash_idx" ON "archivo"("hash");

-- CreateIndex
CREATE INDEX "archivo_creado_por_idx" ON "archivo"("creado_por");

-- CreateIndex
CREATE INDEX "auditoria_operacion_usuario_id_idx" ON "auditoria_operacion"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_operacion_tabla_afectada_id_registro_idx" ON "auditoria_operacion"("tabla_afectada", "id_registro");

-- CreateIndex
CREATE INDEX "auditoria_operacion_fecha_operacion_idx" ON "auditoria_operacion"("fecha_operacion");

-- CreateIndex
CREATE INDEX "auditoria_operacion_fecha_operacion_tabla_afectada_idx" ON "auditoria_operacion"("fecha_operacion", "tabla_afectada");

-- CreateIndex
CREATE INDEX "auditoria_detalle_auditoria_operacion_id_idx" ON "auditoria_detalle"("auditoria_operacion_id");

-- CreateIndex
CREATE INDEX "idx_auditoria_detalle_campo" ON "auditoria_detalle"("auditoria_operacion_id", "campo_modificado");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquina" ADD CONSTRAINT "maquina_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maquina" ADD CONSTRAINT "maquina_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_seccion" ADD CONSTRAINT "template_seccion_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_seccion" ADD CONSTRAINT "template_seccion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_seccion" ADD CONSTRAINT "template_seccion_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_seccion" ADD CONSTRAINT "template_seccion_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspeccion" ADD CONSTRAINT "inspeccion_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_template" ADD CONSTRAINT "eleccion_template_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_template" ADD CONSTRAINT "eleccion_template_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_template" ADD CONSTRAINT "eleccion_template_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_template" ADD CONSTRAINT "eleccion_template_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_template" ADD CONSTRAINT "eleccion_template_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_atributo_checklist" ADD CONSTRAINT "resultado_atributo_checklist_observacion_id_fkey" FOREIGN KEY ("observacion_id") REFERENCES "observacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_atributo_checklist" ADD CONSTRAINT "resultado_atributo_checklist_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado_atributo_checklist" ADD CONSTRAINT "resultado_atributo_checklist_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_eleccion_template_id_fkey" FOREIGN KEY ("eleccion_template_id") REFERENCES "eleccion_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_template_seccion_id_fkey" FOREIGN KEY ("template_seccion_id") REFERENCES "template_seccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_resultado_atributo_checklist_id_fkey" FOREIGN KEY ("resultado_atributo_checklist_id") REFERENCES "resultado_atributo_checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eleccion_respuesta" ADD CONSTRAINT "eleccion_respuesta_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_asignacion" ADD CONSTRAINT "rol_asignacion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rol_asignacion" ADD CONSTRAINT "rol_asignacion_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_inspeccion_id_fkey" FOREIGN KEY ("inspeccion_id") REFERENCES "inspeccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_rol_asignacion_id_fkey" FOREIGN KEY ("rol_asignacion_id") REFERENCES "rol_asignacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignacion_inspeccion" ADD CONSTRAINT "asignacion_inspeccion_eliminado_por_fkey" FOREIGN KEY ("eliminado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacion" ADD CONSTRAINT "observacion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacion" ADD CONSTRAINT "observacion_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_observacion_id_fkey" FOREIGN KEY ("observacion_id") REFERENCES "observacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivo" ADD CONSTRAINT "archivo_actualizado_por_fkey" FOREIGN KEY ("actualizado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_operacion" ADD CONSTRAINT "auditoria_operacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_detalle" ADD CONSTRAINT "auditoria_detalle_auditoria_operacion_id_fkey" FOREIGN KEY ("auditoria_operacion_id") REFERENCES "auditoria_operacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
