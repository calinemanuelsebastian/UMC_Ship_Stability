import type { HydrostaticResult } from "../domain/hydrostatic-result";
import type {
  ShipModelPackage,
  ShipResource,
  SimulationCondition,
} from "../domain/ship-model";

export type HydrostaticSolverContext = {
  /**
   * The loaded ship model package.
   * Contains the manifest and the base URL/folder used to load resources.
   */
  ship: ShipModelPackage;

  /**
   * The specific resource used by this solver.
   * Example: upright hydrostatic table, station offsets, mesh hull.
   */
  resource: ShipResource;

  /**
   * Current simulation condition.
   * Example: draft, VCG, LCG, TCG, water density.
   */
  condition: SimulationCondition;
};

export type HydrostaticSolver = {
  /**
   * Unique solver id.
   * Example: "hydrostatic-table-solver".
   */
  id: string;

  /**
   * Human-readable solver name.
   */
  label: string;

  /**
   * Resource kinds supported by this solver.
   *
   * Examples:
   * - "hydrostatics.upright-table"
   * - "geometry.station-offsets"
   */
  supportedResourceKinds: string[];

  /**
   * Returns true if this solver can use the given resource.
   */
  canSolve: (resource: ShipResource) => boolean;

  /**
   * Computes upright hydrostatics for the selected ship and condition.
   *
   * This is async because some solvers need to load CSV/JSON files.
   */
  computeUprightHydrostatics: (
    context: HydrostaticSolverContext
  ) => Promise<HydrostaticResult>;
};