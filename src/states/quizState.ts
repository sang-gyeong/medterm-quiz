import { atom } from 'recoil';
import type { Question, QuizMode } from '../lib/types';

export const quizQuestionsState = atom<Question[]>({
  key: 'quizQuestionsState',
  default: [],
});

export const quizModeState = atom<QuizMode>({
  key: 'quizModeState',
  default: 'normal',
});

export const lastWrongQuestionsState = atom<Question[]>({
  key: 'lastWrongQuestionsState',
  default: [],
});
