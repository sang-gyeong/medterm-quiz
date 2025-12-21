// src/lib/csv.ts
import type { Term } from './types';

/**
 * BOM 제거 + 줄바꿈 정규화
 */
function normalizeText(raw: string) {
  let s = raw ?? '';

  // ✅ UTF-8 BOM 제거
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

  // 줄바꿈 통일
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return s;
}

/**
 * delimiter 자동 감지 (comma / semicolon / tab)
 */
function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  const line = headerLine ?? '';
  const comma = (line.match(/,/g) ?? []).length;
  const semi = (line.match(/;/g) ?? []).length;
  const tab = (line.match(/\t/g) ?? []).length;

  // 탭이 있으면 TSV일 확률이 매우 높음
  if (tab > 0 && tab >= comma && tab >= semi) return '\t';
  if (semi > 0 && semi >= comma) return ';';
  return ',';
}

/**
 * 아주 가벼운 CSV/TSV row 파서 (quote 지원)
 * - delimiter 분리
 * - "..." 안 delimiter 무시
 * - "" -> " 처리
 */
function splitRow(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // "" -> "
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (!inQuote && ch === delimiter) {
      out.push(cur);
      cur = '';
      continue;
    }

    cur += ch;
  }
  out.push(cur);

  // 양끝 공백만 정리 (내용의 중간 공백은 유지)
  return out.map((v) => v.trim());
}

function normHeader(h: string) {
  return (h ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\ufeff+/, '');
}

function findHeaderIndex(headers: string[], keys: string[]) {
  const map = headers.map(normHeader);
  for (const k of keys) {
    const idx = map.findIndex((x) => x === k);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * ✅ parseTermsCSV
 * - 쉼표/세미콜론/탭 자동 처리
 * - BOM 제거
 * - 헤더 유연 처리(en/ko/desc/description)
 * - 헤더가 없으면 1~3열(en,ko,desc)로 처리
 */
export function parseTermsCSV(raw: string): Term[] {
  const text = normalizeText(raw);

  const lines = text
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '');

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const firstCols = splitRow(lines[0], delimiter);

  // 헤더로 보이는지 판단
  const firstNorm = firstCols.map(normHeader);
  const looksLikeHeader =
    firstNorm.includes('en') ||
    firstNorm.includes('ko') ||
    firstNorm.includes('desc') ||
    firstNorm.includes('description');

  let idxEn = 0;
  let idxKo = 1;
  let idxDesc = 2;
  let startRow = 0;

  if (looksLikeHeader) {
    idxEn = findHeaderIndex(firstCols, ['en']);
    idxKo = findHeaderIndex(firstCols, ['ko']);
    idxDesc = findHeaderIndex(firstCols, ['desc', 'description']);
    startRow = 1;

    // en은 반드시 필요 → 없으면 0번 fallback
    if (idxEn < 0) idxEn = 0;
    // ko/desc는 없어도 됨
  }

  const out: Term[] = [];

  for (let i = startRow; i < lines.length; i++) {
    const cols = splitRow(lines[i], delimiter);

    // 방어: 너무 짧은 행
    const en = (cols[idxEn] ?? '').trim();
    const ko = idxKo >= 0 ? (cols[idxKo] ?? '').trim() : '';
    const desc = idxDesc >= 0 ? (cols[idxDesc] ?? '').trim() : '';

    if (!en) continue;

    out.push({
      // id/source는 ImportPage에서 붙임
      // @ts-expect-error
      id: '',
      en,
      ko,
      desc,
    });
  }

  return out;
}
