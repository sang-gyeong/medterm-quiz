// src/App.tsx
import { useMemo, useState } from 'react';
import ImportPage from './pages/ImportPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import type { AnswerRecord, Term } from './lib/types';

type Route = 'import' | 'quiz' | 'result';
type QuizMode = 'normal' | 'retest';

function termKey(t: Term): string {
  // @ts-expect-error
  return t.id ?? t.en ?? JSON.stringify(t);
}

export default function App() {
  const [route, setRoute] = useState<Route>('import');
  const [terms, setTerms] = useState<Term[]>([]);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(20);

  const [quizMode, setQuizMode] = useState<QuizMode>('normal');

  // ✅ 재테스트 회차: 0(일반), 1(첫 재테스트), 2(두 번째 재테스트)...
  const [retestRound, setRetestRound] = useState(0);

  // ✅ 현재 결과 기준 오답 term 목록(재테스트용)
  const [wrongTerms, setWrongTerms] = useState<Term[]>([]);

  // ✅ 직전 라운드에서 틀린 termId 목록(= 이번 라운드에서 "두 번 틀림" 판별용)
  const [prevWrongTermIds, setPrevWrongTermIds] = useState<string[]>([]);

  // ✅ 이번 결과에서 “두 번 틀린 문제” 레코드 (ResultPage에서 따로 표시)
  const [twiceWrongRecords, setTwiceWrongRecords] = useState<AnswerRecord[]>(
    []
  );

  const badge = useMemo(() => {
    if (route === 'import') return 'Ready';
    if (route === 'quiz')
      return quizMode === 'retest' ? '오답 재테스트' : '퀴즈 진행';
    return '결과';
  }, [route, quizMode]);

  return (
    <div className="mt-shell">
      <div className="mt-container">
        <div className="mt-topbar">
          <div className="mt-brand">
            <h1 className="mt-title">의학용어 주관식 퀴즈</h1>
            <p className="mt-subtitle">
              한국어 <b>뜻</b> 또는 <b>설명</b>을 보고, 영어를 입력해서 PASS
              하세요.
            </p>
          </div>
          <div className="mt-badge">{badge}</div>
        </div>

        {route === 'import' && (
          <ImportPage
            onReady={(t, n) => {
              setTerms(t);
              setQuestionCount(n);
              setRecords([]);
              setWrongTerms([]);
              setPrevWrongTermIds([]);
              setTwiceWrongRecords([]);
              setQuizMode('normal');
              setRetestRound(0);
              setRoute('quiz');
            }}
          />
        )}

        {route === 'quiz' && (
          <QuizPage
            terms={terms}
            questionCount={questionCount}
            mode={quizMode}
            onFinish={(recs) => {
              setRecords(recs);

              // ✅ 현재 오답 레코드/termId 수집
              const wrongRecs = recs.filter((r) => !r.isCorrect);
              const wrongTermIdSet = new Set(
                wrongRecs.map((r) => String(r.termId))
              );

              // ✅ 두 번 틀린 문제(직전 라운드에서도 틀렸던 termId와 교집합)
              const prevSet = new Set(prevWrongTermIds.map(String));
              const twice = wrongRecs.filter((r) =>
                prevSet.has(String(r.termId))
              );
              setTwiceWrongRecords(twice);

              // ✅ 오답 term 목록 만들기(재테스트용)
              const map = new Map<string, Term>();
              for (const t of terms) map.set(termKey(t), t);

              const wrong = wrongRecs
                .map((r) => map.get(String(r.termId)) ?? null)
                .filter(Boolean) as Term[];

              const uniq = new Map<string, Term>();
              for (const t of wrong) uniq.set(termKey(t), t);

              setWrongTerms([...uniq.values()]);
              setRoute('result');
            }}
          />
        )}

        {route === 'result' && (
          <ResultPage
            records={records}
            canRetest={wrongTerms.length > 0}
            retestCount={wrongTerms.length}
            retestRound={retestRound}
            twiceWrongRecords={twiceWrongRecords}
            onRetest={() => {
              if (!wrongTerms.length) return;

              // ✅ 다음 라운드(재테스트)에서 “두 번 틀림” 판별을 위해
              //    ‘이번 라운드 오답 termId’를 저장해 둔다
              setPrevWrongTermIds(wrongTerms.map((t: any) => String(t.id)));

              setQuizMode('retest');
              setTerms(wrongTerms);
              setQuestionCount(wrongTerms.length);
              setRecords([]);
              setRetestRound((r) => r + 1);
              setRoute('quiz');
            }}
            onRestart={() => {
              setTerms([]);
              setRecords([]);
              setWrongTerms([]);
              setPrevWrongTermIds([]);
              setTwiceWrongRecords([]);
              setQuizMode('normal');
              setQuestionCount(20);
              setRetestRound(0);
              setRoute('import');
            }}
          />
        )}
      </div>
    </div>
  );
}
