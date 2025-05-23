import { NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

// Fal.ai API 설정 - 환경 변수 이름 단일화
const FAL_KEY = process.env.FAL_AI_API_KEY;

// Fal.ai 클라이언트 초기화
if (FAL_KEY) {
  fal.config({
    credentials: FAL_KEY
  });
}

// 환경 변수 디버깅
console.log('환경 변수 확인:', {
  FAL_KEY_EXISTS: !!FAL_KEY,
  FAL_KEY_PREFIX: FAL_KEY?.substring(0, 10) + '...'
});

export async function POST(req: Request) {
  try {
    const { 
      prompt, 
      style = 'Hyper-realism',
      aspect_ratio = '1:1', // 종횡비 기본값 (1:1 정사각형)
      raw = false // 덜 가공된 자연스러운 이미지 생성 옵션
    } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!FAL_KEY) {
      throw new Error('Fal.ai API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.');
    }

    console.log('이미지 생성 시작:', { 
      model: 'fal-ai/flux-pro/v1.1-ultra',
      prompt: prompt.substring(0, 50) + '...',
      style,
      aspect_ratio,
      raw
    });

    // 최종 프롬프트 구성 (스타일 정보 추가)
    const enhancedPrompt = style !== 'Hyper-realism' 
      ? `${prompt} (Style: ${style})`
      : prompt;

    // Fal.ai API 호출 - 업그레이드된 Flux Pro 모델 사용
    // Ultra 모델에서 최고의 화질을 얻기 위한 설정 최적화
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
      input: {
        prompt: enhancedPrompt,
        seed: Math.floor(Math.random() * 10000000), // 랜덤 시드 값
        aspect_ratio: aspect_ratio, // 종횡비 설정
        raw: raw, // raw 모드 설정
        num_images: 1, // 하나의 이미지만 생성
        output_format: "png", // png 형식으로 출력 (최고 화질)
        safety_tolerance: "2", // 안전성 검사 레벨 (1-6, 낮을수록 엄격)
        sync_mode: true, // 동기 모드로 고해상도 이미지 직접 받기
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          if (update.logs && Array.isArray(update.logs)) {
            update.logs.forEach((log: any) => {
              if (log && log.message) console.log(log.message);
            });
          }
        }
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('이미지 생성 실패: Fal.ai에서 출력을 받지 못했습니다');
    }

    console.log('이미지 생성 성공:', { 
      requestId: result.requestId,
      hasNsfw: result.data.has_nsfw_concepts ? result.data.has_nsfw_concepts[0] : false
    });

    // 생성된 이미지 URL 가져오기
    const image = result.data.images[0];
    const imageUrl = image.url;
    
    console.log('이미지 정보:', { 
      width: image.width, 
      height: image.height, 
      url: imageUrl,
      contentType: image.content_type
    });

    // Fal.ai에서 제공한 URL을 직접 반환
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('이미지 생성 오류:', error);
    return NextResponse.json(
      { error: '이미지 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 