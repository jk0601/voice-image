'use client';

import { useState, useEffect } from 'react';
import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { usePathname } from '../hooks/use-sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signOut, getCurrentUser } from '@/lib/supabase';

type AppSidebarProps = {
  user?: User | null;
  chat?: User | null;
  chats?: User[] | null;
  isSession?: boolean;
  chatHistoryUrl?: string;
  setChatId?: (id: string) => void;
};

export function AppSidebar({
  user,
  chat,
  chats,
  isSession,
  chatHistoryUrl,
  setChatId
}: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // user가 전달되었으면 chat으로 사용
  const actualChat = chat || user;
  const actualIsSession = isSession ?? !!user;

  // Supabase에서 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { user } = await getCurrentUser();
      if (user && user.email) {
        // 이메일에서 사용자 이름 추출 (@ 앞 부분)
        const username = user.email.split('@')[0];
        setUserEmail(username);
      }
    };
    
    fetchUserInfo();
  }, []);

  // 로그인 상태 확인
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { user } = await getCurrentUser();
      setIsLoggedIn(!!user);
    };
    
    checkLoginStatus();
  }, []);

  return (
    <div>
      {/* 상단 네비게이션 바 */}
      <div className="fixed top-0 left-0 w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-2 px-4 flex justify-between z-20">
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="ghost"
            size="sm"
            className="font-medium"
            onClick={() => {
              // 커스텀 이벤트를 발생시켜 이미지 생성 상태만 초기화
              const resetEvent = new CustomEvent('reset-image-generator');
              window.dispatchEvent(resetEvent);
              
              // 현재 페이지가 /flux가 아닌 경우에만 페이지 이동
              if (pathname !== '/flux') {
                router.push('/flux');
              }
            }}
          >
            HOME
          </Button>
          <span className="text-zinc-300 dark:text-zinc-600">|</span>
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className="font-medium text-red-500 hover:text-red-600"
              onClick={async () => {
                await signOut();
                // 로컬 스토리지에서 로그인 상태 제거
                localStorage.removeItem('supabaseLoggedIn');
                // 페이지 새로고침하여 UI 상태 업데이트
                window.location.href = '/login';
              }}
            >
              LOGOUT
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="font-medium text-blue-500 hover:text-blue-600"
              asChild
            >
              <Link href="/login">
                LOGIN
              </Link>
            </Button>
          )}
        </div>

        {pathname === '/flux' && (
          <div className="flex items-center">
            <h1 className="flex items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 font-extrabold text-lg tracking-wider">
                AI
              </span>
              <span className="mx-1 text-sm font-light tracking-widest text-zinc-500 dark:text-zinc-400">
                IMAGE
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium text-sm tracking-wide">
                GENERATION
              </span>
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}
