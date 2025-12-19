// src/lib/quiz.ts
import type { QuizItem, Term, PromptType } from './types';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeAnswer(s: string) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

type PoolItem = { term: Term; promptType: PromptType };

function makePoolForTerms(terms: Term[]): PoolItem[] {
  const pool: PoolItem[] = [];
  for (const t of terms) {
    pool.push({ term: t, promptType: 'ko' });
    if (t.desc && t.desc.trim().length > 0) {
      pool.push({ term: t, promptType: 'desc' });
    }
  }
  return shuffle(pool);
}

/**
 * ✅ 파일별로 최대한 골고루 출제 (±1 수준)
 * - sourceId(파일)별로 pool을 만들고
 * - round-robin으로 1개씩 뽑음
 * - 어떤 파일 pool이 바닥나면: 다시 섞어서 중복 허용(문제 수가 많을 때 대비)
 */
export function buildQuiz(terms: Term[], questionCount: number): QuizItem[] {
  const safeCount = Math.max(1, Math.floor(questionCount || 1));
  if (!terms.length) return [];

  // sourceId 별 그룹화
  const bySource = new Map<string, Term[]>();
  for (const t of terms) {
    const key = t.sourceId || 'unknown';
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(t);
  }

  // 시작 편향 줄이기 위해 source 순서도 섞음
  const sourceOrder = shuffle(Array.from(bySource.keys()));

  // source별 pool/cursor 준비
  const pools = new Map<string, PoolItem[]>();
  const cursors = new Map<string, number>();

  for (const sid of sourceOrder) {
    const tlist = bySource.get(sid)!;
    pools.set(sid, makePoolForTerms(tlist));
    cursors.set(sid, 0);
  }

  const out: QuizItem[] = [];
  let turn = 0;

  while (out.length < safeCount) {
    const sid = sourceOrder[turn % sourceOrder.length];
    const pool = pools.get(sid)!;

    if (!pool.length) {
      turn++;
      continue;
    }

    let cursor = cursors.get(sid) ?? 0;

    // pool 끝 넘으면 재섞어서 중복 허용
    if (cursor >= pool.length) {
      pools.set(sid, shuffle(pool));
      cursor = 0;
    }

    const pick = pools.get(sid)![cursor];
    cursors.set(sid, cursor + 1);

    const t = pick.term;
    const promptType = pick.promptType;
    const promptText = promptType === 'desc' ? t.desc : t.ko;

    out.push({
      id: `${Date.now()}_q_${out.length}_${Math.random()
        .toString(16)
        .slice(2)}`,
      termId: t.id,
      promptType,
      promptText,
      answer: t.en,
      sourceId: t.sourceId,
      sourceName: t.sourceName,
    });

    turn++;
  }

  // 최종 한번 더 섞어서 "완전 랜덤" 느낌 유지
  return shuffle(out);
}
