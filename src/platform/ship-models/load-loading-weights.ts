import {shipResourceUrl} from '../../core/domain/ship-resource';
import type { ShipModelPackage } from '../../core/domain/ship-model';
import type { LoadingWeight } from '../../core/domain/loading-condition';

export async function loadLoadingWeights(ship: ShipModelPackage): Promise<LoadingWeight[]> {
  const resource = ship.manifest.resources.find(item => item.kind === 'loading.operational-weights') ?? ship.manifest.resources.find(item => item.kind === 'loading.weights');
  if (!resource) return [];
  if (!resource.path) throw new Error('Loading weights resource is missing its path.');
  const response = await fetch(shipResourceUrl(ship,resource.path!));
  if (!response.ok) throw new Error('Could not load the model’s loading weights.');
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Loading weights must be a JSON array.');
  const ids = new Set<string>();
  for (const item of data) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id) || typeof item.name !== 'string' ||
      !['massTonnes', 'lcg', 'vcg', 'tcg'].every(key => typeof item[key] === 'number' && Number.isFinite(item[key])) || item.massTonnes < 0) {
      throw new Error('Invalid loading weight: unique id, name, non-negative mass and finite coordinates are required.');
    }
    if (item.freeSurfaceMomentTransverse !== undefined && (typeof item.freeSurfaceMomentTransverse !== 'number' || !Number.isFinite(item.freeSurfaceMomentTransverse) || item.freeSurfaceMomentTransverse < 0)) {
      throw new Error('Loading transverse FSM must be finite and non-negative (t·m).');
    }
    ids.add(item.id);
  }
  return data as LoadingWeight[];
}
