import { z } from 'zod';

const DeepSeekResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

export interface AnalysisResult {
  summary: string;
  keyTopics: Array<{ topic: string; startTime: string; description: string }>;
  insights: string[];
  resources: Array<{ type: string; name: string; context: string }>;
  quotes: Array<{ text: string; speaker: string; time: string }>;
  actionItems: string[];
}

export async function analyzeTranscript(
  transcript: string,
  model: string = 'deepseek-chat'
): Promise<AnalysisResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = `你是一位专业的播客内容分析师。请根据以下播客文字稿，生成结构化分析结果。

要求输出格式（JSON）：
{
  "summary": "300字以内的节目概述",
  "keyTopics": [
    { "topic": "话题名称", "startTime": "MM:SS", "description": "简要说明" }
  ],
  "insights": ["核心观点1", "核心观点2"],
  "resources": [
    { "type": "book|tool|article|podcast", "name": "名称", "context": "提到的上下文" }
  ],
  "quotes": [
    { "text": "金句内容", "speaker": "说话人", "time": "MM:SS" }
  ],
  "actionItems": ["听众可以做的行动建议"]
}

规则：
- 所有内容使用中文输出
- 时间轴必须精确到分钟级别
- 推荐资源必须明确标注类型和名称
- 不要编造文字稿中没有的内容

文字稿：
${transcript.slice(0, 50000)}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的中文播客内容分析师。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const parsed = DeepSeekResponseSchema.parse(data);
  const content = parsed.choices[0].message.content;

  return JSON.parse(content) as AnalysisResult;
}
