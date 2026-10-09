export function interpolateLinear(
  x: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): number {
  if (x0 === x1) {
    return y0;
  }

  const ratio = (x - x0) / (x1 - x0);

  return y0 + ratio * (y1 - y0);
}

export function interpolateTableValue<T>(
  rows: T[],
  x: number,
  getX: (row: T) => number,
  getY: (row: T) => number | undefined
): number | undefined {
  if (!Number.isFinite(x)) throw new Error("Interpolation value must be finite.");

  if (rows.length === 0) {
    throw new Error("Cannot interpolate an empty table.");
  }

  const sortedRows = [...rows].sort((a, b) => getX(a) - getX(b));

  const firstRow = sortedRows[0];
  const lastRow = sortedRows[sortedRows.length - 1];

  const firstX = getX(firstRow);
  const lastX = getX(lastRow);

  if (x < firstX || x > lastX) {
    throw new Error(
      `Interpolation value ${x} is outside the available table range ${firstX} - ${lastX}.`
    );
  }

  for (let index = 0; index < sortedRows.length; index += 1) {
    const currentRow = sortedRows[index];
    const currentX = getX(currentRow);

    if (x === currentX) {
      return getY(currentRow);
    }

    const nextRow = sortedRows[index + 1];

    if (!nextRow) {
      break;
    }

    const nextX = getX(nextRow);

    if (x > currentX && x < nextX) {
      const y0 = getY(currentRow);
      const y1 = getY(nextRow);

      if (y0 === undefined || y1 === undefined) {
        return undefined;
      }

      return interpolateLinear(x, currentX, y0, nextX, y1);
    }
  }

  return undefined;
}