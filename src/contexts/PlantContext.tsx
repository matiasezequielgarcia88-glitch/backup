import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Plant, ActivityLog, PlantMaterial, Installation, PlantState, Genetic, Warehouse, CultivationType } from '@/types/cultivation';
import {
  initialMockActivityLogs,
  initialMockPlantMaterials,
  mockInstallations as initialMockInstallations,
  generateCloneSerialNumbers
} from '@/data/mockData';

interface CloneGenerationData {
  motherPlantId: string;
  quantity: number;
  targetInstallationId: string;
  targetWarehouseId: string;
  notes?: string;
}

interface MovePlantData {
  plantId: string;
  targetInstallationId: string;
  targetWarehouseId: string;
}

interface MoveMaterialData {
  materialId: string;
  gramsToMove: number;
  targetInstallationId: string;
  targetWarehouseId: string;
}

interface PlantContextType {
  plants: Plant[];
  activityLogs: ActivityLog[];
  plantMaterials: PlantMaterial[];
  installations: Installation[];
  warehouses: Warehouse[];
  genetics: Genetic[];
  generateClones: (data: CloneGenerationData) => Plant[];
  addPlant: (plant: Plant) => Promise<void>;
  updatePlant: (id: string, updates: Partial<Plant>) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  getPlantById: (id: string) => Plant | undefined;
  getPlantState: (plant: Plant) => PlantState;
  movePlant: (data: MovePlantData) => void;
  moveMaterial: (data: MoveMaterialData) => void;
  addPlantMaterial: (material: PlantMaterial) => void;
  updatePlantMaterial: (id: string, updates: Partial<PlantMaterial>) => void;
  updateInstallationState: (installationId: string, state: PlantState) => void;
  addGenetic: (genetic: Genetic) => Promise<void>;
  updateGenetic: (id: string, updates: Partial<Genetic>) => Promise<void>;
  deleteGenetic: (id: string) => Promise<void>;
  clearInstallationPlants: (installationId: string) => Promise<void>;
  clearWarehousePlants: (warehouseId: string) => Promise<void>;
  addWarehouse: (warehouse: Warehouse) => Promise<void>;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  addInstallation: (installation: Installation) => Promise<void>;
  updateInstallation: (id: string, updates: Partial<Installation>) => Promise<void>;
  deleteInstallation: (id: string) => Promise<void>;
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialMockActivityLogs);
  const [plantMaterials, setPlantMaterials] = useState<PlantMaterial[]>(initialMockPlantMaterials);
  const [installations, setInstallations] = useState<Installation[]>(initialMockInstallations);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [genetics, setGenetics] = useState<Genetic[]>([]);

  const addWarehouse = useCallback(async (warehouse: Warehouse) => {
    setWarehouses(prev => [...prev, warehouse]);
  }, []);

  const updateWarehouse = useCallback(async (id: string, updates: Partial<Warehouse>) => {
    setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const deleteWarehouse = useCallback(async (id: string) => {
    setPlants(prev => prev.filter(p => !installations.filter(i => i.warehouseId === id).map(i => i.id).includes(p.installationId)));
    setInstallations(prev => prev.filter(i => i.warehouseId !== id));
    setWarehouses(prev => prev.filter(w => w.id !== id));
  }, [installations]);

  const addInstallation = useCallback(async (installation: Installation) => {
    setInstallations(prev => [...prev, installation]);
  }, []);

  const updateInstallation = useCallback(async (id: string, updates: Partial<Installation>) => {
    setInstallations(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const deleteInstallation = useCallback(async (id: string) => {
    setPlants(prev => prev.filter(p => p.installationId !== id));
    setInstallations(prev => prev.filter(i => i.id !== id));
  }, []);

  const addGenetic = useCallback(async (genetic: Genetic) => {
    setGenetics(prev => [...prev, genetic]);
  }, []);

  const updateGenetic = useCallback(async (id: string, updates: Partial<Genetic>) => {
    setGenetics(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const deleteGenetic = useCallback(async (id: string) => {
    setGenetics(prev => prev.filter(g => g.id !== id));
  }, []);

  const clearInstallationPlants = useCallback(async (installationId: string) => {
    setPlants(prev => prev.filter(p => p.installationId !== installationId));
  }, []);

  const clearWarehousePlants = useCallback(async (warehouseId: string) => {
    const instIds = installations.filter(i => i.warehouseId === warehouseId).map(i => i.id);
    setPlants(prev => prev.filter(p => !instIds.includes(p.installationId)));
  }, [installations]);

  const getPlantById = useCallback((id: string) => {
    return plants.find(p => p.id === id);
  }, [plants]);

  const getPlantState = useCallback((plant: Plant): PlantState => {
    const inst = installations.find(i => i.id === plant.installationId);
    return inst?.state || plant.state;
  }, [installations]);

  const addPlant = useCallback(async (plant: Plant) => {
    setPlants(prev => [...prev, plant]);
  }, []);

  const updatePlant = useCallback(async (id: string, updates: Partial<Plant>) => {
    setPlants(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p));
  }, []);

  const deletePlant = useCallback(async (id: string) => {
    setPlants(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateInstallationState = useCallback((installationId: string, newState: PlantState) => {
    setInstallations(prev => prev.map(inst => inst.id === installationId ? { ...inst, state: newState } : inst));
    setPlants(prev => prev.map(p => p.installationId === installationId ? { ...p, state: newState, updatedAt: new Date() } : p));
  }, []);

  const movePlant = useCallback((data: MovePlantData) => {
    const targetInst = installations.find(i => i.id === data.targetInstallationId);
    setPlants(prev => prev.map(p =>
      p.id === data.plantId
        ? { ...p, installationId: data.targetInstallationId, warehouseId: data.targetWarehouseId, state: targetInst?.state || p.state, updatedAt: new Date() }
        : p
    ));
  }, [installations]);

  const generateClones = useCallback((data: CloneGenerationData): Plant[] => {
    const motherPlant = plants.find(p => p.id === data.motherPlantId);
    if (!motherPlant) return [];
    const genetic = genetics.find(g => g.id === motherPlant.geneticId);
    if (!genetic) return [];
    const targetInst = installations.find(i => i.id === data.targetInstallationId);
    const newSerialNumbers = generateCloneSerialNumbers(motherPlant, data.quantity, plants);
    const now = new Date();
    const lotNumber = `${genetic.name.substring(0, 3).toUpperCase()}${now.toISOString().slice(2, 10).replace(/-/g, '')}`;
    const newPlants: Plant[] = newSerialNumbers.map((serialNumber, index) => ({
      id: `plant-clone-${Date.now()}-${index}`,
      name: `${genetic.name} Clon ${index + 1}`,
      serialNumber,
      lotNumber,
      geneticId: motherPlant.geneticId,
      chemotypeCode: motherPlant.chemotypeCode,
      state: targetInst?.state || ('esqueje' as const),
      plantingDate: now,
      predecessorId: motherPlant.id,
      installationId: data.targetInstallationId,
      warehouseId: data.targetWarehouseId,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    }));
    setPlants(prev => [...prev, ...newPlants]);
    return newPlants;
  }, [plants, installations, genetics]);

  const moveMaterial = useCallback((data: MoveMaterialData) => {
    const material = plantMaterials.find(m => m.id === data.materialId);
    if (!material) return;
    const now = new Date();
    const isPartial = data.gramsToMove < material.weightGrams;
    if (isPartial) {
      setPlantMaterials(prev => prev.map(m =>
        m.id === data.materialId ? { ...m, weightGrams: Math.round((m.weightGrams - data.gramsToMove) * 10) / 10, updatedAt: now } : m
      ));
      setPlantMaterials(prev => [...prev, {
        id: `mat-${Date.now()}`, code: `${material.code}-S`, plantId: material.plantId,
        weightGrams: data.gramsToMove, state: material.state,
        installationId: data.targetInstallationId, warehouseId: data.targetWarehouseId,
        createdAt: now, updatedAt: now,
      }]);
    } else {
      setPlantMaterials(prev => prev.map(m =>
        m.id === data.materialId ? { ...m, installationId: data.targetInstallationId, warehouseId: data.targetWarehouseId, updatedAt: now } : m
      ));
    }
  }, [plantMaterials]);

  const addPlantMaterial = useCallback((material: PlantMaterial) => {
    setPlantMaterials(prev => [...prev, material]);
  }, []);

  const updatePlantMaterial = useCallback((id: string, updates: Partial<PlantMaterial>) => {
    setPlantMaterials(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m));
  }, []);

  return (
    <PlantContext.Provider value={{
      plants, activityLogs, plantMaterials, installations, warehouses, genetics,
      generateClones, addPlant, updatePlant, deletePlant, getPlantById, getPlantState,
      movePlant, moveMaterial, addPlantMaterial, updatePlantMaterial, updateInstallationState,
      addGenetic, updateGenetic, deleteGenetic, clearInstallationPlants, clearWarehousePlants,
      addWarehouse, updateWarehouse, deleteWarehouse, addInstallation, updateInstallation, deleteInstallation,
    }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlants() {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlants must be used within a PlantProvider');
  }
  return context;
}
