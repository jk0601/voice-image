import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const { text, summarize = false } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // summarize 옵션에 따라 다른 시스템 프롬프트 사용
    const systemPrompt = summarize 
      ? `당신은 한국어 텍스트를 간결한 영어 이미지 생성 프롬프트로 변환하는 전문가입니다.
      사용자가 한국어로 입력한 내용을 받아 핵심 내용만 추출하여 최대 1-2문장의 간결한 영어 프롬프트로 변환해주세요.
      텍스트가 길더라도 핵심만 간단히 요약하고, 시각적으로 표현 가능한 요소에 집중해주세요.
      예시: 
      - "해변의 갈매기" → "A serene beach scene featuring a group of seagulls."
      - "보험 영업 인식 개선에 대한 긴 내용" → "Professional insurance consultants in a modern office setting, demonstrating expertise and trust-building with clients."
      결과는 영어로만 작성되어야 하며, JSON 형식 없이 직접 프롬프트 텍스트만 응답해주세요.`
      : `당신은 한국어 텍스트를 고품질 영어 이미지 생성 프롬프트로 변환하는 전문가입니다. 
      사용자가 한국어로 입력한 내용을 받아 이미지 생성에 최적화된 영어 프롬프트로 번역해주세요.
      결과는 영어로 작성되어야 하며, 분위기, 스타일, 조명, 색상, 시점, 세부 사항 등을 포함해 풍부하게 묘사되어야 합니다.
      다음 형식으로 응답하세요: { "prompt": "변환된 영어 프롬프트" }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ]
    });

    const translatedPrompt = response.choices[0].message.content;
    
    // summarize 옵션이 true면 JSON 파싱 없이 직접 텍스트 사용
    if (summarize) {
      return NextResponse.json({ prompt: translatedPrompt });
    }
    
    // 기존 JSON 파싱 로직
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(translatedPrompt || '{"prompt": ""}');
    } catch (e) {
      // JSON 파싱 실패 시 텍스트를 그대로 프롬프트로 사용
      parsedResponse = { prompt: translatedPrompt };
    }

    return NextResponse.json({ prompt: parsedResponse.prompt });
  } catch (error) {
    console.error('프롬프트 번역 오류:', error);
    return NextResponse.json(
      { error: '프롬프트 번역 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 