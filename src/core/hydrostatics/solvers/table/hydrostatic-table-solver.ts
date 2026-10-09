import {sharedResults} from '../../../calculations/shared-results';
import {shipResourceUrl} from '../../../domain/ship-resource';
import type { HydrostaticResult, HydrostaticWarning } from "../../../domain/hydrostatic-result";
import type { HydrostaticSolver } from "../../hydrostatic-solver";
import { interpolateTableValue } from "../../../math/interpolation";
import { parseHydrostaticTableCsv } from "./hydrostatic-table-parser";
import {
  HYDROSTATIC_UPRIGHT_TABLE_KIND,
  type HydrostaticTableRow,
} from "./hydrostatic-table-types";

export const hydrostaticTableSolver: HydrostaticSolver = {
  id: "hydrostatic-table-solver",
  label: "Hydrostatic Table Solver",
  supportedResourceKinds: [HYDROSTATIC_UPRIGHT_TABLE_KIND],

  canSolve(resource) {
    return resource.kind === HYDROSTATIC_UPRIGHT_TABLE_KIND;
  },

  async computeUprightHydrostatics(context): Promise<HydrostaticResult> {
    const { ship, resource, condition } = context;

    const hasDraft = condition.draft !== undefined;
    const hasDisplacement = condition.displacementTonnes !== undefined;
    if (hasDraft === hasDisplacement) {
      throw new Error("Specify exactly one of draft or displacementTonnes.");
    }
    if (hasDraft && (!Number.isFinite(condition.draft) || condition.draft! < 0)) {
      throw new Error("Draft must be finite and non-negative.");
    }
    if (hasDisplacement && (!Number.isFinite(condition.displacementTonnes) || condition.displacementTonnes! <= 0)) {
      throw new Error("Displacement must be finite and positive.");
    }

    if (![condition.vcg, condition.lcg, condition.tcg, condition.waterDensity].every(Number.isFinite) || condition.waterDensity <= 0) {
      throw new Error("Centres of gravity must be finite and water density must be positive.");
    }
    if ((condition.heelDeg ?? 0) !== 0 || (condition.trimDeg ?? 0) !== 0) {
      throw new Error("Upright hydrostatic tables require zero heel and zero trim.");
    }
    const { units, coordinateSystem } = ship.manifest;
    if (units.length !== "m" || units.mass !== "t" || units.density !== "t/m3" || units.angle !== "deg" || coordinateSystem.zPositive !== "up") {
      throw new Error("This solver requires metres, tonnes, t/m3, degrees, and a positive-up vertical axis.");
    }
    // Table mass and TPC use the package's default water density.
    const tableDensity = ship.manifest.defaultCondition.waterDensity;
    if (!Number.isFinite(tableDensity) || tableDensity <= 0) {
      throw new Error("The package must declare a positive default table water density.");
    }

    if (!resource.path) {
      throw new Error(
        `Resource "${resource.id}" is missing a path to the hydrostatic table.`
      );
    }

    const table = await sharedResults.read(ship,'upright-csv',resource.path,async s=>{
      const tableUrl=shipResourceUrl(s,resource.path!);
      const response=await fetch(tableUrl);
      if(!response.ok)throw new Error(`Could not load hydrostatic table: ${tableUrl}`);
      return parseHydrostaticTableCsv(await response.text());
    });
    // Normalize row volume once so forward and inverse lookups use identical data.
    const volumeRows = table.rows.map(row => ({
      ...row,
      volume: row.volume ?? (row.displacementTonnes !== undefined ? row.displacementTonnes / tableDensity : undefined),
    }));
    const draft = condition.draft ?? resolveDraft(volumeRows, condition.displacementTonnes!, condition.waterDensity);
    const volume = interpolateValue(volumeRows, draft, "volume");
    const finalDisplacementTonnes = volume !== undefined ? volume * condition.waterDensity : undefined;

    const kb = interpolateValue(table.rows, draft, "kb");
    const lcf = interpolateValue(table.rows, draft, "lcf");
    const lcb = interpolateValue(table.rows, draft, "lcb");
    const tcb = interpolateValue(table.rows, draft, "tcb");

    const bmTransverse = interpolateValue(table.rows, draft, "bmTransverse");
    const bmLongitudinal = interpolateValue(table.rows, draft, "bmLongitudinal");

    const kmTransverse = interpolateValue(table.rows, draft, "kmTransverse");
    const kmLongitudinal = interpolateValue(table.rows, draft, "kmLongitudinal");

    const waterplaneArea = interpolateValue(
      table.rows,
      draft,
      "waterplaneArea"
    );

    const transverseWaterplaneInertia = interpolateValue(
      table.rows,
      draft,
      "transverseWaterplaneInertia"
    );

    const longitudinalWaterplaneInertia = interpolateValue(
      table.rows,
      draft,
      "longitudinalWaterplaneInertia"
    );

    const tableTpc = interpolateValue(table.rows, draft, "tonnesPerCentimetre");
    const tonnesPerCentimetre = tableTpc !== undefined
      ? tableTpc * condition.waterDensity / tableDensity
      : waterplaneArea !== undefined ? waterplaneArea * condition.waterDensity / 100 : undefined;

    const gmTransverse =
      kmTransverse !== undefined ? kmTransverse - condition.vcg : undefined;

    const gmLongitudinal =
      kmLongitudinal !== undefined ? kmLongitudinal - condition.vcg : undefined;

    const warnings: HydrostaticWarning[] = [];

    if (finalDisplacementTonnes === undefined) {
      warnings.push({
        code: "missing-displacement",
        severity: "warning" as const,
        message:
          "The hydrostatic table does not provide displacement or volume.",
      });
    }

    if (kb === undefined) {
      warnings.push({
        code: "missing-kb",
        severity: "warning" as const,
        message: "The hydrostatic table does not provide KB.",
      });
    }

    if (lcb === undefined) {
      warnings.push({
        code: "missing-lcb",
        severity: "warning" as const,
        message: "The hydrostatic table does not provide LCB.",
      });
    }

    if (kmTransverse === undefined) {
      warnings.push({
        code: "missing-km-transverse",
        severity: "warning" as const,
        message:
          "The hydrostatic table does not provide KMt, so GMt cannot be calculated.",
      });
    }

    for (const [value, code, label] of [
      [tcb, "missing-tcb", "TCB"],
      [kmLongitudinal, "missing-km-longitudinal", "KMl (GMl cannot be calculated)"],
      [waterplaneArea, "missing-waterplane-area", "waterplane area"],
      [tonnesPerCentimetre, "missing-tpc", "TPC"],
    ] as const) {
      if (value === undefined) warnings.push({ code, severity: "warning", message: `The hydrostatic table does not provide ${label} at this draft.` });
    }
    if (gmTransverse !== undefined && gmTransverse <= 0) {
      warnings.push({ code: "non-positive-gm", severity: "warning", message: "GMt is zero or negative; positive initial transverse stability is not demonstrated." });
    }

    return {
      shipModelId: ship.manifest.id,
      shipModelName: ship.manifest.name,

      calculationSource: {
        solverId: hydrostaticTableSolver.id,
        solverLabel: hydrostaticTableSolver.label,
        resourceId: resource.id,
        resourceKind: resource.kind,
        resourcePath: resource.path,
      },

      condition,

      draft,
      draftRange: { min: table.rows[0].draft, max: table.rows[table.rows.length - 1].draft },
      trimDeg: condition.trimDeg,
      heelDeg: condition.heelDeg,

      volume,
      displacementTonnes: finalDisplacementTonnes,

      kb,
      lcb,
      lcf,
      tcb,

      bmTransverse,
      bmLongitudinal,

      kmTransverse,
      kmLongitudinal,

      gmTransverse,
      gmLongitudinal,

      waterplaneArea,
      transverseWaterplaneInertia,
      longitudinalWaterplaneInertia,

      tonnesPerCentimetre,

      centreOfBuoyancy:
        kb !== undefined && lcb !== undefined && tcb !== undefined
          ? {
              x: lcb,
              y: tcb,
              z: kb,
            }
          : undefined,

      centreOfGravity: {
        x: condition.lcg,
        y: condition.tcg,
        z: condition.vcg,
      },

      transverseMetacentre:
        kmTransverse !== undefined && lcb !== undefined && tcb !== undefined
          ? {
              x: lcb,
              y: tcb,
              z: kmTransverse,
            }
          : undefined,

      longitudinalMetacentre:
        kmLongitudinal !== undefined && lcb !== undefined && tcb !== undefined
          ? {
              x: lcb,
              y: tcb,
              z: kmLongitudinal,
            }
          : undefined,

      warnings,
    };
  },
};

