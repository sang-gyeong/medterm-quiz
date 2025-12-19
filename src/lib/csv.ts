import type { Term } from './types';

function stripBOM(s: string) {
  return s.replace(/^\uFEFF/, '');
}

function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  const comma = (headerLine.match(/,/g) || []).length;
  const semi = (headerLine.match(/;/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab >= comma && tab >= semi) return '\t';
  if (semi >= comma && semi >= tab) return ';';
  return ',';
}

function parseLines(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function parseDelimited(text: string, delimiter: ',' | ';' | '\t'): string[][] {
  const rows: string[][] = [];
  const lines = parseLines(text);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === delimiter && !inQuotes) {
        row.push(cur.trim());
        cur = '';
        continue;
      }

      cur += ch;
    }

    row.push(cur.trim());
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function pickIndex(headers: string[], candidates: string[]) {
  const hs = headers.map(normalizeHeader);
  for (const c of candidates) {
    const idx = hs.indexOf(normalizeHeader(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseTermsCSV(csvTextRaw: string): Term[] {
  const csvText = stripBOM(csvTextRaw);
  const lines = parseLines(csvText).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rows = parseDelimited(csvText, delimiter);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const body = rows.slice(1);

  const enIdx = pickIndex(headers, ['en', 'term_en', 'english']);
  const koIdx = pickIndex(headers, ['ko', 'meaning_ko', 'korean']);
  const descIdx = pickIndex(headers, ['desc', 'explain', 'description']);

  const hasHeader = enIdx !== -1 && koIdx !== -1;

  const get = (row: string[], idx: number) =>
    idx >= 0 && idx < row.length ? row[idx] : '';

  const out: Term[] = [];
  body.forEach((row, i) => {
    const en = (hasHeader ? get(row, enIdx) : get(row, 0)).trim();
    const ko = (hasHeader ? get(row, koIdx) : get(row, 1)).trim();
    const desc = (hasHeader ? get(row, descIdx) : get(row, 2)).trim();

    if (!en || !ko) return;

    out.push({
      id: `${Date.now()}_${i}`,
      en,
      ko,
      desc,
    });
  });

  return out;
}
