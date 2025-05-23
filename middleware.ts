import { NextResponse, type NextRequest } from 'next/server';

// 미들웨어 임시 비활성화
export async function middleware(request: NextRequest) {
  // Supabase 인증 사용을 위해 Next-Auth 미들웨어를 임시로 비활성화합니다
  return NextResponse.next();
}

// 모든 경로에 대해 미들웨어를 적용합니다
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
