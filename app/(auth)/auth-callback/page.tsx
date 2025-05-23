'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const [message, setMessage] = useState('인증 처리 중...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 해시 파라미터 확인
        const hash = window.location.hash
        
        if (hash) {
          console.log('인증 콜백 처리 시작:', { hash })
          
          // 인증 세션 처리
          const { data, error } = await supabase.auth.getSession()
          
          if (error) {
            throw error
          }
          
          if (data?.session) {
            console.log('인증 성공:', data.session.user.id)
            
            // User 테이블 연결 확인 및 생성
            try {
              // 현재 인증된 사용자 정보
              const userId = data.session.user.id
              const userEmail = data.session.user.email
              
              // User 테이블에서 사용자 조회
              console.log('인증 콜백: user 테이블에서 사용자 조회:', userId)
              const { data: userData, error: userError } = await supabase
                .from('user')
                .select('*')
                .eq('id', userId)
                .single()
              
              if (userError || !userData) {
                console.log('인증 콜백: user 테이블에 사용자 정보가 없습니다. 생성합니다.')
                
                // User 테이블에 사용자 정보 추가
                const { error: insertError } = await supabase
                  .from('user')
                  .insert([
                    { 
                      id: userId,
                      email: userEmail,
                      // 추가 필드가 있다면 여기에 추가
                    }
                  ])
                
                if (insertError) {
                  console.warn('인증 콜백 - user 테이블 데이터 추가 실패:', insertError)
                } else {
                  console.log('인증 콜백 - user 테이블에 데이터 추가 성공')
                }
              } else {
                console.log('인증 콜백 - user 테이블 사용자 정보 확인 완료')
              }
            } catch (userDbError) {
              console.warn('인증 콜백 - user 테이블 확인/생성 예외:', userDbError)
              // 계속 진행
            }
            
            setMessage('인증이 완료되었습니다! 창이 잠시 후 닫힙니다.')
            
            // 메인 창에 성공 메시지 전달
            if (window.opener) {
              window.opener.postMessage({ type: 'AUTH_COMPLETE', success: true }, window.location.origin)
              
              // 3초 후 창 닫기
              setTimeout(() => {
                window.close()
              }, 3000)
            } else {
              // 창이 열려있지 않으면 메인 페이지로 이동
              window.location.href = '/'
            }
          } else {
            console.log('세션 없음, 로그인 페이지로 이동')
            setMessage('인증 처리 중 오류가 발생했습니다. 로그인 페이지로 이동합니다...')
            
            // 3초 후 로그인 페이지로 이동
            setTimeout(() => {
              window.location.href = '/login'
            }, 3000)
          }
        } else {
          console.log('인증 해시 없음, 로그인 페이지로 이동')
          window.location.href = '/login'
        }
      } catch (e) {
        console.error('인증 콜백 오류:', e)
        setError(e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다.')
        
        // 5초 후 로그인 페이지로 이동
        setTimeout(() => {
          window.location.href = '/login'
        }, 5000)
      }
    }
    
    handleAuthCallback()
  }, [])
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center">
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            이메일 인증
          </h2>
          
          {error ? (
            <div className="mt-4 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 