'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getUserImages, deleteUserImage, getTotalImageCount } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Trash2, Download, ExternalLink, Loader2, Copy, Check, X, ArrowLeftCircle, ArrowRightCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogClose, DialogTitle } from '@/components/ui/dialog'

interface ImageGalleryProps {
  userId?: string;
}

interface GalleryImage {
  id: string;
  image_url: string;
  prompt: string;
  created_at: string;
}

export function ImageGallery({ userId }: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const imagesPerPage = 4 // 1줄 x 4열 = 4개 이미지
  const { toast } = useToast()
  
  // 모달 관련 상태 추가
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 이미지 로드 함수 정의
  const loadImages = async (page = 1) => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // 전체 이미지 수 가져오기
      const { count, error: countError } = await getTotalImageCount(userId)
      
      if (countError) {
        console.error('이미지 개수 조회 오류:', countError)
      } else if (count !== null) {
        const pages = Math.max(1, Math.ceil(count / imagesPerPage))
        console.log(`총 페이지 수 계산: ${count}개 이미지 / ${imagesPerPage} = ${pages} 페이지`)
        setTotalPages(pages)
      }
      
      // 현재 페이지의 이미지 가져오기
      const { data, error } = await getUserImages(userId, page)
      
      if (error) {
        throw new Error(error.message)
      }
      
      console.log(`페이지 ${page} 이미지 로드 완료:`, data?.length)
      setImages(data || [])
    } catch (err) {
      setError('이미지를 불러오는 중 오류가 발생했습니다.')
      console.error('갤러리 로드 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    console.log(`페이지 변경: ${currentPage} -> ${page}`)
    setCurrentPage(page)
    loadImages(page)
  }

  // 초기 로드
  useEffect(() => {
    loadImages(1)
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
  
  // 갤러리 업데이트 이벤트 리스너
  useEffect(() => {
    // 갤러리 업데이트 이벤트 핸들러
    const handleGalleryUpdate = (event: CustomEvent<{userId?: string}>) => {
      // 이벤트의 userId가 현재 컴포넌트의 userId와 일치하는지 확인
      if (event.detail?.userId === userId) {
        // 갤러리 이미지를 다시 로드 (첫 페이지)
        loadImages(1);
        setCurrentPage(1);
      }
    };

    // 갤러리 모달 열기 이벤트 핸들러
    const handleOpenGalleryModal = () => {
      console.log('갤러리 모달 열기 이벤트 수신');
      openGalleryModal();
    };

    // 이벤트 리스너 등록
    window.addEventListener('gallery:update', handleGalleryUpdate as EventListener);
    window.addEventListener('open-gallery-modal', handleOpenGalleryModal as EventListener);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('gallery:update', handleGalleryUpdate as EventListener);
      window.removeEventListener('open-gallery-modal', handleOpenGalleryModal as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, images]);

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      const { error } = await deleteUserImage(id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      // 현재 표시된 이미지 목록에서 삭제
      setImages(prev => prev.filter(img => img.id !== id))
      
      // 삭제한 이미지가 현재 선택된 이미지라면 선택 해제
      if (selectedImage?.id === id) {
        setSelectedImage(null)
      }

      // 이미지를 모두 삭제했고 1페이지가 아니면 이전 페이지로 이동
      if (images.length <= 1 && currentPage > 1) {
        handlePageChange(currentPage - 1)
      } 
      // 첫 페이지이거나 이미지가 남아있으면 현재 페이지 새로고침
      else {
        loadImages(currentPage)
      }
    } catch (err) {
      setError('이미지를 삭제하는 중 오류가 발생했습니다.')
      console.error('이미지 삭제 오류:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDownload = (url: string, prompt: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `flux-${prompt.substring(0, 20).replace(/\s+/g, '-')}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleCopyPrompt = async (prompt: string) => {
    try {
      setIsCopying(true);
      
      // 프롬프트에서 'English Prompt:' 이후 부분만 복사
      let promptToCopy = prompt;
      if (prompt.includes('English Prompt:')) {
        promptToCopy = prompt.split('English Prompt:')[1].trim();
      }
      
      await navigator.clipboard.writeText(promptToCopy);
      
      toast({
        title: "프롬프트 복사 완료",
        description: "프롬프트가 클립보드에 복사되었습니다.",
        variant: "default"
      });
    } catch (err) {
      console.error('프롬프트 복사 오류:', err);
      toast({
        title: "복사 실패",
        description: "프롬프트를 클립보드에 복사하지 못했습니다.",
        variant: "destructive"
      });
    } finally {
      // 복사 상태를 3초 동안 유지
      setTimeout(() => setIsCopying(false), 3000);
    }
  };

  // 이미지 URL을 새 창에서 안전하게 열기 위한 함수 추가
  const openImageInNewTab = (imageUrl: string) => {
    try {
      // Data URL인지 확인 (base64 이미지)
      if (imageUrl.startsWith('data:')) {
        // Data URL을 Blob으로 변환
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            // Blob URL 생성
            const blobUrl = URL.createObjectURL(blob);
            
            // 새 탭에서 Blob URL 열기
            window.open(blobUrl, '_blank');
            
            // 메모리 누수 방지를 위해 일정 시간 후 Blob URL 해제
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 60000); // 1분 후 해제
          })
          .catch(err => {
            console.error('이미지 열기 오류:', err);
            toast({
              title: "이미지 열기 실패",
              description: "이미지를 새 창에서 열 수 없습니다.",
              variant: "destructive"
            });
          });
      } else {
        // 일반 URL은 그대로 새 창에서 열기
        window.open(imageUrl, '_blank');
      }
    } catch (error) {
      console.error('이미지 열기 오류:', error);
      toast({
        title: "이미지 열기 실패",
        description: "이미지를 새 창에서 열 수 없습니다.",
        variant: "destructive"
      });
    }
  };

  // 이미지 인덱스 탐색 함수
  const goToNextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length)
      setSelectedImage(images[(currentImageIndex + 1) % images.length])
    }
  }

  const goToPrevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
      setSelectedImage(images[(currentImageIndex - 1 + images.length) % images.length])
    }
  }

  // 이미지 선택 핸들러 - 이미지 클릭 시 기존 방식으로 상세 정보 표시
  const handleImageSelect = (image: GalleryImage) => {
    setSelectedImage(image)
    setIsModalOpen(false) // 모달은 닫기
  }
  
  // 모달 열기 핸들러 - 갤러리 버튼 클릭 시 모달 열기
  const openGalleryModal = () => {
    console.log('openGalleryModal 함수 호출됨, 이미지 개수:', images.length);
    if (images.length > 0) {
      console.log('첫 번째 이미지 선택:', images[0].id);
      setCurrentImageIndex(0);
      setSelectedImage(images[0]);
      setIsModalOpen(true);
      console.log('모달 상태 변경됨:', true);
    } else {
      console.log('표시할 이미지가 없음');
      toast({
        title: "이미지 없음",
        description: "표시할 이미지가 없습니다.",
        variant: "destructive"
      });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">로그인이 필요합니다</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            이미지를 갤러리에 저장하고 관리하려면 로그인해주세요.
          </p>
          <Button variant="outline" asChild>
            <a href="/login">로그인하기</a>
          </Button>
        </div>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
        <div className="max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">아직 저장된 이미지가 없습니다</h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            이미지를 생성하고 갤러리에 저장해보세요!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 갤러리 버튼 삭제 */}
      
      {error && (
        <div className="p-3 bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-4 gap-4">
        {images.map((image) => (
          <div 
            key={image.id} 
            className="relative overflow-hidden rounded-xl cursor-pointer bg-zinc-100 dark:bg-zinc-800 shadow-sm hover:shadow-md transition-all"
            onClick={() => handleImageSelect(image)}
            style={{ width: '100%', aspectRatio: '1/1' }}
          >
            <Image
              src={image.image_url}
              alt={image.prompt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 25vw, 20vw"
            />
          </div>
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-4 pb-2 text-xs">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="h-6 w-6 rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeftCircle className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {(() => {
              // 표시할 페이지 번호 배열 생성
              const pageNumbers = [];
              const maxVisiblePages = 5;
              
              if (totalPages <= maxVisiblePages) {
                // 전체 페이지가 5개 이하면 모든 페이지 표시
                for (let i = 1; i <= totalPages; i++) {
                  pageNumbers.push(i);
                }
              } else {
                // 5개 초과일 경우 현재 페이지 주변 페이지 표시
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                // 끝쪽 페이지일 경우 시작 페이지 조정
                if (endPage === totalPages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(i);
                }
              }
              
              return pageNumbers.map(pageNum => (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="icon"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                  className={`h-6 w-6 rounded-full text-xs font-medium ${
                    currentPage === pageNum 
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-600 dark:from-purple-900/30 dark:to-blue-900/30 dark:text-blue-300 border border-purple-200 dark:border-purple-800/50 shadow-sm' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {pageNum}
                </Button>
              ));
            })()}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
            className="h-6 w-6 rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowRightCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {loading && (
        <div className="flex justify-center pt-6">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      )}
      
      {/* 이미지 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/80 border-none">
          <DialogTitle className="sr-only">갤러리 이미지 보기</DialogTitle>
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {selectedImage && (
              <>
                <Image
                  src={selectedImage.image_url}
                  alt={selectedImage.prompt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority
                />
                
                <div className="absolute bottom-4 left-0 right-0 p-4 bg-black/50 text-white">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-zinc-300">
                      생성일: {formatCreatedAt(selectedImage.created_at)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(selectedImage.image_url, selectedImage.prompt)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                      >
                        <Download className="mr-1 h-3 w-3" />
                        다운로드
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isDeleting === selectedImage.id}
                        onClick={() => {
                          handleDelete(selectedImage.id);
                          setIsModalOpen(false);
                        }}
                        className="text-xs bg-red-900/70 hover:bg-red-800 text-white border-red-800"
                      >
                        {isDeleting === selectedImage.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3 w-3" />
                        )}
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* 이전 이미지 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                {/* 다음 이미지 버튼 */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                
                {/* 닫기 버튼 */}
                <DialogClose className="absolute right-4 top-4 rounded-full h-8 w-8 flex items-center justify-center bg-black/50 text-white hover:bg-black/70">
                  <X className="h-4 w-4" />
                </DialogClose>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 기존 이미지 상세 정보 표시 섹션은 필요에 따라 삭제하거나 유지 가능 */}
      {selectedImage && !isModalOpen && (
        <div className="mt-8 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium">이미지 상세 정보</h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
            <div className="relative rounded-lg shadow-md" style={{ aspectRatio: '1/1' }}>
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                fill
                className="object-cover rounded-lg"
                sizes="(max-width: 768px) 100vw, 500px"
                priority
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 bg-white/80 hover:bg-white dark:bg-zinc-800/80 dark:hover:bg-zinc-800"
                  onClick={(e) => {
                    e.stopPropagation(); // 이벤트 버블링 방지
                    openImageInNewTab(selectedImage.image_url);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">프롬프트:</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    onClick={() => handleCopyPrompt(selectedImage.prompt)}
                  >
                    {isCopying ? (
                      <>
                        <Check className="mr-1 h-3 w-3 text-green-500" />
                        <span className="text-green-500">복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        <span>복사</span>
                      </>
                    )}
                  </Button>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-md text-xs whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                  {selectedImage.prompt.includes('English Prompt:') 
                    ? selectedImage.prompt.split('English Prompt:')[1].trim()
                    : selectedImage.prompt}
                </div>
                <div>
                  <p className="text-xs text-zinc-500">
                    생성일: {formatCreatedAt(selectedImage.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedImage.image_url, selectedImage.prompt)}
                  className="text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  다운로드
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isDeleting === selectedImage.id}
                  onClick={() => handleDelete(selectedImage.id)}
                  className="text-xs"
                >
                  {isDeleting === selectedImage.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  삭제
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 