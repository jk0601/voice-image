'use client'

import { useState, useEffect, useRef } from 'react'
import { VoiceRecognition } from '@/components/voice-recognition'
import { ImageGenerator } from '@/components/image-generator'
import { ImageGallery } from '@/components/image-gallery'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Mic, PenLine, ImageIcon, Info } from 'lucide-react'

export default function FluxPage() {
  const [transcribedText, setTranscribedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [userId, setUserId] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice')
  const [resetKey, setResetKey] = useState(Date.now())

  useEffect(() => {
    // 사용자 세션 확인
    async function getSession() {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setUserId(data.session.user.id)
      }
    }
    
    getSession()
    
    // 페이지 로드 시 resetKey 업데이트로 컴포넌트 초기화
    setResetKey(Date.now())
    
    // 이미지 생성기 초기화 이벤트 리스너 추가
    const handleResetImageGenerator = () => {
      console.log('이미지 생성기 초기화 이벤트 수신');
      setResetKey(Date.now());
      setTranscribedText('');
    };
    
    window.addEventListener('reset-image-generator', handleResetImageGenerator);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('reset-image-generator', handleResetImageGenerator);
    };
  }, [])

  const handleTranscriptionComplete = (text: string) => {
    setTranscribedText(text)
  }

  const resetTranscribedText = () => {
    setTranscribedText('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800 pt-16">
      <div className="container mx-auto px-3 py-4 md:py-6 max-w-5xl">
        <div className="flex flex-row">
          {/* 메인 영역 (50%) */}
          <div className="flex-1 pr-0 lg:pr-4 lg:w-[50%] max-w-2xl">
            <Tabs defaultValue="voice" className="mb-4" onValueChange={(value) => setActiveTab(value as 'voice' | 'text')}>
              <div className="flex justify-center mb-4 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
                <TabsList className="grid grid-cols-2 w-full max-w-xs bg-transparent">
                  <TabsTrigger 
                    value="voice" 
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700"
                  >
                    <Mic className="h-4 w-4" />
                    <span className="font-medium">음성</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="text" 
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700"
                  >
                    <PenLine className="h-4 w-4" />
                    <span className="font-medium">입력</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="voice" className="space-y-3">
                <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <CardContent className="pt-3 px-3">
                    <VoiceRecognition 
                      onTranscriptionComplete={handleTranscriptionComplete}
                      isProcessing={isProcessing}
                    />
                  </CardContent>
                </Card>
                
                {transcribedText && (
                  <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <CardContent className="pt-3 px-3">
                      <ImageGenerator 
                        initialPrompt={transcribedText} 
                        userId={userId}
                        key={resetKey}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="text" className="space-y-3">
                <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <CardContent className="pt-3 px-3">
                    <ImageGenerator 
                      userId={userId}
                      key={resetKey}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* 오른쪽 사이드바: 갤러리 (50%) */}
          <div className="hidden lg:block lg:w-[50%]">
            <div className="pl-4 h-full">
              <div className="flex justify-end mb-4 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
                <div 
                  className="max-w-xs rounded-lg py-2 px-4 bg-white dark:bg-zinc-700 flex items-center cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    // 이미지 갤러리 모달 열기 이벤트 발생
                    console.log('갤러리 버튼 클릭됨 - 데스크톱');
                    const event = new Event('open-gallery-modal');
                    window.dispatchEvent(event);
                  }}
                >
                  <ImageIcon className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="font-medium">갤러리</span>
                </div>
              </div>
              
              <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800 h-[calc(100vh-140px)] flex flex-col overflow-hidden">
                <CardContent className="pt-3 px-3 flex-1 overflow-y-auto">
                  <ImageGallery userId={userId} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* 모바일 화면에서만 보이는 갤러리 */}
        <div className="mt-8 lg:hidden">
          <div className="flex justify-end mb-4 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl">
            <div 
              className="max-w-xs rounded-lg py-2 px-4 bg-white dark:bg-zinc-700 flex items-center cursor-pointer hover:shadow-md transition-all"
              onClick={() => {
                // 이미지 갤러리 모달 열기 이벤트 발생
                console.log('갤러리 버튼 클릭됨 - 모바일');
                const event = new Event('open-gallery-modal');
                window.dispatchEvent(event);
              }}
            >
              <ImageIcon className="h-4 w-4 mr-2 text-purple-500" />
              <span className="font-medium">갤러리</span>
            </div>
          </div>
          
          <Card className="shadow-sm border border-zinc-100 dark:border-zinc-800 h-[560px] flex flex-col overflow-hidden">
            <CardContent className="pt-3 px-3 flex-1 overflow-y-auto">
              <ImageGallery userId={userId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 