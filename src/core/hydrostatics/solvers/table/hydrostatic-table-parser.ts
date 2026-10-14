import { parseCsv, readCsvNumber } from "../../../../platform/files/csv";
import type {
  HydrostaticTable,
  HydrostaticTableRow,
} from "./hydrostatic-table-types";

export function parseHydrostaticTableCsv(text: string): HydrostaticTable {
  const csvRows = parseCsv(text);

  const rows = csvRows.map((csvRow, index): HydrostaticTableRow => {
    const draft = readCsvNumber(csvRow, "draft");

    if (draft === undefined) {
      throw new Error(
        `Missing required "draft" value in hydrostatic table row ${index + 1}.`
      );
    }

    return {
      draft,
      displacementTonnes: readCsvNumber(csvRow, "displacementTonnes"),
      volume: readCsvNumber(csvRow, "volume"),

      kb: readCsvNumber(csvRow, "kb"),
      lcb: readCsvNumber(csvRow, "lcb"),
      lcf: readCsvNumber(csvRow, "lcf"),
      tcb: readCsvNumber(csvRow, "tcb"),

      bmTransverse: readCsvNumber(csvRow, "bmTransverse"),
      bmLongitudinal: readCsvNumber(csvRow, "bmLongitudinal"),

      kmTransverse: readCsvNumber(csvRow, "kmTransverse"),
      kmLongitudinal: readCsvNumber(csvRow, "kmLongitudinal"),

      waterplaneArea: readCsvNumber(csvRow, "waterplaneArea"),

      transverseWaterplaneInertia: readCsvNumber(
        csvRow,
        "transverseWaterplaneInertia"
      ),

      longitudinalWaterplaneInertia: readCsvNumber(
        csvRow,
        "longitudinalWaterplaneInertia"
      ),

      tonnesPerCentimetre: readCsvNumber(csvRow, "tonnesPerCentimetre"),
    };
  });

  const sortedRows = [...rows].sort((a, b) => a.draft - b.draft);

  validateHydrostaticTableRows(sortedRows);

  return {
    rows: sortedRows,
  };
}

function validateHydrostaticTableRows(rows: HydrostaticTableRow[]): void {
  if (rows.length === 0) {
    throw new Error("Hydrostatic table must contain at least one row.");
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (!Number.isFinite(row.draft)) {
      throw new Error(`Invalid draft value in hydrostatic table row ${index + 1}.`);
    }

    if (row.draft < 0) {
      throw new Error(
        `Draft cannot be negative in hydrostatic table row ${index + 1}.`
      );
    }

    for (const key of ["displacementTonnes", "volume", "waterplaneArea", "tonnesPerCentimetre", "transverseWaterplaneInertia", "longitudinalWaterplaneInertia", "bmTransverse", "bmLongitudinal"] as const) {
      if (row[key] !== undefined && row[key]! < 0) {
        throw new Error(`Negative ${key} in hydrostatic table row ${index + 1}.`);
      }
    }
    const previousRow = rows[index - 1];

    if (previousRow && previousRow.draft === row.draft) {
      throw new Error(`Duplicate draft value in hydrostatic table: ${row.draft}.`);
    }
  }
}