export type Point3 = {
  x: number;
  y: number;
  z: number;
};

export type UnitSystem = {
  length: "m";
  mass: "t" | "kg";
  density: "t/m3" | "kg/m3";
  angle: "deg" | "rad";
};

export type CoordinateSystem = {
  origin: string;
  /** Origin location in metres forward of AP; required for textbook presets. */
  longitudinalOriginFromAP?: number;
  /** Amidships location in source x coordinates; explicit to avoid datum assumptions. */
  amidshipsX?: number;
  xPositive: "forward" | "aft";
  yPositive: "starboard" | "port";
  zPositive: "up" | "down";
};

export type PrincipalDimensions = {
  /**
   * Length between perpendiculars.
   * Usually shown as LBP or LPP in naval architecture documents.
   */
  lbp: number;

  /**
   * Length overall.
   */
  loa?: number;

  /**
   * Moulded beam.
   */
  beam: number;

  /**
   * Moulded depth.
   * Avoid using only "d" because it can be confused with draft.
   */
  mouldedDepth?: number;

  /**
   * Design draft, if known.
   */
  designDraft?: number;
};

export type SimulationCondition = {
  /** Total transverse FSM (t·m), already density-weighted. Omitted means assumed zero. */
  freeSurfaceMomentTransverse?: number;
  /**
   * Current draft.
   * For early hydrostatics, we will usually calculate from draft.
   */
  draft?: number;

  /**
   * Displacement mass.
   * Keep the unit explicit to avoid confusion with submerged volume.
   */
  displacementTonnes?: number;

  /**
   * Vertical centre of gravity.
   * Equivalent to KG when measured from the baseline/keel reference.
   */
  vcg: number;

  /**
   * Longitudinal centre of gravity, measured from the chosen origin.
   */
  lcg: number;

  /**
   * Transverse centre of gravity, measured from centreline.
   */
  tcg: number;

  /**
   * Water density.
   * For seawater this is commonly around 1.025 t/m3.
   */
  waterDensity: number;

  /**
   * Future use for heeled hydrostatics and GZ calculations.
   */
  heelDeg?: number;

  /**
   * Future use for trim equilibrium calculations.
   */
  trimDeg?: number;
};

export type ShipResource = {
  /**
   * Unique id inside this ship model package.
   * Example: "upright-hydrostatics", "station-offsets", "cross-curves".
   */
  id: string;

  /**
   * Resource type.
   *
   * Examples:
   * - "hydrostatics.upright-table"
   * - "geometry.station-offsets"
   * - "stability.cross-curves"
   * - "loading.tanks"
   */
  kind: string;

  /**
   * Path relative to this ship model's manifest.json file.
   */
  path?: string;

  label?: string;
  description?: string;

  /**
   * Optional resource-specific configuration.
   */
  config?: Record<string, unknown>;
};

export type ShipModelManifest = {
  schemaVersion: string;
  reviewNotes?: {messages:string[];resourceIds:string[]};

  id: string;
  name: string;
  version?: string;

  category?: string;
  description?: string;

  units: UnitSystem;
  coordinateSystem: CoordinateSystem;
  principalDimensions: PrincipalDimensions;

  defaultCondition: SimulationCondition;

  /**
   * Data files or embedded resources provided by this ship model.
   */
  resources: ShipResource[];
};

export type ShipModelPackage = {
  manifest: ShipModelManifest;

  /**
   * Base URL/folder of the model package.
   * Used to resolve resource paths.
   */
  baseUrl: string;
  resourceUrls?: Record<string,string>;
  release?: () => void;
};
