export const HYDROSTATIC_UPRIGHT_TABLE_KIND = "hydrostatics.upright-table";

export type HydrostaticTableRow = {
  /**
   * Draft in metres.
   */
  draft: number;

  /**
   * Displacement mass in tonnes.
   */
  displacementTonnes?: number;

  /**
   * Submerged volume in cubic metres.
   */
  volume?: number;

  /**
   * Vertical centre of buoyancy above baseline.
   */
  kb?: number;

  /**
   * Longitudinal centre of buoyancy from the selected origin.
   */
  lcb?: number;
  /** Longitudinal centre of flotation, in the source x coordinate system. */
  lcf?: number;

  /**
   * Transverse centre of buoyancy from centreline.
   */
  tcb?: number;

  /**
   * Transverse metacentric radius.
   */
  bmTransverse?: number;

  /**
   * Longitudinal metacentric radius.
   */
  bmLongitudinal?: number;

  /**
   * Transverse metacentre above baseline.
   */
  kmTransverse?: number;

  /**
   * Longitudinal metacentre above baseline.
   */
  kmLongitudinal?: number;

  /**
   * Waterplane area in square metres.
   */
  waterplaneArea?: number;

  /**
   * Transverse waterplane second moment of area.
   */
  transverseWaterplaneInertia?: number;

  /**
   * Longitudinal waterplane second moment of area.
   */
  longitudinalWaterplaneInertia?: number;

  /**
   * Tonnes per centimetre immersion.
   */
  tonnesPerCentimetre?: number;
};

export type HydrostaticTable = {
  rows: HydrostaticTableRow[];
};