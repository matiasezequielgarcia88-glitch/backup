// Plant states
export type PlantState = 'madre' | 'esqueje' | 'vegetativo' | 'floracion';

// Cultivation type
export type CultivationType = 'indoor' | 'outdoor' | 'invernadero';

// Chemotype - now defined as a separate entity
export type ChemotypeCode = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Chemotype {
  code: ChemotypeCode;
  name: string;
  description: string;
}

// Predefined chemotypes
export const CHEMOTYPES: Record<ChemotypeCode, Chemotype> = {
  I: { code: 'I', name: 'Tipo I', description: 'THC dominante (>0.5% THC, <0.5% CBD)' },
  II: { code: 'II', name: 'Tipo II', description: 'THC/CBD balanceado' },
  III: { code: 'III', name: 'Tipo III', description: 'CBD dominante (<0.5% THC, >0.5% CBD)' },
  IV: { code: 'IV', name: 'Tipo IV', description: 'CBG dominante' },
  V: { code: 'V', name: 'Tipo V', description: 'Sin cannabinoides detectables' },
};

// Genetic (Variedad) - now linked to chemotype
export interface Genetic {
  id: string;
  name: string;
  chemotypeCode: ChemotypeCode;
  thcRange?: string;
  cbdRange?: string;
  description?: string;
}

// Warehouse (Almacén)
export interface Warehouse {
  id: string;
  name: string;
  description?: string;
  type: CultivationType;
  createdAt: Date;
}

// Installation (Instalación dentro del almacén)
export interface Installation {
  id: string;
  warehouseId: string;
  name: string;
  description?: string;
  state?: PlantState; // Estado de cultivo de la instalación
  createdAt: Date;
}

// Plant (Planta)
export interface Plant {
  id: string;
  name: string; // Nombre personalizado de la planta
  serialNumber: string; // Código único irrepetible
  lotNumber: string; // Número de lote (ej: ACW220725)
  geneticId?: string; // ID de la genética (variedad) - opcional
  chemotypeCode: ChemotypeCode; // Quimiotipo propio de la planta
  state: PlantState;
  plantingDate: Date;
  predecessorId?: string; // ID de la planta madre (para clones)
  installationId: string;
  warehouseId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Activity log entry (Bitácora)
export interface ActivityLog {
  id: string;
  type: 'esquejado' | 'trasplante' | 'movimiento' | 'cambio_estado' | 'sanitario';
  description: string;
  plantIds: string[];
  sourceInstallationId?: string;
  targetInstallationId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Environmental parameters (optional)
export interface EnvironmentalReading {
  id: string;
  installationId: string;
  temperature: number;
  humidity: number;
  vpd?: number;
  recordedAt: Date;
}

// Dashboard stats
export interface DashboardStats {
  totalPlants: number;
  byState: Record<PlantState, number>;
  byGenetic: Record<string, number>;
  byChemotype: Record<ChemotypeCode, number>;
  recentActivity: ActivityLog[];
}

// Plant Material (Materia Vegetal)
export interface PlantMaterial {
  id: string;
  code: string; // Related to plant serial number (e.g., MV-OGI-2500001)
  plantId: string;
  weightGrams: number;
  state: 'fresco' | 'secado' | 'curado' | 'almacenado';
  installationId: string;
  warehouseId: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Clone generation request
export interface CloneGenerationRequest {
  motherPlantId: string;
  quantity: number;
  targetInstallationId: string;
  notes?: string;
}
