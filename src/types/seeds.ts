// Interfaces para las estructuras de datos
export interface Organ {
  name: string;
}

export interface Structure {
  name: string;
  organ: string;
}

export interface Condition {
  name: string;
  structure: string;
}

export interface Tag {
  name: string;
  condition: string;
  structure: string;
}

// Tipo para los mapas de IDs
export interface IdMap {
  [key: string]: number;
}

// Tipo para la función principal
export type SeedTagHierarchy = () => Promise<void>; 