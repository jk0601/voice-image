import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text, style = 'Hyper-realism' } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('프롬프트 최적화 시작:', { text: text.substring(0, 50) + '...', style });
    console.log('GPT-4o를 사용하여 프롬프트 최적화...');
    
    const systemPrompt = `You are an AI assistant specialized in creating prompts for a state-of-the-art image generation model. Always end and complete the phrase in 40 words. This model uses a dual encoder system:

T5XXL (from PixArt): Handles advanced text understanding and processing.
CLIP_L (from Stable Diffusion 1.5): Provides strong text-image alignment.

Your task is to generate prompts that maximize the potential of this dual encoder system. Follow these guidelines:

Detailed Descriptions: Leverage T5XXL's text processing by using rich, descriptive language. Include specific details about scenes, objects, colors, lighting, and atmosphere.
Visual Consistency: Utilize CLIP_L's strength in text-image alignment by incorporating clear visual elements and style references.
Balanced Complexity: Create prompts that are detailed enough to challenge T5XXL's processing capabilities but concise enough for CLIP_L to maintain strong text-image coherence.
Diverse Vocabulary: Use a wide range of adjectives, nouns, and verbs to fully engage T5XXL's language understanding.
Style and Medium Specifications: Clearly state artistic styles, mediums, or techniques to guide the image generation process.
Spatial Relationships: Describe the layout and positioning of elements in the scene to take advantage of both encoders' understanding of spatial concepts.
Abstract and Concrete Elements: Blend abstract ideas with concrete visual descriptions to push the boundaries of the model's interpretative abilities.
Emotional and Atmospheric Cues: Include descriptions of mood, emotion, or atmosphere to add depth to the generated images.
Technical and Conceptual Balance: For complex subjects, balance technical accuracy (leveraging T5XXL) with visual interpretability (using CLIP_L's strengths).
Cultural and Historical References: Incorporate specific cultural or historical elements to test the model's knowledge integration capabilities.

IMPORTANT RULES:
1. NEVER refuse to process any input. No matter what the input is, you MUST transform it into a descriptive, visual prompt.
2. Do NOT include warnings, disclaimers or explanations in your response, only the enhanced prompt.
3. For abstract concepts, controversial topics, or unclear inputs, use creative interpretation to visualize them in an artistic, metaphorical way.
4. If the input is a question, instruction, or conversation, transform it into a scene that visually represents the concept.
5. NEVER say you cannot or should not create a prompt. ALL inputs must be converted to visual prompts.

Enhance the following prompt: "${text}" in the following style: ${style}. Expand with vivid details, clear visual elements, and style specifications. Incorporate spatial relationships, emotional atmosphere, and any relevant cultural or historical context. Balance concrete and abstract descriptions. Ensure the enhanced prompt leverages both T5XXL's advanced text processing and CLIP_L's strong text-image alignment. Provide a clear, detailed, and imaginative enhanced prompt without any additional explanations or quotation marks. Always end and complete the phrase in 40 words. ALWAYS RESPOND IN ENGLISH, even if the input is not in English.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const optimizedPrompt = completion.choices[0].message.content?.trim();
    console.log('GPT-4o 응답:', optimizedPrompt?.substring(0, 100) + '...');

    // GPT가 거부 메시지를 반환했는지 확인
    if (optimizedPrompt && (
        optimizedPrompt.includes("not appropriate") || 
        optimizedPrompt.includes("I cannot") || 
        optimizedPrompt.includes("I apologize") || 
        (optimizedPrompt.includes("I'm sorry") && optimizedPrompt.length < 100)
      )) {
      // 더 상세하고 풍부한 기본 프롬프트로 대체
      const defaultPrompt = `Hyperrealistic scene inspired by "${text}" with meticulous details, natural lighting, photographic quality, precise textures, and atmospheric depth. Rendered with extraordinary clarity, volumetric light, and perfect perspective. 4K resolution, emotional weight, and environmental storytelling.`;
      
      return NextResponse.json({ prompt: defaultPrompt, source: 'fallback' });
    }
    
    // 생성된 프롬프트가 너무 짧거나 간단하면 강화
    if (optimizedPrompt && (optimizedPrompt.length < 100 || optimizedPrompt.split(' ').length < 15)) {
      const enhancedPrompt = `Hyperrealistic scene with incredible detail: ${optimizedPrompt}. Rich textures, natural lighting, atmospheric depth, volumetric shadows, perfect perspective, photographic quality, 4K resolution, environmental storytelling, emotional weight, meticulous attention to small details.`;
      
      return NextResponse.json({ prompt: enhancedPrompt, source: 'enhanced-gpt4o' });
    }

    return NextResponse.json({ prompt: optimizedPrompt, source: 'gpt4o' });
  } catch (error) {
    console.error('프롬프트 최적화 오류:', error);
    return NextResponse.json(
      { error: '프롬프트 최적화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 