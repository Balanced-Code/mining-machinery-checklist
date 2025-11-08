/**
 * Ítem individual dentro de un checklist template
 */
export interface ChecklistItem {
  id: number;
  orden: number;
  descripcion: string;
  checklistTemplateId?: number;
}

/**
 * Template de checklist (plantilla reutilizable)
 */
export interface ChecklistTemplate {
  id: number;
  titulo: string;
  items: ChecklistItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * DTO para crear un nuevo template
 */
export interface CreateChecklistTemplateDto {
  titulo: string;
}

/**
 * DTO para actualizar un template
 */
export interface UpdateChecklistTemplateDto {
  titulo?: string;
}

/**
 * DTO para crear un ítem
 */
export interface CreateChecklistItemDto {
  descripcion: string;
  orden: number;
}

/**
 * DTO para actualizar un ítem
 */
export interface UpdateChecklistItemDto {
  descripcion?: string;
  orden?: number;
}

/**
 * Respuesta de listado de templates
 */
export interface ChecklistTemplatesResponse {
  templates: ChecklistTemplate[];
  total: number;
}

/**
 * Respuesta genérica de operaciones
 */
export interface ChecklistOperationResponse {
  success: boolean;
  message: string;
  template?: ChecklistTemplate;
  item?: ChecklistItem;
}
