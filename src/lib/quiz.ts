// src/lib/quiz.ts
import type { QuizItem, Term } from './types';

export function normalizeAnswer(s: string) {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * ✅ 규칙
 * - 문제 중복 방지: termId 당 최대 1문제
 * - promptText 선택: desc 우선
 *   - desc가 있으면 desc로 출제 (ko 유무 상관 없음)
 *   - desc 없고 ko 있으면 ko로 출제
 *   - 둘 다 없으면 제외
 * - questionCount가 커도 가능한 만큼만 반환(중복 없이)
 */
export function buildQuiz(terms: Term[], questionCount: number): QuizItem[] {
  // 1) termId 기준으로 중복 제거(여러 파일 합칠 때 방어)
  const uniq = new Map<string, Term>();
  for (const t of terms) {
    const id = String((t as any).id ?? '');
    if (!id) continue;
    if (!uniq.has(id)) uniq.set(id, t);
  }
  const uniqTerms = Array.from(uniq.values());

  // 2) term -> 1개의 QuizItem으로 변환 (desc 우선)
  const pool: QuizItem[] = [];
  for (const t of uniqTerms) {
    const termId = String((t as any).id ?? '');
    const en = String((t as any).en ?? '').trim();
    const ko = String((t as any).ko ?? '').trim();
    const desc = String((t as any).desc ?? '').trim();

    if (!termId || !en) continue;

    // ✅ prompt 선택: desc 우선
    const useDesc = !!desc; // desc가 있으면 무조건 desc
    const promptText = useDesc ? desc : ko;

    if (!promptText) continue; // desc/ko 둘 다 없으면 문제 풀에서 제외

    const promptType = useDesc ? 'desc' : 'ko';

    pool.push({
      id: `${termId}:${promptType}`, // termId당 1개만 들어가므로 사실상 유니크
      termId,
      promptType,
      promptText,
      answer: en,
      sourceId: String((t as any).sourceId ?? ''),
      sourceName: String((t as any).sourceName ?? ''),
    });
  }

  // 3) 중복 없는 샘플링 (without replacement)
  const shuffled = shuffle(pool);
  const n = Math.max(
    0,
    Math.min(Math.floor(questionCount || 0), shuffled.length)
  );
  return shuffled.slice(0, n);
}
