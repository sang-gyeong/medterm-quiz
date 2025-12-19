// src/pages/ResultPage.tsx
import { useMemo } from 'react';
import type { AnswerRecord } from '../lib/types';

type ConfettiPiece = {
  id: number;
  left: number; // %
  delay: number; // s
  duration: number; // s
  opacity: number;
  bg: string;
};

function Confetti() {
  // ✅ 렌더 중 Math.random() 금지 → useMemo로 마운트 시 1번만 생성
  const pieces: ConfettiPiece[] = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.8;
      const duration = 1.4 + Math.random() * 1.2;
      const opacity = 0.7 + Math.random() * 0.3;

      const bg =
        i % 3 === 0
          ? 'rgba(167,139,250,0.95)'
          : i % 3 === 1
          ? 'rgba(96,165,250,0.95)'
          : 'rgba(255,255,255,0.9)';

      return { id: i, left, delay, duration, opacity, bg };
    });
  }, []);

  return (
    <div className="mt-confetti">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: p.opacity,
            background: p.bg,
          }}
        />
      ))}
    </div>
  );
}

export default function ResultPage({
  records,
  onRestart,
}: {
  records: AnswerRecord[];
  onRestart: () => void;
}) {
  const correct = records.filter((r) => r.isCorrect);
  const wrong = records.filter((r) => !r.isCorrect);
  const perfect = true;

  return (
    <div className="mt-row">
      <div className="mt-card">
        <div className="mt-card-inner">
          <div className="mt-row">
            {/* ✅ Perfect banner */}
            {perfect && (
              <div className="mt-perfect">
                <div className="mt-glow-ring" />
                <Confetti />
                <div className="mt-perfect-inner">
                  <div className="mt-perfect-title mt-pop">
                    🏆 Perfect! 전부 맞췄어요.
                  </div>
                  <div className="mt-perfect-sub">
                    이 문구를 본 당신, 의학용어 마스터 칭호를 얻으셨습니다.
                  </div>
                </div>
              </div>
            )}

            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div>
                <div className="mt-section-title">결과</div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 20,
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {correct.length} / {records.length}
                </div>
                <div className="mt-help" style={{ marginTop: 4 }}>
                  맞은 {correct.length}개 · 틀린 {wrong.length}개
                </div>
              </div>

              <div className="mt-actions">
                <button className="mt-btn mt-btn-primary" onClick={onRestart}>
                  처음으로
                </button>
              </div>
            </div>

            {/* Lists */}
            <div className="mt-grid-2">
              <div className="mt-card" style={{ boxShadow: 'none' }}>
                <div className="mt-card-inner">
                  <div className="mt-section-title">✅ 맞은 문제</div>
                  <div className="mt-divider" />
                  {correct.length === 0 ? (
                    <div className="mt-help">없음</div>
                  ) : (
                    <ol className="mt-list">
                      {correct.map((r) => (
                        <li key={r.quizId} className="mt-item">
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            <b>Q</b> ({r.promptType === 'ko' ? '뜻' : '설명'}):{' '}
                            {r.promptText}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <b>A</b>: {r.correctAnswer}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              <div className="mt-card" style={{ boxShadow: 'none' }}>
                <div className="mt-card-inner">
                  <div className="mt-section-title">❌ 틀린 문제</div>
                  <div className="mt-divider" />
                  {wrong.length === 0 ? (
                    <div className="mt-help">없음</div>
                  ) : (
                    <ol className="mt-list">
                      {wrong.map((r) => (
                        <li key={r.quizId} className="mt-item">
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            <b>Q</b> ({r.promptType === 'ko' ? '뜻' : '설명'}):{' '}
                            {r.promptText}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              color: 'rgba(255,255,255,0.82)',
                            }}
                          >
                            <b>내 답</b>:{' '}
                            {r.userAnswer || (
                              <span style={{ opacity: 0.6 }}>(미입력)</span>
                            )}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <b>정답</b>: {r.correctAnswer}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>

            {!perfect && (
              <div className="mt-help">
                팁: 틀린 문제는 “설명 → 영어” 패턴이 많으면 헷갈릴 수 있어요.{' '}
                <br />
                설명에서 핵심 키워드를 1~2개만 떠올리는 식으로 연결하면 훨씬
                빨라집니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
