export type CsvRow = Record<string, string>;

export type CsvParseOptions = {
  delimiter?: "," | ";" | "\t";
};

export function parseCsv(text: string, options: CsvParseOptions = {}): CsvRow[] {
  text = text.replace(/^\uFEFF/, "").trim();
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0], delimiter).map((header) =>
    header.trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, delimiter);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? "";
    });

    return row;
  });
}

export function readCsvNumber(
  row: CsvRow,
  columnName: string
): number | undefined {
  const rawValue = row[columnName];

  if (rawValue === undefined || rawValue.trim() === "") {
    return undefined;
  }

  const normalizedValue = rawValue.trim().replace(",", ".");
  const value = Number(normalizedValue);

  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid numeric value in column "${columnName}": ${rawValue}`
    );
  }

  return value;
}

function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.split(/\r\n|\n|\r/)[0] ?? "";

  const commaCount = countOccurrences(firstLine, ",");
  const semicolonCount = countOccurrences(firstLine, ";");
  const tabCount = countOccurrences(firstLine, "\t");

  if (semicolonCount >= commaCount && semicolonCount >= tabCount) {
    return ";";
  }

  if (tabCount >= commaCount && tabCount >= semicolonCount) {
    return "\t";
  }

  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (insideQuotes && character === '"' && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (insideQuotes) throw new Error("Unclosed CSV quote; multiline cells are not supported.");
  values.push(currentValue);

  return values;
}

function countOccurrences(text: string, character: string): number {
  return text.split(character).length - 1;
}