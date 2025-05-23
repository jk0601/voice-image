'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // 홈페이지에 접근하면 초기화면(flux 페이지)으로 리디렉션
    router.replace('/flux')
  }, [router])

  // 리디렉션 중 보여줄 내용 (보통 깜빡임이 없어 필요하지 않음)
  return null
}
