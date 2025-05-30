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


export type ProtocolType = "fate" | "fast" | "rush" | "blue" | "focus";

export interface Protocol {
  id?: string;
  name: string;
  description: string;
  type: ProtocolType;
  createdAt?: string;
  updatedAt?: string;
}
  

// Tipo para la función principal
export type SeedTagHierarchy = () => Promise<void>; 