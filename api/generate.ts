import OpenAI from 'openai';

export const config = { runtime: 'nodejs' };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function schemaHint() {
  return {
    questions: [
      {
        id: 'string',
        type: 'mcq | short',
        prompt: 'string',
        choices: ['string'],
        answer: 'string',
        explanation: 'string',
        linkedTermIds: ['string'],
        difficulty: 1,
        examStyleTags: ['string'],
      },
    ],
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST')
      return res.status(405).json({ error: 'POST only' });

    const { terms, pastText, config } = req.body as {
      terms: { id: string; en: string; ko: string; desc: string }[];
      pastText?: string;
      config: { n: number; ratioMcq: number; difficultyMix?: any };
    };

    if (!terms?.length) return res.status(400).json({ error: 'no terms' });

    const sys = `
너는 의대생 "의학용어" 시험 출제자다.
입력된 용어(EN/KO/설명)와 기출 텍스트(말투/유형)를 참고해 문제를 만든다.

요구사항:
- 총 ${config.n}문항
- 객관식 비율 ${config.ratioMcq}
- choices는 mcq일 때만 포함
- answer는 mcq면 '선지 텍스트 그대로', short면 '정답 문자열'
- explanation은 1~3문장 (시험용)
- linkedTermIds는 반드시 존재(0개면 안 됨)
- examStyleTags는 예: ["definition","abbrev","prefix_suffix","true_false","fill_blank","synonym"]
반드시 JSON만 출력. 스키마: ${JSON.stringify(schemaHint())}
`;

    const input = `
[용어목록]
${terms
  .slice(0, 500)
  .map((t) => `- (${t.id}) ${t.en} | ${t.ko} | ${t.desc}`)
  .join('\n')}

[기출 텍스트(선택)]
${(pastText || '').slice(0, 8000)}

[난이도 mix]
${JSON.stringify(config.difficultyMix || { d1: 0.4, d2: 0.4, d3: 0.2 })}
`;

    const response = await client.responses.create({
      model: 'gpt-5-mini',
      input,
      instructions: sys,
      // Responses API는 새 프로젝트 권장 경로 :contentReference[oaicite:4]{index=4}
    });

    const text = response.output_text || '';
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('JSON not found');

    const json = JSON.parse(text.slice(start, end + 1));
    res.status(200).json({ questions: json.questions || [] });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
