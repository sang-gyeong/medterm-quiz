// src/App.tsx
import { useMemo, useState } from 'react';
import ImportPage from './pages/ImportPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import type { AnswerRecord, Term } from './lib/types';

type Route = 'import' | 'quiz' | 'result';

export default function App() {
  const [route, setRoute] = useState<Route>('import');
  const [terms, setTerms] = useState<Term[]>([]);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(20);

  const badge = useMemo(() => {
    if (route === 'import') return 'Ready';
    if (route === 'quiz') return '퀴즈 진행';
    return '결과';
  }, [route]);

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
              setRoute('quiz');
            }}
          />
        )}

        {route === 'quiz' && (
          <QuizPage
            terms={terms}
            questionCount={questionCount}
            onFinish={(recs) => {
              setRecords(recs);
              setRoute('result');
            }}
          />
        )}

        {route === 'result' && (
          <ResultPage
            records={records}
            onRestart={() => {
              setTerms([]);
              setRecords([]);
              setQuestionCount(20);
              setRoute('import');
            }}
          />
        )}
      </div>
    </div>
  );
}
