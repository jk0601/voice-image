# Flux: 음성-이미지 생성 서비스

Next.js와 Vercel 플랫폼을 기반으로 한 음성에서 이미지를 생성하는 AI 서비스입니다.

## 사전 요구사항

프로젝트를 시작하기 전에 다음 도구들이 설치되어 있어야 합니다:

1. **Node.js** - 최신 LTS 버전 권장 (v14 이상)
   - [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드
   - Node.js를 설치하면 npm도 함께 설치됩니다

2. **Git** - 버전 관리 및 템플릿 클론용
   - [Git 공식 사이트](https://git-scm.com/downloads)에서 다운로드

3. **GitHub 계정** - 코드 저장 및 Vercel 배포용
   - [GitHub](https://github.com)에서 계정 생성

설치 확인 방법:
```bash
# Node.js 버전 확인
node -v

# npm 버전 확인
npm -v

# git 버전 확인
git --version
```

## 개발 흐름

### 1. Next.js AI Chatbot 템플릿 설치

[Vercel AI Chatbot 템플릿](https://vercel.com/templates/ai/nextjs-ai-chatbot)을 사용하여 프로젝트를 생성합니다:

```bash
# NPX로 Vercel AI Chatbot 템플릿 프로젝트 생성
npx create-next-app flux-app --example https://github.com/vercel/ai-chatbot

# 프로젝트 폴더로 이동
cd flux-app

# 의존성 충돌 해결을 위해 --legacy-peer-deps 옵션으로 패키지 설치
npm install --legacy-peer-deps
```

#### AI Chatbot 템플릿 특징
- **Next.js App Router** - 고성능 라우팅 및 서버 컴포넌트 지원
- **Vercel AI SDK** - LLM 통합을 위한 통합 API
- **shadcn/ui** - Tailwind CSS 스타일링
- **데이터 저장** - Vercel Postgres 및 Blob Storage 통합
- **Auth.js** - 인증 시스템

### 2. GitHub 저장소 생성 및 연결

1. GitHub에서 새 저장소 생성:
   - [GitHub](https://github.com)에 로그인
   - New repository 버튼 클릭
   - 저장소 이름 입력 (예: `flux-app`)
   - 저장소 생성

2. 로컬 프로젝트를 GitHub에 연결:
   ```bash
   # Git 초기화
   git init
   
   # .gitignore 파일 확인 (node_modules 및 .env.local이 포함되어 있는지 확인)
   # 없다면 생성
   echo "node_modules\n.env.local\n.next\n" > .gitignore
   
   # 변경사항 스테이징 및 커밋
   git add .
   git commit -m "Initial commit"
   
   # GitHub 저장소 연결 및 푸시
   git remote add origin https://github.com/사용자이름/flux-app.git
   git branch -M main
   git push -u origin main
   ```

### 3. 필요한 패키지 설치

NPM을 사용하여 필요한 추가 패키지를 설치합니다:

```bash
# 핵심 패키지 설치 (의존성 충돌 방지)
npm install --legacy-peer-deps @fal-ai/client openai react-speech-recognition 

# Supabase 관련 패키지 설치
npm install --legacy-peer-deps @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared

# UI 컴포넌트 관련 패키지 설치
npm install --legacy-peer-deps @radix-ui/react-toast @radix-ui/react-icons @radix-ui/react-tabs @radix-ui/react-dropdown-menu class-variance-authority zustand
```

> **참고**: React 19 RC 버전과의 호환성 문제로 `--legacy-peer-deps` 옵션을 사용하여 패키지를 설치합니다.

### 4. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 필요한 API 키를 추가합니다:

```bash
# PowerShell에서 .env.local 파일 생성
New-Item -Path .env.local -ItemType File
```

파일에 다음 내용을 추가합니다:

```
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Fal.ai
FAL_KEY=your_fal_key
FAL_SECRET=your_fal_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. API 키 획득 및 설정

#### 5.1 OpenAI API 키 발급

1. [OpenAI 웹사이트](https://platform.openai.com)에 가입
2. API 섹션에서 새 API 키 생성
3. 생성된 키를 `.env.local`의 `OPENAI_API_KEY`에 추가

#### 5.2 Fal.ai 설정

##### 방법 1: API 키 직접 설정

1. [Fal.ai](https://fal.ai)에 가입 및 로그인
2. 대시보드에서 "API Keys" 메뉴로 이동
3. "Create Key" 버튼을 클릭하여 새 API 키 생성
4. 생성된 키를 `.env.local`의 `FAL_KEY`와 `FAL_SECRET`에 추가
5. 앱에서는 "flux" 이미지 모델을 사용합니다 (환경 변수로 별도 설정 불필요)
6. API 사용량 및 제한은 대시보드의 "Usage" 탭에서 확인 가능합니다

##### 방법 2: Vercel-Fal.ai 통합 사용

1. [Vercel](https://vercel.com) 대시보드에 로그인
2. 프로젝트 선택 > "Integrations" 탭 클릭
3. Fal.ai 통합 검색 및 선택
4. "Add Integration" 버튼 클릭
5. 지시에 따라 Fal.ai 계정 연결
6. 연결이 완료되면 자동으로 필요한 환경 변수가 설정됨
7. 이 방법을 사용하면 별도로 API 키를 관리할 필요가 없음

#### 5.4 Supabase 설정

##### Vercel-Supabase 통합 사용

Vercel에서 직접 Supabase 통합을 설정하는 방법:

1. **Vercel 계정에서 Supabase 통합**:
   - [Vercel 대시보드](https://vercel.com/)에 로그인
   - 프로젝트 선택 > "Storage" 탭 클릭
   - "Supabase" 연동 선택
   - 새 데이터베이스 생성 또는 기존 데이터베이스 연결

2. **환경 변수 자동 설정**:
   - Vercel-Supabase 통합은 자동으로 필요한 환경 변수를 설정합니다
   - 프로젝트 대시보드에서 "Environment Variables" 탭에서 확인 가능

3. **중요: 데이터베이스 테이블 생성**:
   - Vercel-Supabase 통합으로 데이터베이스를 생성한 경우에도 테이블은 별도로 생성해야 합니다
   - Supabase 대시보드에서 SQL 에디터를 사용하여 아래의 테이블 생성 쿼리를 실행해야 합니다
   - 이 단계를 건너뛰면 앱이 정상적으로 작동하지 않습니다
   - SQL 에디터에서 다음 쿼리를 실행하세요:
   ```sql
   CREATE TABLE generated_images (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     image_url TEXT NOT NULL,
     prompt TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
   );

   -- RLS 정책 설정 (Row Level Security)
   ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

   -- 모든 사용자가 모든 이미지를 볼 수 있도록 정책 설정
   CREATE POLICY "모든 사용자가 모든 이미지를 볼 수 있습니다." 
     ON generated_images FOR SELECT 
     USING (true);

   -- 모든 사용자가 모든 이미지를 삭제할 수 있도록 정책 설정
   CREATE POLICY "모든 사용자가 모든 이미지를 삭제할 수 있습니다." 
     ON generated_images FOR DELETE 
     USING (true);
     
   -- 모든 사용자가 이미지를 삽입할 수 있도록 정책 설정
   CREATE POLICY "모든 사용자가 이미지를 삽입할 수 있습니다." 
     ON generated_images FOR INSERT 
     WITH CHECK (true);
   
   -- User 테이블 생성
   CREATE TABLE IF NOT EXISTS "User" (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     email VARCHAR(64) NOT NULL,
     password VARCHAR(64)
   );
   
   -- RLS 정책 설정
   ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
   
   -- 공개 접근 정책 (필요에 따라 조정 가능)
   CREATE POLICY "모든 사용자 접근 허용" 
     ON "User" FOR SELECT 
     USING (true);
   
   CREATE POLICY "본인 계정만 수정 가능" 
     ON "User" FOR UPDATE 
     USING (auth.uid() = id);
   
   CREATE POLICY "본인 계정만 삭제 가능" 
     ON "User" FOR DELETE 
     USING (auth.uid() = id);
   
   CREATE POLICY "계정 생성 허용" 
     ON "User" FOR INSERT 
     WITH CHECK (true);
   
   -- User 테이블과 auth.users 테이블 연결
   ALTER TABLE public.user
   ADD CONSTRAINT fk_user_auth
   FOREIGN KEY (id) REFERENCES auth.users(id);
   ```

##### 수동 Supabase 설정

Supabase를 직접 설정하려면:

1. **Supabase 프로젝트 생성**:
   - [Supabase 홈페이지](https://supabase.com)에 접속하여 로그인
   - 새 프로젝트 생성 버튼 클릭
   - 프로젝트 이름 입력 (예: "flux-app")
   - 필요한 설정 선택 후 프로젝트 생성

2. **중요: 데이터베이스 테이블 생성**:
   - 앱이 정상적으로 작동하려면 반드시 필요한 단계입니다
   - SQL 에디터에서 위와 같은 쿼리를 실행하여 이미지 저장을 위한 테이블을 생성하세요

3. **API 키 및 URL 확인**:
   - 프로젝트 설정 > API 섹션에서 URL과 anon key 확인
   - 또는 Vercel 대시보드의 Quickstart 섹션에 있는 .env.local 탭에서 환경 변수 정보 확인
   - 이 값들을 `.env.local` 파일에 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 6. 핵심 기능 구현

Flux 앱은 다음 핵심 기능들로 구성되어 있습니다:

#### 6.1 음성 인식 (Speech-to-Text)
- OpenAI Whisper API를 사용하여 음성을 텍스트로 변환
- 한국어 음성 인식을 위한 특별 최적화
- 실시간 음성 녹음 및 처리

#### 6.2 텍스트-프롬프트 변환
- OpenAI GPT-4o를 사용하여 일반 텍스트를 고품질 이미지 프롬프트로 변환
- 프롬프트에 스타일, 분위기, 조명, 색상 등 자동 추가
- 최적화된 프롬프트로 이미지 생성 품질 향상

#### 6.3 이미지 생성
- Fal.ai의 FLUX 이미지 생성 모델을 사용하여 고품질 이미지 생성
- 다양한 스타일 옵션 제공 (Hyper-realism, Anime, Pixar, Fantasy, 3D Render, Oil Painting 등)
- 생성된 이미지 저장 및 다운로드 기능
- Supabase Storage를 통한 이미지 영구 저장

#### 6.4 사용자 인증 및 갤러리
- Supabase Auth를 통한 사용자 인증 시스템
  - 이메일/비밀번호 로그인 기능
  - 회원가입 기능
  - 로그인 상태에 따른 UI 조건부 표시
- 생성된 이미지 Supabase 데이터베이스 저장 및 관리
  - 이미지 URL, 프롬프트 텍스트, 생성 날짜 등 메타데이터 저장
  - 로그인 사용자의 이미지만 필터링하여 표시
- 개인 갤러리에서 이미지 조회 및 관리
  - 그리드 레이아웃으로 생성한 이미지 표시
  - 이미지 클릭 시 상세 정보(프롬프트, 생성일자) 표시
  - 이미지 다운로드 및 삭제 기능

### 7. 프로젝트 실행

개발 서버를 실행하여 Flux 앱을 로컬 환경에서 테스트할 수 있습니다:

```bash
# 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3000 으로 접속하여, 음성 입력부터 이미지 생성까지의 전체 워크플로우를 테스트해볼 수 있습니다.

### 8. 배포

Vercel 플랫폼을 통해 손쉽게 Flux 앱을 배포할 수 있습니다:

1. **GitHub 계정과 Vercel 계정 연결**:
   - Vercel 대시보드에서 GitHub 계정을 연결합니다
   - 해당 저장소를 선택하여 직접 배포할 수 있습니다

2. **배포 시 발생할 수 있는 문제 해결**:
   - ESLint 오류 발생 시: `next.config.ts` 파일에서 `eslint: { ignoreDuringBuilds: true }` 설정 추가
   - 패키지 매니저 충돌 시: Install Command를 `npm install --legacy-peer-deps` 또는 `pnpm install --no-frozen-lockfile`로 변경
   - 데이터베이스 마이그레이션 오류 시: Build Command를 `next build`로 변경하여 마이그레이션 스크립트 실행 건너뛰기

3. **환경 변수 설정**:
   - Vercel 대시보드에서 프로젝트 선택
   - Settings > Environment Variables 메뉴에서 모든 환경 변수 추가
   - API 키와 Supabase 연결 정보 등 필요한 모든 변수 설정

4. **Supabase 인증 URL 설정**:
   - 배포된 웹사이트 URL을 Supabase에 등록하여 인증 기능이 정상 작동하도록 설정
   - 인증 이메일의 리디렉션 문제를 해결하기 위한 필수 단계입니다
   - 설정 방법:
     1. Supabase 대시보드에 로그인하여 프로젝트 선택
     2. 왼쪽 메뉴에서 "Authentication" 클릭 후 "URL Configuration" 탭 이동
     3. "Site URL"에 배포된 웹사이트 URL 입력 (예: `https://flux-app-three.vercel.app`)
     4. "Redirect URLs"에 웹사이트 URL + "/auth-callback" 추가 (예: `https://flux-app-three.vercel.app/auth-callback`)
     5. 변경사항 저장

배포된 앱은 Vercel에서 제공하는 도메인을 통해 접근할 수 있습니다.

### 9. 오류 해결 가이드

프로젝트 실행 중 발생할 수 있는 주요 오류와 해결 방법입니다:

#### 9.1 의존성 관련 오류

- **문제**: `npm install` 실행 시 의존성 충돌 오류 발생
- **해결**: `--legacy-peer-deps` 옵션 사용
  ```bash
  npm install --legacy-peer-deps
  ```

- **문제**: 특정 패키지 설치 오류
- **해결**: 개별 패키지 설치 시도
  ```bash
  npm install --legacy-peer-deps 패키지명
  ```

#### 9.2 API 연결 오류

- **문제**: OpenAI API 또는 Fal.ai API 연결 실패
- **해결**:
  1. `.env.local` 파일의 API 키가 올바른지 확인
  2. API 서비스 상태 및 사용량 한도 확인
  3. API 요청 형식이 최신 문서와 일치하는지 확인

#### 9.3 인증 관련 오류

- **문제**: "이미 등록된 이메일로 회원가입 시도" 오류
- **해결**: 로그인 페이지로 이동하여 해당 이메일로 로그인 시도

- **문제**: 회원가입 이메일 인증 링크 클릭 시 로컬호스트로 리디렉션 발생
- **해결**: Supabase 대시보드에서 Site URL 설정
  1. Authentication > URL Configuration에서 실제 배포 URL 등록
  2. Redirect URLs에 배포 URL + "/auth-callback" 추가
  3. 설정 후 다시 회원가입 테스트

- **문제**: 로그인 후 세션 유지 안됨
- **해결**: localStorage를 통한 세션 확인 로직 추가 (이미 구현됨)

#### 9.4 이미지 생성/저장 오류

- **문제**: 이미지 생성 시 오류 발생
- **해결**:
  1. 콘솔에서 오류 메시지 확인
  2. Fal.ai API 키 및 사용량 확인
  3. 프롬프트에 금지된 내용이 포함되어 있는지 확인

- **문제**: 이미지 저장 실패
- **해결**:
  1. Supabase 연결 확인
  2. 데이터베이스 테이블이 올바르게 생성되었는지 확인
  3. RLS(Row Level Security) 정책이 올바르게 설정되었는지 확인

#### 9.5 갤러리 기능 오류

- **문제**: 갤러리에 이미지가 표시되지 않음
- **해결**:
  1. 로그인 상태 확인
  2. 콘솔에서 데이터베이스 쿼리 오류 확인
  3. 네트워크 요청 탭에서 API 응답 확인

- **문제**: 갤러리에서 프롬프트 복사 시 한국어와 영어가 모두 복사됨
- **해결**: `handleCopyPrompt` 함수에서 영어 프롬프트만 복사하도록 수정되었음

#### 9.6 배포 관련 오류

- **문제**: Vercel 배포 시 ESLint 오류
- **해결**: `next.config.ts` 파일에 다음 설정 추가
  ```typescript
  module.exports = {
    eslint: {
      // ESLint 오류를 무시하고 빌드 진행
      ignoreDuringBuilds: true,
    },
  }
  ```

- **문제**: 타입스크립트 오류로 빌드 실패
- **해결**: `next.config.ts` 파일에 다음 설정 추가
  ```typescript
  module.exports = {
    typescript: {
      // 타입 오류가 있어도 빌드 진행
      ignoreBuildErrors: true,
    },
  }
  ```


##모달뷰를 위해 Dialog컴포넌트 설치
- npm install @radix-ui/react-dialog --legacy-peer-deps #의존성 문제로 legacy 추가 