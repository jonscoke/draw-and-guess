import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(request: Request) {
  const body = await request.json();
  const image = body.image as string | undefined;
  if (!image) {
    return NextResponse.json({ result: '我看不清楚呢，再画大一点？' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ result: '服务未配置 OpenAI Key' }, { status: 500 });
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一个你画我猜游戏的 AI，请用中文简短回答画的是什么。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请猜测这幅画的内容，只返回一个简短名词或短语。' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ],
      max_tokens: 30,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ result: `AI 调用失败: ${errorText}` }, { status: 500 });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  const result = content || '我暂时猜不出来';

  return NextResponse.json({ result: `我猜是「${result}」` });
}
