import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// API 키에서 줄바꿈 제거
const apiKey = process.env.OPENAI_API_KEY?.replace(/\r?\n|\r/g, '');

const openai = new OpenAI({
  apiKey: apiKey
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    console.log('업로드된 파일 정보:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // 파일 크기 제한 확인
    if (buffer.length > 25 * 1024 * 1024) { // 25MB
      return NextResponse.json(
        { error: '파일 크기가 너무 큽니다. 25MB 이하의 파일만 지원합니다.' },
        { status: 400 }
      );
    }

    // 파일 확장자 처리
    let fileName = audioFile.name;
    let fileType = audioFile.type;
    
    // MIME 타입이 없거나 비표준인 경우 확장자로 추정
    if (!fileType || fileType === 'application/octet-stream') {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (ext === 'mp3') fileType = 'audio/mpeg';
      else if (ext === 'wav') fileType = 'audio/wav';
      else if (ext === 'm4a') fileType = 'audio/m4a';
      else if (ext === 'mp4') fileType = 'audio/mp4';
      else if (ext === 'webm') fileType = 'audio/webm';
      else if (ext === 'flac') fileType = 'audio/flac';
      else if (ext === 'ogg' || ext === 'oga') fileType = 'audio/ogg';
      else if (ext === 'mpga') fileType = 'audio/mpeg';
    }

    console.log('Whisper API 호출 시작');
    
    // 확장자 추가 (없는 경우)
    if (!fileName.includes('.')) {
      fileName += '.mp3';
    }

    // 지원되는 확장자 확인
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExt && !supportedFormats.includes(fileExt)) {
      return NextResponse.json(
        { 
          error: '지원되지 않는 파일 형식입니다.',
          details: `지원되는 형식: ${supportedFormats.join(', ')}`
        },
        { status: 400 }
      );
    }

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: new File([buffer], fileName, { type: fileType || 'audio/mpeg' }),
        model: 'whisper-1',
        language: 'ko',
      });

      console.log('Whisper API 응답 성공:', transcription.text.substring(0, 50) + '...');

      return NextResponse.json({ text: transcription.text });
    } catch (error: any) {
      console.error('Whisper API 오류:', error.message || error);
      
      // 더 구체적인 오류 메시지 구성
      let errorMessage = '음성 인식 중 오류가 발생했습니다.';
      let errorDetails = error.message || '알 수 없는 오류';
      
      // OpenAI API 오류 코드 처리
      if (error.status === 400) {
        if (error.message.includes('Invalid file format')) {
          errorMessage = '지원되지 않는 파일 형식입니다.';
          errorDetails = `지원되는 형식: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm`;
        } else if (error.message.includes('File too large')) {
          errorMessage = '파일 크기가 너무 큽니다.';
          errorDetails = '25MB 이하의 파일만 지원합니다.';
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails
        },
        { status: error.status || 500 }
      );
    }
  } catch (error: any) {
    console.error('음성 인식 오류:', error.message || error);
    
    // 더 자세한 오류 메시지 반환
    return NextResponse.json(
      { 
        error: '음성 인식 중 오류가 발생했습니다.',
        details: error.message || '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 