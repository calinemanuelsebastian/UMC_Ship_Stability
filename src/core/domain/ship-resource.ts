import type {ShipModelPackage} from './ship-model';
/** Same canonical manifest for hosted and local packages; runtime URLs are separate. */
export function shipResourceUrl(ship:ShipModelPackage,path:string):string{
 if(ship.resourceUrls){const url=ship.resourceUrls[path];if(!url)throw new Error(`Missing local ship resource: ${path}`);return url;}
 return ship.baseUrl+path;
}
