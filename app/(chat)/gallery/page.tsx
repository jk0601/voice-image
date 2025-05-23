'use client'

import { useState, useEffect } from 'react'
import { ImageGallery } from '@/components/image-gallery'
import { getCurrentUser } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function GalleryPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 로그인 상태 확인
        const { user } = await getCurrentUser()
        
        if (user) {
          console.log('사용자 정보 로드:', user.id)
          setUserId(user.id)
        } else {
          // 로컬 스토리지에서 로그인 상태 확인 (세션 문제 대응)
          const isLoggedIn = localStorage.getItem('supabaseLoggedIn')
          console.log('로컬 스토리지 로그인 상태:', isLoggedIn)
          
          if (!isLoggedIn) {
            // 로그인 페이지로 이동
            window.location.href = '/login'
            return
          }
        }
      } catch (error) {
        console.error('사용자 정보 로드 오류:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">이미지 갤러리</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          생성한 이미지를 관리하고 다운로드하세요
        </p>
      </div>

      <div className="w-full">
        <ImageGallery userId={userId || undefined} />
      </div>
    </div>
  )
} 