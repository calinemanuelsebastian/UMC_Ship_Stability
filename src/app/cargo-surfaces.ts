import type { ShipModelPackage } from '../core/domain/ship-model';
import type { WeightDraft } from './loading-state';
import { cargoBounds, parseArea, type CargoArea } from './cargo-layout';
/** Optional display/planning surfaces; never inject weights or calculation inputs. */
export function cargoSurfaces(ship: ShipModelPackage, mode: 'installed'|'stored'|'ashore' = 'installed'): CargoArea[] {
  const config=ship.manifest.resources.find(r=>r.kind==='loading.cargo-surfaces')?.config;
  const byMode=config?.byMode as Record<string,unknown>|undefined;
  const raw=byMode?.[mode]??config?.surfaces;
  return Array.isArray(raw)?raw.map(parseArea):[];
}
export function cargoOnSurface(w:WeightDraft,area:CargoArea):boolean {
  if(!w.footprint)return false;
  if(w.footprint.areaId)return w.footprint.areaId===area.id||!!area.sourceIds?.includes(w.footprint.areaId)||w.footprint.areaId===area.id?.replace(/-lower.*$/,'')&&!!cargoBounds(w)&&cargoBounds(w)!.xMax>area.xMin&&cargoBounds(w)!.xMin<area.xMax;
  const b=cargoBounds(w);
  return w.footprint.deckZ===area.deckZ && !!b && b.xMax>area.xMin && b.xMin<area.xMax && b.yMax>area.yMin && b.yMin<area.yMax;
}


/** Older/portable plans may omit the editor selection. Restore documented geometry,
 * retaining explicit custom areas when no documented id was supplied. */
export function restoredCargoArea(ship:ShipModelPackage,mode:'installed'|'stored'|'ashore',saved?:CargoArea):CargoArea|undefined {
  const areas=cargoSurfaces(ship,mode);
  if(!saved)return areas[0];
  if(!saved.id)return saved;
  return areas.find(a=>a.id===saved.id||a.sourceIds?.includes(saved.id!)||a.id?.startsWith(saved.id+'-lower'))??areas[0];
}
