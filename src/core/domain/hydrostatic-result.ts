import type { Point3, SimulationCondition } from "./ship-model";

export type HydrostaticCalculationSource = {
  /**
   * Id of the solver that produced this result.
   * Example: "hydrostatic-table-solver".
   */
  solverId: string;

  /**
   * Human-readable solver name.
   */
  solverLabel?: string;

  /**
   * Id of the ship resource used by the solver.
   * Example: "upright-hydrostatics".
   */
  resourceId?: string;

  /**
   * Resource kind used by the solver.
   * Example: "hydrostatics.upright-table".
   */
  resourceKind?: string;

  /**
   * Resource path, if the result came from a file.
   */
  resourcePath?: string;
};

export type HydrostaticWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type HydrostaticResult = {
  shipModelId: string;
  shipModelName: string;

  calculationSource: HydrostaticCalculationSource;

  /**
   * The condition used to produce this result.
   */
  condition: SimulationCondition;

  /**
   * Draft used for the calculation.
   */
  draft?: number;
  draftRange?: { min: number; max: number };

  /**
   * Trim and heel are optional for now.
   * They will become more important when we add inclined hydrostatics.
   */
  trimDeg?: number;
  heelDeg?: number;

  /**
   * Submerged volume.
   */
  volume?: number;

  /**
   * Displacement mass in tonnes.
   */
  displacementTonnes?: number;

  /**
   * Centre of buoyancy values.
   *
   * kb = vertical centre of buoyancy above baseline.
   * lcb = longitudinal centre of buoyancy from origin/AP.
   * tcb = transverse centre of buoyancy from centreline.
   */
  kb?: number;
  lcb?: number;
  /** Longitudinal centre of flotation, in the source x coordinate system. */
  lcf?: number;
  tcb?: number;

  /**
   * Metacentric radii.
   */
  bmTransverse?: number;
  bmLongitudinal?: number;

  /**
   * Metacentric heights above baseline.
   */
  kmTransverse?: number;
  kmLongitudinal?: number;

  /**
   * Metacentric heights relative to G.
   */
  gmTransverse?: number;
  /** Physical VCG stays in condition.vcg and centreOfGravity.z. */
  freeSurfaceMomentTransverse?: number;
  freeSurfaceCorrectionTransverse?: number;
  virtualVcgTransverse?: number;
  gmTransverseCorrected?: number;
  gmLongitudinal?: number;

  /**
   * Waterplane properties.
   */
  waterplaneArea?: number;
  transverseWaterplaneInertia?: number;
  longitudinalWaterplaneInertia?: number;

  /**
   * Tonnes per centimetre immersion.
   */
  tonnesPerCentimetre?: number;

  /**
   * Important points in the ship coordinate system.
   */
  centreOfBuoyancy?: Point3;
  centreOfGravity?: Point3;
  transverseMetacentre?: Point3;
  longitudinalMetacentre?: Point3;

  warnings: HydrostaticWarning[];
};