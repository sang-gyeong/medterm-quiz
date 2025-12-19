// src/lib/types.ts
export type Term = {
  id: string;
  en: string;
  ko: string;
  desc: string;
  sourceId?: string; // optional
  sourceName?: string; // optional
};

export type PromptType = 'ko' | 'desc';

export type QuizItem = {
  id: string;
  termId: string;
  promptType: PromptType;
  promptText: string;
  answer: string;

  // ✅ 파일 출처(결과에서 확인 가능)
  sourceId: string;
  sourceName: string;
};

export type AnswerRecord = {
  quizId: string;
  termId: string;
  promptType: PromptType;
  promptText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;

  // ✅ 파일 출처(결과에서 확인 가능)
  sourceId: string;
  sourceName: string;
};
