'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Upload, FileAudio, Loader2 } from 'lucide-react'

interface VoiceRecognitionProps {
  onTranscriptionComplete: (text: string) => void
  isProcessing?: boolean
}

// 오디오 파일 변환 함수
async function convertAudioToMP3(audioFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // 이미 MP3 형식이라면 변환하지 않고 반환
    if (audioFile.type === 'audio/mpeg' || audioFile.type === 'audio/mp3') {
      return resolve(audioFile);
    }

    try {
      // 오디오 컨텍스트 생성
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      // 파일 읽기
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // 오디오 데이터 디코딩
          const audioData = await audioContext.decodeAudioData(e.target?.result as ArrayBuffer);
          
          // 오프라인 컨텍스트 생성 (오디오 처리용)
          const offlineContext = new OfflineAudioContext(
            audioData.numberOfChannels,
            audioData.length,
            audioData.sampleRate
          );
          
          // 소스 노드 생성
          const source = offlineContext.createBufferSource();
          source.buffer = audioData;
          source.connect(offlineContext.destination);
          
          // 렌더링 시작
          source.start(0);
          const renderedBuffer = await offlineContext.startRendering();
          
          // WAV로 인코딩 (MP3 직접 인코딩은 웹에서 복잡함)
          const wavBlob = bufferToWave(renderedBuffer);
          const convertedFile = new File([wavBlob], 
            audioFile.name.split('.')[0] + '.wav', 
            { type: 'audio/wav' }
          );
          
          console.log('오디오 변환 완료:', {
            originalSize: Math.round(audioFile.size / 1024) + 'KB',
            convertedSize: Math.round(convertedFile.size / 1024) + 'KB',
            originalType: audioFile.type,
            convertedType: convertedFile.type
          });
          
          resolve(convertedFile);
        } catch (error) {
          console.error('오디오 변환 중 오류:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(audioFile);
    } catch (error) {
      console.error('오디오 변환 초기화 오류:', error);
      reject(error);
    }
  });
}

// AudioBuffer를 WAV 형식으로 변환
function bufferToWave(buffer: AudioBuffer): Blob {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numOfChannels * 2;
  const sampleRate = buffer.sampleRate;
  
  // WAV 헤더 생성
  const wav = new DataView(new ArrayBuffer(44 + length));
  
  // "RIFF" 시그니처
  wav.setUint8(0, 'R'.charCodeAt(0));
  wav.setUint8(1, 'I'.charCodeAt(0));
  wav.setUint8(2, 'F'.charCodeAt(0));
  wav.setUint8(3, 'F'.charCodeAt(0));
  
  // 파일 크기
  wav.setUint32(4, 36 + length, true);
  
  // "WAVE" 포맷
  wav.setUint8(8, 'W'.charCodeAt(0));
  wav.setUint8(9, 'A'.charCodeAt(0));
  wav.setUint8(10, 'V'.charCodeAt(0));
  wav.setUint8(11, 'E'.charCodeAt(0));
  
  // "fmt " 청크
  wav.setUint8(12, 'f'.charCodeAt(0));
  wav.setUint8(13, 'm'.charCodeAt(0));
  wav.setUint8(14, 't'.charCodeAt(0));
  wav.setUint8(15, ' '.charCodeAt(0));
  
  // 청크 크기: 16
  wav.setUint32(16, 16, true);
  // 오디오 포맷: 1 (PCM)
  wav.setUint16(20, 1, true);
  // 채널 수
  wav.setUint16(22, numOfChannels, true);
  // 샘플링 레이트
  wav.setUint32(24, sampleRate, true);
  // 바이트 레이트
  wav.setUint32(28, sampleRate * numOfChannels * 2, true);
  // 블록 얼라인
  wav.setUint16(32, numOfChannels * 2, true);
  // 비트 뎁스
  wav.setUint16(34, 16, true);
  
  // 데이터 청크
  wav.setUint8(36, 'd'.charCodeAt(0));
  wav.setUint8(37, 'a'.charCodeAt(0));
  wav.setUint8(38, 't'.charCodeAt(0));
  wav.setUint8(39, 'a'.charCodeAt(0));
  
  // 데이터 크기
  wav.setUint32(40, length, true);
  
  // 오디오 데이터 쓰기
  const offset = 44;
  const float32Arrays = Array(numOfChannels).fill(0)
    .map((_, i) => buffer.getChannelData(i));
  
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, float32Arrays[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      wav.setInt16(offset + (i * numOfChannels + channel) * 2, int16, true);
    }
  }
  
  return new Blob([wav], { type: 'audio/wav' });
}

