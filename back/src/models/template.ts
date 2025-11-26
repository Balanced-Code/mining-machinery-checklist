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
