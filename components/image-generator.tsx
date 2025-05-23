'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, Save, Info, Mic, RotateCw, Download, Check, HelpCircle, Play, Wand2 } from 'lucide-react'
import Image from 'next/image'
import { saveGeneratedImage } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ImageGeneratorProps {
  initialPrompt?: string
  userId?: string
}

// AspectRatio 옵션 타입 정의
interface AspectRatioOption {
  value: string;
  label: string;
}

// 비율 선택 팝오버 컴포넌트 props 타입 정의
interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: AspectRatioOption[];
}

// 비율 선택 팝오버 컴포넌트
const AspectRatioSelector = ({ value, onChange, options }: AspectRatioSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 font-normal flex items-center gap-2 border-0"
        >
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              checked={true}
              readOnly
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <span className="text-zinc-800 dark:text-zinc-200">{value}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" sideOffset={5} align="start">
        <div className="grid grid-cols-3 gap-2">
          {options.map((option: AspectRatioOption) => (
            <div
              key={option.value}
              className="w-full"
            >
              <button
                type="button"
                className={`w-full aspect-ratio-btn p-2 text-sm rounded-md border transition-colors ${
                  option.value === value 
                    ? 'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-800' 
                    : 'bg-white hover:bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }`}
                onClick={() => onChange(option.value)}
              >
                {option.value}
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function ImageGenerator({ initialPrompt = '', userId }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [koreanPrompt, setKoreanPrompt] = useState('')
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [promptSource, setPromptSource] = useState<'direct' | 'voice'>('direct')
  const [optimizationSource, setOptimizationSource] = useState<'glif' | 'gpt4o' | ''>('')
  const [selectedStyle, setSelectedStyle] = useState('Hyper-realism')
  
  // 이미지 생성 옵션
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [rawMode, setRawMode] = useState(false)
  
  const { toast } = useToast()

  // 스타일 옵션 목록
  const styleOptions = [
    'Logo Design',
    'Circular Logo Design',
    'UI/UX Design',
    'Embroidery',
    'Manga',
    'Hyper-realism',
    'Anime',
    'Pixar',
    'Fantasy',
    'RPG',
    'Pixel Art',
    'Watercolor',
    'Hand-drawn',
    '3D Rendered',
    'Collage',
    'Glitch Art',
    'Vintage Photography'
  ]
  
  // 종횡비 옵션
  const aspectRatioOptions = [
    { value: '1:1', label: '정사각형 (1:1)' },
    { value: '16:9', label: '가로 와이드 (16:9)' },
    { value: '9:16', label: '세로 와이드 (9:16)' },
    { value: '4:3', label: '가로 스탠다드 (4:3)' },
    { value: '3:4', label: '세로 스탠다드 (3:4)' },
    { value: '3:2', label: '가로 사진 (3:2)' },
    { value: '2:3', label: '세로 사진 (2:3)' },
    { value: '21:9', label: '시네마틱 와이드 (21:9)' },
    { value: '9:21', label: '세로 긴 (9:21)' },
  ]

  // 모델 ID - 실제 환경변수에서 가져오는 것이 이상적이지만, 클라이언트 컴포넌트에서는 어려움
  const modelId = 'fal-ai/flux-pro/v1.1-ultra' // Fal.ai 모델 ID
  const modelName = 'Fal.ai FLUX Pro Ultra' // 사람이 읽기 쉬운 모델 이름

  // initialPrompt가 변경될 때마다 업데이트
  useEffect(() => {
    if (initialPrompt) {
      setKoreanPrompt(initialPrompt)
      // 영어로 들어오는 경우를 위한 처리
      const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(initialPrompt);
      if (!isKorean) {
        setPrompt(initialPrompt);
      }
      
      // 초기 프롬프트가 있으면 음성 녹음으로부터 온 것으로 간주
      setPromptSource('voice');
      
      // 음성 인식 결과가 한국어인 경우 자동으로 GPT-4o 최적화 실행
      if (isKorean) {
        // 비동기 함수 정의
        const autoOptimize = async () => {
          try {
            setIsOptimizing(true);
            const response = await fetch('/api/optimize-prompt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                text: initialPrompt,
                style: selectedStyle
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.prompt) {
                setPrompt(initialPrompt); // 원본 프롬프트 저장
                setOptimizedPrompt(data.prompt);
                setOptimizationSource('gpt4o');
                
                toast({
                  title: "음성 프롬프트 최적화 완료",
                  description: "GPT-4o를 통해 음성 인식 결과가 최적화되었습니다",
                  variant: "default"
                });
              }
            }
          } catch (err) {
            console.error('음성 프롬프트 자동 최적화 오류:', err);
          } finally {
            setIsOptimizing(false);
          }
        };
        
        // 자동 최적화 실행
        autoOptimize();
      }
    } else {
      setPromptSource('direct');
    }
  }, [initialPrompt]);

  const optimizePrompt = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요.')
      return
    }

    setError('')
    setIsOptimizing(true)
    
    try {
      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: prompt,
          style: selectedStyle 
        }),
      })

      if (!response.ok) {
        throw new Error('프롬프트 최적화 실패')
      }

      const data = await response.json()
      setOptimizedPrompt(data.prompt)
      setOptimizationSource(data.source || '')
      
      const sourceText = data.source === 'glif' ? 'Glif.app' : data.source === 'gpt4o' ? 'GPT-4o' : '';
      toast({
        title: "프롬프트 최적화 완료",
        description: `최적화된 프롬프트로 이미지를 생성해보세요 (${sourceText})`,
        variant: "default"
      })
    } catch (err) {
      console.error('프롬프트 최적화 오류:', err)
      setError('프롬프트 최적화 중 오류가 발생했습니다.')
      
      toast({
        title: "최적화 실패",
        description: "프롬프트 최적화 과정에서 오류가 발생했습니다",
        variant: "destructive"
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const generateImage = async () => {
    // 입력된 프롬프트가 영어가 아니면 자동으로 GPT-4o를 통해 최적화
    let promptToUse = optimizedPrompt || prompt;
    
    // 영어로 된 프롬프트인지 확인
    const isEnglish = /^[A-Za-z0-9\s.,!?;:()\-"']+$/.test(promptToUse);
    
    if (!isEnglish && !optimizedPrompt) {
      // 영어가 아니고 아직 최적화되지 않은 경우 GPT-4o로 최적화 시도
      try {
        setIsOptimizing(true);
        const response = await fetch('/api/optimize-prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: promptToUse,
            style: selectedStyle
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.prompt) {
            promptToUse = data.prompt;
            setOptimizedPrompt(data.prompt);
            setOptimizationSource('gpt4o');
            
            toast({
              title: "프롬프트 자동 최적화 완료",
              description: "GPT-4o를 통해 프롬프트가 자동으로 최적화되었습니다",
              variant: "default"
            });
          }
        } else {
          // 최적화 실패 시 기본 영어 프롬프트로 변환
          promptToUse = `A visual representation of "${promptToUse}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
        }
      } catch (err) {
        console.error('자동 프롬프트 최적화 오류:', err);
        // 오류 발생 시 기본 영어 프롬프트로 변환
        promptToUse = `A visual representation of "${promptToUse}" with vibrant colors, detailed composition, artistic style, high quality, 4K resolution, beautiful lighting.`;
      } finally {
        setIsOptimizing(false);
      }
    }

    if (!promptToUse.trim()) {
      setError('프롬프트를 입력해주세요.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      console.log("이미지 생성 시작, 프롬프트:", promptToUse);
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: promptToUse,
          style: selectedStyle,
          aspect_ratio: aspectRatio,
          raw: rawMode
        }),
      });

      if (!response.ok) {
        throw new Error('이미지 생성 실패');
      }

      const data = await response.json();
      console.log("이미지 생성 결과:", data);
      
      setImageUrl(data.imageUrl);
    } catch (err) {
      console.error('이미지 생성 오류:', err);
      setError('이미지 생성 중 오류가 발생했습니다.');
      
      toast({
        title: "이미지 생성 실패",
        description: "이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }

  const saveImage = async () => {
    if (!userId) {
      toast({
        title: '로그인이 필요합니다',
        description: '이미지를 저장하려면 로그인해주세요.',
        variant: 'destructive'
      })
      return
    }

    if (!imageUrl) {
      setError('저장할 이미지가 없습니다.')
      return
    }

    setIsSaving(true)

    try {
      // 원본 한국어 프롬프트와 영어 프롬프트를 함께 저장
      const promptToSave = koreanPrompt 
        ? `${koreanPrompt}\n\nEnglish Prompt: ${optimizedPrompt || prompt}`
        : optimizedPrompt || prompt;
        
      const { data, error } = await saveGeneratedImage(
        userId,
        imageUrl,
        promptToSave
      )

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: '이미지 저장 완료',
        description: '갤러리에서 확인할 수 있습니다.',
        variant: 'default'
      })
      
      // 갤러리 갱신을 위한 커스텀 이벤트 발생
      const galleryUpdateEvent = new CustomEvent('gallery:update', {
        detail: { userId }
      });
      window.dispatchEvent(galleryUpdateEvent);
      
    } catch (err) {
      console.error('이미지 저장 오류:', err)
      setError('이미지 저장 중 오류가 발생했습니다.')
      
      toast({
        title: "저장 실패",
        description: "이미지 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const downloadImage = () => {
    if (!imageUrl) {
      toast({
        title: "다운로드 실패",
        description: "다운로드할 이미지가 없습니다",
        variant: "destructive"
      })
      return
    }
    
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `flux-image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "다운로드 시작됨",
      description: "이미지 다운로드가 시작되었습니다",
      variant: "default"
    })
  }

  return (
    <div className="space-y-6">
      {/* 프롬프트 입력 영역 */}
      <div className="space-y-4">
        {promptSource === 'voice' && koreanPrompt && (
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Mic className="h-4 w-4" />
              <span>음성 인식 결과</span>
            </div>
            <p className="text-sm">{koreanPrompt}</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-col space-y-2">
            {optimizedPrompt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <span className="text-green-500 font-medium mr-1">최적화됨</span>
                  {optimizationSource && (
                    <span className="ml-1 px-1 py-0.5 bg-gray-100 dark:bg-zinc-800 rounded text-[10px]">
                      {optimizationSource === 'glif' ? 'Glif.app' : 'GPT-4o'}
                    </span>
                  )}
                </div>
                
                <Button
                  onClick={optimizePrompt}
                  variant="outline"
                  size="sm"
                  disabled={isOptimizing || !prompt.trim()}
                  className={`text-xs h-7 px-2 ${isOptimizing ? "bg-zinc-100 dark:bg-zinc-800 animate-pulse" : ""}`}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      최적화 중...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-1 h-3 w-3" />
                      프롬프트 최적화
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {!optimizedPrompt && (
              <div className="flex items-center justify-end mb-2">
                <Button
                  onClick={optimizePrompt}
                  variant="outline"
                  size="sm"
                  disabled={isOptimizing || !prompt.trim()}
                  className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-[10px] ml-1 border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 text-purple-600 hover:from-purple-100 hover:to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 dark:border-purple-800/50 dark:text-blue-300 shadow-sm"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      최적화 중...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wand-sparkles mr-1 h-3 w-3">
                        <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"></path>
                        <path d="m14 7 3 3"></path>
                        <path d="M5 6v4"></path>
                        <path d="M19 14v4"></path>
                        <path d="M10 2v2"></path>
                        <path d="M7 8H3"></path>
                        <path d="M21 16h-4"></path>
                        <path d="M11 3H9"></path>
                      </svg>
                      프롬프트 최적화
                    </>
                  )}
                </Button>
              </div>
            )}
            
            <Textarea
              placeholder="원하는 이미지에 대해 설명해주세요..."
              value={optimizedPrompt || prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setOptimizedPrompt('');
                if (e.target.value !== initialPrompt) {
                  setPromptSource('direct');
                }
              }}
              className="resize-none h-24 focus:ring-1 focus:ring-purple-400"
            />
            
            {/* 예시 문구를 textarea 아래로 이동 */}
            {promptSource === 'direct' && (
              <div className="text-xs text-zinc-500 mt-1">
                <p>예: '바다 위로 떠오르는 보름달', '안개 낀 숲속의 오두막'</p>
              </div>
            )}
            
            {/* 스타일 선택 드롭다운 - 예시 문구 아래에 배치하고 1:1, Raw 버튼을 같은 줄에 배치 */}
            <div className="mt-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center flex-1">
                  <label className="text-xs text-zinc-500 whitespace-nowrap mr-2">스타일:</label>
                  <select 
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="flex-1 text-xs border rounded px-2 py-1 bg-white dark:bg-zinc-800 dark:border-zinc-700"
                  >
                    {styleOptions.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
                
                <AspectRatioSelector
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={aspectRatioOptions}
                />
                
                <div className="flex items-center gap-2 h-9 rounded-md bg-white dark:bg-zinc-950 px-3">
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">Raw</span>
                  <div className="relative inline-flex h-5 w-9">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={rawMode}
                      onChange={() => setRawMode(!rawMode)}
                      id="raw-toggle"
                    />
                    <label
                      htmlFor="raw-toggle"
                      className={`absolute h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                        rawMode ? 'bg-purple-500' : 'bg-zinc-200 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute h-4 w-4 top-0.5 left-0.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                          rawMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-between">
              <div className="flex items-center gap-3">
                {/* AspectRatioSelector와 Raw 토글을 위로 이동했으므로 여기서 제거 */}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={generateImage}
                  size="sm" 
                  disabled={isLoading || (!prompt.trim() && !optimizedPrompt.trim())}
                  className={`text-xs transition-all rounded-full px-4 ${
                    isLoading 
                      ? "bg-purple-700 dark:bg-purple-800 animate-pulse" 
                      : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 border-none shadow-md hover:shadow-lg"
                  } text-white`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      이미지 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      이미지 생성
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between text-[10px] text-zinc-500 items-center mt-1">
              <div>
                {/* 불필요한 예시 텍스트 제거 */}
              </div>
              <div>
                {/* 모델 정보를 이미지 아래쪽으로 이동 */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 생성된 이미지 표시 영역 */}
      {imageUrl && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-md overflow-hidden">
          <div 
            className="relative w-full overflow-hidden"
            style={{ 
              aspectRatio: aspectRatio.replace(':', '/'),
              maxHeight: '80vh'
            }}
          >
            <Image
              src={imageUrl}
              alt="생성된 이미지"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 500px"
              priority
              quality={100}
              unoptimized={true}
              style={{transform: 'translate3d(0, 0, 0)'}}
              loading="eager"
            />
          </div>
          
          <div className="p-4 flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-zinc-500">
                <span>
                  {promptSource === 'voice' ? '음성으로 생성됨' : '텍스트로 생성됨'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadImage}
                  className="text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  다운로드
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  onClick={saveImage}
                  className="text-xs"
                >
                  {isSaving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  갤러리에 저장
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <div className="inline-flex items-center text-[10px] text-zinc-500">
                <Info className="w-3 h-3 mr-1" />
                <span>모델: {modelName}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 