export function VoiceRecognition({
  onTranscriptionComplete,
  isProcessing = false
}: VoiceRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingText, setRecordingText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 마운트 시 브라우저 호환성 확인
    const checkBrowserSupport = () => {
      // 서버 사이드 렌더링 방지
      if (typeof window === 'undefined') return;
      
      try {
        // 브라우저 정보 로깅
        const browserInfo = {
          userAgent: navigator.userAgent,
          vendor: navigator.vendor,
          isSecureContext: window.isSecureContext,
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: navigator.mediaDevices ? !!navigator.mediaDevices.getUserMedia : false,
        };
        
        console.log('브라우저 환경 정보:', browserInfo);
        
        // window 객체 검사
        if (!window.navigator) {
          console.warn('navigator 객체를 찾을 수 없습니다.');
          setRecordingText('이 환경은 오디오 녹음을 지원하지 않습니다.');
          return;
        }
        
        // 보안 컨텍스트 확인 - getUserMedia는 보안 컨텍스트(HTTPS)에서만 작동
        if (!window.isSecureContext) {
          console.warn('비보안 컨텍스트(HTTP)에서는 마이크 접근이 제한됩니다.');
          setRecordingText('보안 연결(HTTPS)에서만 마이크 접근이 가능합니다.');
          return;
        }
        
        // mediaDevices API 지원 확인
        const hasModernAPI = !!(
          navigator.mediaDevices && 
          navigator.mediaDevices.getUserMedia
        );
        
        // 구형 API 지원 확인
        const hasLegacyAPI = !!(
          (navigator as any).getUserMedia || 
          (navigator as any).webkitGetUserMedia || 
          (navigator as any).mozGetUserMedia || 
          (navigator as any).msGetUserMedia
        );
        
        console.log('API 지원 상태:', { hasModernAPI, hasLegacyAPI });
        
        if (!hasModernAPI && !hasLegacyAPI) {
          console.warn('이 브라우저는 마이크 접근 API를 지원하지 않습니다.');
          setRecordingText('이 브라우저는 마이크 접근을 지원하지 않습니다. 최신 Chrome, Firefox, Safari 또는 Edge 브라우저를 사용해 주세요.');
        }
      } catch (err) {
        console.error('브라우저 호환성 확인 중 오류:', err);
      }
    };
    
    checkBrowserSupport();
    
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    // 서버 사이드 렌더링 방지
    if (typeof window === 'undefined') return;
    
    try {
      console.log('녹음 시작 시도...');
      
      // mediaDevices API 지원 확인 전에 navigator 객체 존재 확인
      if (!window.navigator) {
        console.error('navigator 객체를 찾을 수 없습니다.');
        setRecordingText('이 환경은 오디오 녹음을 지원하지 않습니다.');
        return;
      }
      
      // 보안 컨텍스트 확인
      if (!window.isSecureContext) {
        console.error('비보안 컨텍스트(HTTP)에서는 마이크 접근이 제한됩니다.');
        setRecordingText('보안 연결(HTTPS)에서만 마이크 접근이 가능합니다.');
        return;
      }
      
      // 권한 상태 확인 시도
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('마이크 권한 상태:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setRecordingText('마이크 접근이 차단되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
            return;
          }
        }
      } catch (permError) {
        console.log('권한 확인 불가:', permError);
      }
      
      // mediaDevices API 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('브라우저가 mediaDevices API를 지원하지 않습니다. 구형 API 시도...');
        
        // 구형 API 지원 확인 (구형 브라우저 호환성)
        interface LegacyNavigator {
          getUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (error: Error) => void
          ) => void;
          webkitGetUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (error: Error) => void
          ) => void;
          mozGetUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (error: Error) => void
          ) => void;
          msGetUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (error: Error) => void
          ) => void;
        }
        
        const legacyNavigator = navigator as unknown as LegacyNavigator;
        const getUserMedia = 
          legacyNavigator.getUserMedia ||
          legacyNavigator.webkitGetUserMedia ||
          legacyNavigator.mozGetUserMedia ||
          legacyNavigator.msGetUserMedia;
          
        if (!getUserMedia) {
          console.error('구형 getUserMedia API도 지원하지 않습니다.');
          setRecordingText(`
            마이크 접근이 불가능합니다. 다음을 확인해보세요:
            1. 최신 Chrome, Firefox, Safari 또는 Edge 브라우저 사용
            2. 브라우저 설정에서 마이크 권한 허용
            3. 다른 앱에서 마이크를 사용 중인지 확인
            4. 브라우저를 재시작해보세요
          `);
          return;
        }
        
        // 구형 API를 사용하여 접근 시도
        getUserMedia(
          { audio: true },
          (stream: MediaStream) => {
            handleStream(stream);
          },
          (error: Error) => {
            console.error('마이크 접근 오류 (구형 API):', error);
            setRecordingText('마이크 접근이 거부되었습니다. 브라우저 설정에서 권한을 확인해주세요.');
          }
        );
        return;
      }

      // 최신 API 사용
      try {
        console.log('mediaDevices.getUserMedia 호출 시도...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('마이크 스트림 획득 성공');
        handleStream(stream);
      } catch (mediaError) {
        console.error('마이크 접근 오류 (최신 API):', mediaError);
        
        // 상세 오류 분석
        let errorMessage = '마이크 접근이 거부되었거나 장치를 찾을 수 없습니다.';
        if (mediaError instanceof DOMException) {
          switch (mediaError.name) {
            case 'NotAllowedError':
              errorMessage = '마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
              break;
            case 'NotFoundError':
              errorMessage = '마이크 장치를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
              break;
            case 'NotReadableError':
              errorMessage = '마이크에 접근할 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인해주세요.';
              break;
            case 'AbortError':
              errorMessage = '마이크 접근이 중단되었습니다. 브라우저를 재시작해보세요.';
              break;
          }
        }
        
        setRecordingText(errorMessage);
      }
    } catch (error) {
      console.error('음성 녹음 초기화 오류:', error);
      setRecordingText('음성 녹음을 시작할 수 없습니다. 브라우저 설정에서 마이크 접근 권한을 확인해주세요.');
    }
  }
  
  // 스트림 처리를 위한 함수 (코드 중복 방지)
  const handleStream = (stream: MediaStream) => {
    try {
      // MediaRecorder 객체 생성
      if (typeof MediaRecorder === 'undefined') {
        console.error('MediaRecorder API를 지원하지 않습니다.');
        setRecordingText('이 브라우저는 음성 녹음을 지원하지 않습니다.');
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      }

      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // 녹음된 데이터가 있는지 확인
        if (audioChunksRef.current.length === 0) {
          console.warn('녹음된 오디오 데이터가 없습니다.');
          setRecordingText('녹음된 오디오 데이터가 없습니다. 다시 시도해주세요.');
          
          // 스트림 정리
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // 마이크 스트림 정리
        stream.getTracks().forEach(track => track.stop());
        
        // 녹음 시간 초기화
        setRecordingDuration(0);
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder 오류:', event);
        setRecordingText('녹음 중 오류가 발생했습니다.');
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      // 녹음 시작
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingText('음성 녹음 중...');
      
      // 녹음 시간 타이머 시작
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('스트림 처리 중 오류:', err);
      setRecordingText('녹음을 시작할 수 없습니다.');
      
      // 오류 발생 시 스트림 정리
      stream.getTracks().forEach(track => track.stop());
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('녹음 중지 오류:', error);
      }
      setIsRecording(false);
      setRecordingText('음성 분석 중...');
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('서버 응답 오류')
      }

      const data = await response.json()
      if (data.text) {
        setRecordingText(data.text)
        
        // 한국어 텍스트를 영어 프롬프트로 자동 변환
        await translateToEnglishPrompt(data.text)
      } else {
        setRecordingText('음성을 인식할 수 없습니다.')
      }
    } catch (error) {
      console.error('음성 인식 오류:', error)
      setRecordingText('음성 인식 중 오류가 발생했습니다.')
    }
  }

  const translateToEnglishPrompt = async (koreanText: string) => {
    try {
      setIsTranslating(true)
      
      console.log("원본 텍스트:", koreanText);
      
      // GPT-4o API 호출 - 간결한 영어 프롬프트로 요약
      const response = await fetch('/api/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: koreanText,
          summarize: true // 간결하게 요약 옵션 추가
        }),
      })

      if (!response.ok) {
        throw new Error('프롬프트 번역 실패')
      }

      const data = await response.json()
      console.log("API 응답:", data);
      
      // API 응답이 적절한 이미지 프롬프트가 아닌 경우 기본 프롬프트 사용
      if (data.prompt && (
          data.prompt.includes("적합하지 않습니다") || 
          data.prompt.includes("시각적") || 
          data.prompt.includes("예를 들어") ||
          data.prompt.includes("이미지 생성 프롬프트") ||
          data.prompt.includes("I'm sorry") ||
          data.prompt.includes("can't create")
      )) {
        console.log("GPT 응답이 유효한 프롬프트가 아닙니다. 기본 프롬프트 사용");
        // fallback: 기본 영어 프롬프트 생성
        const fallbackPrompt = `A visual representation of "${koreanText}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
        onTranscriptionComplete(fallbackPrompt);
        return;
      }
      
      // 정상적인 이미지 프롬프트인 경우
      console.log("정상 프롬프트 사용:", data.prompt);
      onTranscriptionComplete(data.prompt)
    } catch (error) {
      console.error('프롬프트 번역 오류:', error)
      
      // 오류 발생 시 기본 프롬프트 사용
      const fallbackPrompt = `A visual representation of "${koreanText}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
      console.log("오류 발생, 기본 프롬프트 사용:", fallbackPrompt);
      onTranscriptionComplete(fallbackPrompt);
      
      // 오류 메시지 표시
      setRecordingText(koreanText + "\n\n[오류: 프롬프트 변환 중 문제가 발생했습니다]")
    } finally {
      setIsTranslating(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null
    
    // 이벤트 타입 확인 (input change 또는 drag event)
    if ('dataTransfer' in event) {
      // 드래그 앤 드롭 이벤트
      event.preventDefault()
      setIsDragging(false)
      
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        file = event.dataTransfer.files[0]
      }
    } else {
      // 파일 선택 이벤트
      file = event.target.files?.[0] || null
    }
    
    if (!file) return

    // 파일 크기 체크 (25MB 제한)
    if (file.size > 25 * 1024 * 1024) {
      setRecordingText('파일 크기가 너무 큽니다. 25MB 이하의 파일만 지원합니다.')
      return
    }

    // 지원하는 오디오 파일 형식 체크
    const supportedFormats = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/m4a', 'audio/mp4', 'audio/flac', 'audio/ogg']
    const supportedExtensions = ['mp3', 'wav', 'webm', 'm4a', 'mp4', 'flac', 'ogg', 'oga', 'mpga', 'mpeg']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    
    // MIME 타입이 없거나 일치하지 않는 경우 확장자로 확인
    const isSupportedFormat = supportedFormats.includes(file.type) || 
                             file.type.startsWith('audio/') || 
                             supportedExtensions.includes(fileExt);
    
    if (!isSupportedFormat) {
      setRecordingText('지원되지 않는 파일 형식입니다. 지원되는 형식: MP3, WAV, WebM, M4A, MP4, FLAC, OGG 등')
      return
    }

    try {
      setIsUploading(true)
      setRecordingText('오디오 파일 분석 중...')
      
      console.log('업로드 파일 정보:', { 
        name: file.name, 
        type: file.type, 
        size: Math.round(file.size / 1024) + 'KB',
        extension: fileExt
      });
      
      // 문제가 발생할 수 있는 형식이면 파일 변환 시도
      let fileToUpload = file;
      const problematicFormats = ['m4a', 'audio/m4a'];
      
      if (problematicFormats.includes(fileExt) || problematicFormats.includes(file.type)) {
        try {
          setRecordingText('오디오 파일 변환 중...');
          fileToUpload = await convertAudioToMP3(file);
          console.log('오디오 변환됨:', fileToUpload.name, fileToUpload.type);
        } catch (conversionError) {
          console.error('오디오 변환 실패, 원본 파일 사용:', conversionError);
          // 변환 실패 시 원본 파일 사용
        }
      }
      
      const formData = new FormData()
      formData.append('file', fileToUpload)

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (!response.ok) {
        const errorMsg = data.error || '서버 응답 오류';
        const details = data.details ? ` (${data.details})` : '';
        throw new Error(errorMsg + details);
      }

      if (data.text) {
        setRecordingText(data.text)
        
        // 한국어 텍스트를 영어 프롬프트로 자동 변환
        await translateToEnglishPrompt(data.text)
      } else {
        setRecordingText('음성을 인식할 수 없습니다.')
      }
    } catch (error: any) {
      console.error('파일 업로드 오류:', error)
      setRecordingText(`오디오 파일 처리 중 오류가 발생했습니다. ${error.message || ''}`)
    } finally {
      setIsUploading(false)
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div 
      className="flex flex-col items-center gap-3 p-2 rounded-lg transition-colors"
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileUpload}
      style={{ 
        border: isDragging ? '2px dashed #7c3aed' : 'none',
        background: isDragging ? 'rgba(124, 58, 237, 0.05)' : 'transparent'
      }}
    >
      <div className="flex gap-6 justify-center py-4">
        <button
          className={`
              relative flex flex-col items-center justify-center w-20 h-20 rounded-2xl
              shadow-lg transition-all duration-300 focus:outline-none transform hover:scale-105
              ${isRecording 
                ? 'bg-gradient-to-br from-red-400 to-red-600 dark:from-red-600 dark:to-red-900' 
                : 'bg-gradient-to-br from-purple-400 to-indigo-600 dark:from-purple-600 dark:to-indigo-900'
              }
            `}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isUploading || isTranslating || isProcessing}
        >
          {isRecording ? (
            <>
              <MicOff className="h-10 w-10 text-white drop-shadow-md" />
              <span className="absolute -top-2 -right-2 bg-white text-red-600 font-semibold text-xs rounded-full w-7 h-7 flex items-center justify-center shadow-md border-2 border-red-400">
                {formatTime(recordingDuration)}
              </span>
            </>
          ) : (
            <Mic className="h-10 w-10 text-white drop-shadow-md" />
          )}
        </button>

        <button
          className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl
            bg-gradient-to-br from-blue-400 to-cyan-600 dark:from-blue-600 dark:to-cyan-900
            shadow-lg transition-all duration-300 focus:outline-none transform hover:scale-105"
          onClick={triggerFileUpload}
          disabled={isRecording || isUploading || isTranslating || isProcessing}
        >
          <FileAudio className="h-10 w-10 text-white drop-shadow-md" />
          <span className="text-xs mt-1 text-white font-medium">파일 업로드</span>
        </button>
      </div>

      <div className="text-center text-sm text-zinc-500 h-6">
        {isTranslating ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <p>음성 분석 중...</p>
          </div>
        ) : isUploading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <p>파일 업로드 중...</p>
          </div>
        ) : recordingText ? (
          <p>{recordingText}</p>
        ) : (
          <p>음성 녹음 또는 오디오 파일 업로드</p>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="audio/*"
        onChange={handleFileUpload}
      />
    </div>
  )
} 