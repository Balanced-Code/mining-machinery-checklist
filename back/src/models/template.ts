export interface TemplateSeccionDetails {
  id: number;
  nombre: string;
  orden: number;
}

export interface TemplateDetails {
  id: number;
  nombre: string;
  secciones: TemplateSeccionDetails[];
}

export interface NewTemplateData {
  id: number;
  nombre: string;
}

export interface NewSeccionData {
  id: number;
  nombre: string;
  templateId: number;
  orden: number;
}

export interface UpdateSeccionData {
  nombre?: string;
  orden?: number;
}