function interpolateValue(
  rows: HydrostaticTableRow[],
  draft: number,
  property: keyof HydrostaticTableRow
): number | undefined {
  return interpolateTableValue(
    rows,
    draft,
    (row) => row.draft,
    (row) => {
      const value = row[property];

      if (typeof value !== "number") {
        return undefined;
      }

      return value;
    }
  );
}
/** Invert only a complete, strictly increasing volume-versus-draft table. */
function resolveDraft(rows: HydrostaticTableRow[], displacementTonnes: number, waterDensity: number): number {
  const volume = displacementTonnes / waterDensity;
  if (!Number.isFinite(volume) || volume <= 0) throw new Error("Requested displacement and density produce an invalid volume.");
  for (let index = 0; index < rows.length; index++) {
    const current = rows[index].volume;
    if (current === undefined || !Number.isFinite(current) || current < 0) {
      throw new Error("Displacement lookup requires volume or displacement at every table draft.");
    }
    if (index > 0 && current <= rows[index - 1].volume!) {
      throw new Error("Displacement lookup requires volume to increase strictly with draft.");
    }
  }
  const minimum = rows[0].volume! * waterDensity;
  const maximum = rows[rows.length - 1].volume! * waterDensity;
  if (!Number.isFinite(maximum)) throw new Error("Table mass exceeds the supported numeric range at this density.");
  // Density multiplication can differ from a typed mass by a few floating-point bits.
  const exactRow = rows.find(row => {
    const mass = row.volume! * waterDensity;
    return Math.abs(mass - displacementTonnes) <= 8 * Number.EPSILON * Math.max(1, Math.abs(mass), displacementTonnes);
  });
  if (exactRow) return exactRow.draft;
  if (displacementTonnes < minimum || displacementTonnes > maximum) {
    throw new Error(`Displacement ${displacementTonnes} t is outside the table range ${minimum}–${maximum} t at density ${waterDensity} t/m³.`);
  }
  // Use mass as the interpolation axis to preserve exact table endpoint comparisons.
  const draft = interpolateTableValue(rows, displacementTonnes, row => row.volume! * waterDensity, row => row.draft);
  if (draft === undefined || !Number.isFinite(draft)) throw new Error("Could not resolve a draft from this displacement.");
  return draft;
}
