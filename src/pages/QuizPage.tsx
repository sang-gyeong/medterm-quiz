// src/pages/QuizPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerRecord, QuizItem, Term } from '../lib/types';
import { buildQuiz, normalizeAnswer } from '../lib/quiz';

export default function QuizPage({
  terms,
  questionCount,
  onFinish,
}: {
  terms: Term[];
  questionCount: number;
  onFinish: (records: AnswerRecord[]) => void;
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

  function checkAnswer() {
    if (checked) return;
    const rec = currentRecord();
    setChecked(true);
    setIsCorrect(rec.isCorrect);
    setRecords((prev) => [...prev, rec]);
  }

  function next() {
    if (!checked) return;

    const last = idx === quiz.length - 1;
    if (last) {
      onFinish(records);
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
                onClick={checkAnswer}
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
