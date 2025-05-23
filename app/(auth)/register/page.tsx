'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/auth-form';

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">회원가입</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            이메일과 비밀번호로 계정을 만드세요
          </p>
        </div>
        <AuthForm initialTab="signup" />
      </div>
    </div>
  );
}
