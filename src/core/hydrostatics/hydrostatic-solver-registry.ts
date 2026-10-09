import type { ShipResource } from "../domain/ship-model";
import type { HydrostaticSolver } from "./hydrostatic-solver";
import { hydrostaticTableSolver } from "./solvers/table/hydrostatic-table-solver";

const hydrostaticSolvers: HydrostaticSolver[] = [hydrostaticTableSolver];

export function getHydrostaticSolvers(): HydrostaticSolver[] {
  return [...hydrostaticSolvers];
}

export function findHydrostaticSolverForResource(
  resource: ShipResource
): HydrostaticSolver | undefined {
  return hydrostaticSolvers.find((solver) => solver.canSolve(resource));
}

export function getHydrostaticSolverForResource(
  resource: ShipResource
): HydrostaticSolver {
  const solver = findHydrostaticSolverForResource(resource);

  if (!solver) {
    throw new Error(
      `No hydrostatic solver registered for resource kind: ${resource.kind}`
    );
  }

  return solver;
}