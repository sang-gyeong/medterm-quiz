// src/pages/QuizPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerRecord, QuizItem, Term } from '../lib/types';
import { buildQuiz, normalizeAnswer } from '../lib/quiz';

type QuizMode = 'normal' | 'retest';

export default function QuizPage({
  terms,
  questionCount,
  onFinish,
  mode = 'normal', // ✅ 추가: 재테스트 UX 구분용
}: {
  terms: Term[];
  questionCount: number;
  onFinish: (records: AnswerRecord[]) => void;
  mode?: QuizMode;
}) {
  const quiz: QuizItem[] = useMemo(() => buildQuiz(terms, questionCount), [
    terms,
    questionCount,
  ]);

  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = quiz[idx];

  useEffect(() => {
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [idx]);

  // ✅ terms/questionCount가 바뀌면(오답 재테스트 시작 등) 진행상태 초기화
  useEffect(() => {
    setIdx(0);
    setInput('');
    setChecked(false);
    setIsCorrect(null);
    setRecords([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [terms, questionCount]);

  if (!q)
    return (
      <div className="mt-status bad">
        ⚠️ 문제가 없습니다. CSV를 다시 업로드해 주세요.
      </div>
    );

  const progress = quiz.length
    ? Math.round(((idx + 1) / quiz.length) * 100)
    : 0;

  function currentRecord(): AnswerRecord {
    const ok = normalizeAnswer(input) === normalizeAnswer(q.answer);
    return {
      quizId: q.id,
      termId: q.termId,
      promptType: q.promptType,
      promptText: q.promptText,
      userAnswer: input,
      correctAnswer: q.answer,
      isCorrect: ok,
      sourceId: q.sourceId,
      sourceName: q.sourceName,
    };
  }

  function checkAnswer(): AnswerRecord | null {
    if (checked) return null;
    const rec = currentRecord();
    setChecked(true);
    setIsCorrect(rec.isCorrect);
    setRecords((prev) => [...prev, rec]);
    return rec;
  }

  function next() {
    if (!checked) return;

    const last = idx === quiz.length - 1;
    if (last) {
      /**
       * ✅ 중요: 마지막 문제에서 records state가 아직 업데이트 되기 전에 onFinish(records)를 호출하면
       * 마지막 AnswerRecord가 빠질 수 있어.
       *
       * 따라서:
       * - 이미 checked=true면, 마지막 record는 records에 들어가있다고 "가정"하는 대신,
       *   안전하게 길이를 비교해서 누락 가능성 있는 경우 currentRecord로 보정
       */
      const expectedLen = quiz.length;
      const hasAll = records.length >= expectedLen;

      if (hasAll) {
        onFinish(records);
      } else {
        // records가 한 개 부족한 경우를 대비해 보정
        // (대부분 마지막 문제에서 checkAnswer 직후 next를 누르는 빠른 흐름에서 발생)
        const fallbackLast = currentRecord();
        const finalRecords =
          records.length === expectedLen - 1
            ? [...records, fallbackLast]
            : records;

        onFinish(finalRecords);
      }
      return;
    }

    setIdx((v) => v + 1);
  }

  function onEnterKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (!checked) checkAnswer();
    else next();
  }

  return (
    <div className="mt-row">
      <div className="mt-card">
        <div className="mt-card-inner">
          <div className="mt-row">
            {/* ✅ 재테스트 UX 구분 배지 */}
            {mode === 'retest' && (
              <div
                style={{
                  marginBottom: 10,
                  padding: '6px 10px',
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(250, 204, 21, 0.22)',
                  border: '1px solid rgba(250, 204, 21, 0.35)',
                  fontWeight: 700,
                  width: 'fit-content',
                }}
              >
                🔁 오답 재테스트 모드
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span className="mt-pill">
                진행 <b>{idx + 1}</b> / <b>{quiz.length}</b>
              </span>
              <span className="mt-pill">
                유형 <b>{q.promptType === 'ko' ? '한국어 뜻' : '설명'}</b>
              </span>
              <span className="mt-pill">
                파일 <b>{q.sourceName}</b>
              </span>
            </div>

            <div className="mt-progress">
              <div style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-question">{q.promptText}</div>

            <div className="mt-grid-2">
              <div>
                <div className="mt-help" style={{ marginBottom: 8 }}>
                  영어로 입력하세요 (정확히 일치하면 PASS)
                </div>
                <input
                  ref={inputRef}
                  className="mt-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., abduction"
                  disabled={checked}
                  onKeyDown={onEnterKey}
                />
                <div className="mt-help" style={{ marginTop: 8 }}>
                  <span className="mt-kbd">Enter</span> 정답확인 / 다음
                </div>
              </div>

              <div>
                {checked ? (
                  <div className="mt-feedback">
                    <div className={isCorrect ? 'ok' : 'no'}>
                      {isCorrect ? '✅ PASS' : '❌ FAIL'}
                    </div>
                    {!isCorrect && (
                      <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                        정답: <b>{q.answer}</b>
                      </div>
                    )}
                    {isCorrect && (
                      <div className="mt-help">
                        좋아요. 다음 문제로 넘어가세요.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-feedback">
                    <div className="mt-help">
                      정답 확인을 누르면 바로 채점합니다. <br />
                      (확인 전에는 다음으로 못 넘어가게 해놨어요.)
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-actions">
              <button
                className="mt-btn mt-btn-primary"
                onClick={() => checkAnswer()}
                disabled={checked || normalizeAnswer(input) === ''}
              >
                정답 확인
              </button>
              <button className="mt-btn" onClick={next} disabled={!checked}>
                {idx === quiz.length - 1 ? '끝내기' : '다음'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-help">
        채점은 대소문자/여러 공백은 무시하고 비교해요.
      </div>
    </div>
  );
}
