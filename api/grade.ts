import OpenAI from 'openai';

export const config = { runtime: 'nodejs' };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST')
      return res.status(405).json({ error: 'POST only' });

    const { questions, answers } = req.body as {
      questions: any[];
      answers: { questionId: string; userAnswer: string }[];
    };

    const byId = new Map(questions.map((q) => [q.id, q]));

    const results = answers.map((a) => {
      const q = byId.get(a.questionId);
      const correct =
        (a.userAnswer || '').trim().toLowerCase() ===
        (q?.answer || '').trim().toLowerCase();
      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        isCorrect: correct,
      };
    });

    const wrong = results.filter((r) => !r.isCorrect).slice(0, 30);
    if (wrong.length === 0)
      return res.status(200).json({ results, notebook: [] });

    const prompt = `
너는 오답노트 코치다. 아래 오답들에 대해 questionId별로:
- 왜 틀렸는지 핵심 1~2문장
- 헷갈리기 쉬운 포인트 1개
- 다음엔 어떻게 외울지 한 줄
을 하나로 묶어서 feedback에 넣어라.

형식(JSON만):
[{"questionId":"...","feedback":"..."}]

[오답 목록]
${wrong
  .map((w) => {
    const q = byId.get(w.questionId);
    return `- id=${w.questionId}
Q: ${q.prompt}
정답: ${q.answer}
내답: ${w.userAnswer}
해설: ${q.explanation}`;
  })
  .join('\n\n')}
`;

    const r = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
      instructions: 'JSON만 출력',
    });

    const t = r.output_text || '[]';
    const s = t.indexOf('[');
    const e = t.lastIndexOf(']');
    const notebook = s !== -1 && e !== -1 ? JSON.parse(t.slice(s, e + 1)) : [];

    res.status(200).json({ results, notebook });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
