/**
 * Colores para badges y avatares según el nivel del cargo
 */
export interface CargoColors {
  background: string;
  text: string;
  border: string;
}

/**
 * Paleta de colores por nivel (1-4)
 */
const COLOR_PALETTE: CargoColors[] = [
  // Nivel 1 - Operador (Ámbar/Naranja)
  {
    background: '#fef3c7',
    text: '#f59e0b',
    border: '#fcd34d',
  },
  // Nivel 2 - Supervisor (Azul)
  {
    background: '#dbeafe',
    text: '#2563eb',
    border: '#93c5fd',
  },
  // Nivel 3 - Inspector (Verde)
  {
    background: '#d1fae5',
    text: '#10b981',
    border: '#6ee7b7',
  },
  // Nivel 4 - Administrador (Rojo Normet)
  {
    background: '#fee2e2',
    text: '#ed1b2e',
    border: '#fca5a5',
  },
];

/**
 * Obtiene los colores correspondientes al nivel del cargo
 * @param nivel - Nivel del cargo (1-4)
 * @returns Objeto con colores de fondo, texto y borde
 */
export function getCargoColors(nivel: number): CargoColors {
  // Validar que el nivel esté en el rango válido
  if (nivel < 1 || nivel > 4) {
    console.warn(`Nivel de cargo inválido: ${nivel}. Usando nivel 1 por defecto.`);
    return COLOR_PALETTE[0];
  }

  return COLOR_PALETTE[nivel - 1];
}

/**
 * Obtiene solo el color de fondo del avatar
 * @param nivel - Nivel del cargo (1-4)
 * @returns Color hexadecimal del fondo
 */
export function getAvatarBackground(nivel: number): string {
  return getCargoColors(nivel).text; // Usamos el color del texto como fondo del avatar
}
