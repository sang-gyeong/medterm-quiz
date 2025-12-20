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
  onRetest,
  canRetest,
  retestCount,
  retestRound,
  twiceWrongRecords,
}: {
  records: AnswerRecord[];
  onRestart: () => void;
  onRetest: () => void;
  canRetest: boolean;
  retestCount: number;
  retestRound: number;
  twiceWrongRecords: AnswerRecord[];
}) {
  const correct = records.filter((r) => r.isCorrect);
  const wrong = records.filter((r) => !r.isCorrect);
  const perfect = records.length > 0 && wrong.length === 0;

  // ✅ 두 번째 재테스트(= round>=2)에서도 만점 실패 → 각성 모드
  const secondRetestFail = retestRound >= 2 && wrong.length > 0;

  // ✅ 두 번 틀린 termId set (강조 렌더링용)
  const twiceSet = useMemo(() => {
    return new Set(twiceWrongRecords.map((r) => String(r.termId)));
  }, [twiceWrongRecords]);

  return (
    <div className="mt-row">
      {/* ✅ 각성 모드 흔들림/플래시 효과: 카드 컨테이너에 클래스 부여 */}
      <div className={`mt-card ${secondRetestFail ? 'mt-awaken' : ''}`}>
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

            {/* 🚨 각성 모드 경고 */}
            {secondRetestFail && (
              <div className="mt-awaken-banner">
                <div className="mt-awaken-title">🚨 각성 모드</div>
                <div className="mt-awaken-sub">
                  이 문제들은 <b>두 번이나</b> 틀렸어요. 지금은 “테스트”가
                  아니라 “정리”를 해야 합니다.
                  <br />
                  <b>정답 3번 소리내기 → 손으로 1번 쓰기 → 다시 풀기</b>로
                  가세요.
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

                {/* 두 번 틀린 문제 카운트 표시 */}
                {twiceWrongRecords.length > 0 && (
                  <div className="mt-help" style={{ marginTop: 8 }}>
                    🔥 <b>두 번 틀린 문제</b> {twiceWrongRecords.length}개
                    (아래에 따로 표시)
                  </div>
                )}
              </div>

              <div className="mt-actions">
                <button
                  className={`mt-btn ${
                    secondRetestFail ? 'mt-awaken-shake-btn' : ''
                  }`}
                  onClick={onRetest}
                  disabled={!canRetest}
                  title={
                    !canRetest
                      ? '오답이 없어서 재테스트할 문제가 없어요'
                      : undefined
                  }
                >
                  🔁 오답 재테스트{canRetest ? ` (${retestCount})` : ''}
                </button>

                <button className="mt-btn mt-btn-primary" onClick={onRestart}>
                  처음으로
                </button>
              </div>
            </div>

            {/* ✅ 두 번 틀린 문제 섹션 (따로 표시 + 빨간 강조) */}
            {twiceWrongRecords.length > 0 && (
              <div className="mt-twice-wrap">
                <div className="mt-twice-head">
                  <span className="mt-twice-badge">🔥</span>
                  <div>
                    <div className="mt-twice-title">
                      두 번 틀린 문제만 모아보기
                    </div>
                    <div className="mt-help">
                      여기 있는 것들은 “약점 고정” 상태예요. 다음 재테스트 전에
                      먼저 정리하세요.
                    </div>
                  </div>
                </div>

                <ol className="mt-list" style={{ marginTop: 10 }}>
                  {twiceWrongRecords.map((r) => (
                    <li key={r.quizId} className="mt-item mt-item-twice">
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
              </div>
            )}

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
                      {wrong.map((r) => {
                        const isTwice = twiceSet.has(String(r.termId));
                        return (
                          <li
                            key={r.quizId}
                            className={`mt-item ${
                              isTwice ? 'mt-item-twice-inline' : ''
                            }`}
                          >
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              <b>Q</b> ({r.promptType === 'ko' ? '뜻' : '설명'}
                              ): {r.promptText}
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
                            {isTwice && (
                              <div className="mt-twice-inline-hint">
                                🔥 두 번 틀림 — 지금 고정 복습 대상
                              </div>
                            )}
                          </li>
                        );
                      })}
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
