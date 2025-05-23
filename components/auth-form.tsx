'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signIn, signUp, getCurrentUser } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { AlertCircle, CheckCircle, MailIcon, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AuthFormProps {
  initialTab?: 'signin' | 'signup'
}

export function AuthForm({ initialTab = 'signin' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [signinError, setSigninError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // 쿨다운 타이머 관리
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 로그인 상태 확인
  useEffect(() => {
    const checkUser = async () => {
      const { user } = await getCurrentUser();
      if (user) {
        console.log('이미 로그인되어 있습니다:', user.id);
      }
    };
    
    checkUser();
  }, []);
  
  // 탭 변경 시 오류 메시지 초기화
  const handleTabChange = (value: string) => {
    if (value === 'signin') {
      setSignupError(null);
    } else {
      setSigninError(null);
    }
  };
  
  // 인증 완료 메시지 리스너 추가
  useEffect(() => {
    // 인증 완료 메시지 처리 함수
    const handleAuthComplete = (event: MessageEvent) => {
      // 출처 확인 (보안)
      if (event.origin !== window.location.origin) return;
      
      // 메시지 타입 확인
      if (event.data?.type === 'AUTH_COMPLETE' && event.data?.success) {
        console.log('인증 완료 메시지 수신:', event.data);
        
        // 토스트 메시지 표시
        toast({
          title: '인증 완료!',
          description: '이메일 인증이 완료되었습니다. 로그인해주세요.',
          variant: 'default'
        });
        
        // 로그인 탭으로 전환
        const signinTab = document.querySelector('[value="signin"]') as HTMLElement;
        if (signinTab) {
          signinTab.click();
        }
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('message', handleAuthComplete);
    
    // 클린업
    return () => {
      window.removeEventListener('message', handleAuthComplete);
    };
  }, [toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSigninError(null)

    try {
      console.log('로그인 요청 시작:', { email });
      const { data, error } = await signIn(email, password)
      console.log('로그인 응답:', { 
        success: !error, 
        user: data?.user ? data.user.id : null,
        session: data?.session ? '있음' : '없음',
        error: error ? error.message : null
      });
      
      if (error) throw error
      
      toast({
        title: '로그인 성공',
        description: '환영합니다!',
      })
      
      // 로컬 스토리지에 로그인 상태 저장 (세션 문제 대응)
      localStorage.setItem('supabaseLoggedIn', 'true')
      
      // 홈페이지로 이동
      setTimeout(() => {
        router.push('/')
      }, 500)
    } catch (error) {
      console.error('로그인 오류:', error)
      
      // 오류 메시지 개선
      let errorMessage = '이메일 또는 비밀번호를 확인해주세요.';
      
      if (error instanceof Error) {
        // 원본 에러 메시지에서 사용자 친화적인 부분만 추출
        const errorStr = error.message;
        
        if (errorStr.includes('존재하지 않는 계정')) {
          errorMessage = '존재하지 않는 계정입니다. 회원가입을 먼저 진행해주세요.';
        } else if (errorStr.includes('비밀번호가 일치하지 않습니다') || errorStr.includes('비밀번호가 알맞지 않습니다')) {
          errorMessage = '비밀번호가 일치하지 않습니다.';
        } else if (errorStr.includes('Invalid login credentials')) {
          errorMessage = '존재하지 않는 계정이거나 비밀번호가 일치하지 않습니다.';
        }
      }
      
      // 오류 메시지를 상태에 저장하여 UI에 표시
      setSigninError(errorMessage);
      
      toast({
        title: '로그인 실패',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 쿨다운 시간 확인
    if (cooldown > 0) {
      toast({
        title: '잠시만 기다려주세요',
        description: `보안을 위해 ${cooldown}초 후에 다시 시도할 수 있습니다.`,
        variant: 'destructive',
      })
      return;
    }
    
    setLoading(true)
    setSignupError(null)
    console.log('회원가입 시도 중:', { email });

    try {
      // 회원가입 시도 전 상태 로깅
      console.log('Supabase 회원가입 함수 호출 전');
      
      const { data, error } = await signUp(email, password)
      
      // 응답 로깅
      console.log('Supabase 응답:', { data, error });
      
      if (error) {
        // 시간 제한 오류인 경우 쿨다운 설정
        if (error.message && error.message.includes('security purposes')) {
          const timeMatch = error.message.match(/after (\d+) seconds/);
          const waitTime = timeMatch ? parseInt(timeMatch[1]) : 50;
          setCooldown(waitTime);
          throw new Error(`보안을 위해 ${waitTime}초 후에 다시 시도해주세요.`);
        }
        throw error;
      }
      
      // 회원가입 성공 상태 기록
      setRegisteredEmail(email);
      setShowSuccessMessage(true);
      setEmail('');
      setPassword('');
      
      toast({
        title: '회원가입 성공!',
        description: '이메일을 확인하여 가입을 완료해주세요.',
        variant: 'default',
      })
      
    } catch (error) {
      console.error('회원가입 오류 상세 정보:', error);
      
      // 오류 유형에 따른 상세 메시지
      let errorMessage = '이메일 또는 비밀번호 형식을 확인해주세요.';
      let shouldSwitchToLogin = false; // 로그인 탭으로 전환 여부
      
      if (error instanceof Error) {
        // 기술적 에러 메시지에서 사용자 친화적인 부분만 추출
        const errorStr = error.message.toLowerCase();
        
        // 오류 메시지 정제
        if (errorStr.includes('쿨다운') || errorStr.includes('초 후에 다시 시도')) {
          errorMessage = error.message; // 이미 사용자 친화적인 메시지
        } else if (errorStr.includes('이미 가입된 이메일') || 
                   errorStr.includes('이미 존재하는 계정') || 
                   errorStr.includes('already registered') || 
                   errorStr.includes('already been registered') ||
                   errorStr.includes('already exists') ||
                   errorStr.includes('already taken') ||
                   errorStr.includes('login') || 
                   errorStr.includes('로그인')) {
          errorMessage = '이미 가입된 이메일입니다. 로그인 페이지로 이동합니다.';
          shouldSwitchToLogin = true; // 로그인 탭으로 전환 표시
        } else if (errorStr.includes('비밀번호') && (errorStr.includes('최소') || errorStr.includes('길이'))) {
          errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
        } else if (errorStr.includes('이메일') && errorStr.includes('형식')) {
          errorMessage = '올바른 이메일 형식을 입력해주세요.';
        }
        
        console.log('오류 인스턴스:', { name: error.name, message: error.message });
      }
      
      // 오류 메시지를 상태에 저장하여 UI에 표시
      setSignupError(errorMessage);
      
      toast({
        title: '회원가입 실패',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // 이미 가입된 계정인 경우 로그인 탭으로 전환
      if (shouldSwitchToLogin) {
        setTimeout(() => {
          // 로그인 탭으로 전환
          const signinTab = document.querySelector('[value="signin"]') as HTMLElement;
          if (signinTab) {
            signinTab.click();
            // 이메일 필드 유지 (비밀번호는 보안상 리셋)
            setPassword('');
          }
        }, 1500); // 토스트 메시지가 보일 시간을 고려하여 지연
      }
    } finally {
      setLoading(false)
    }
  }

  const renderSuccessMessage = () => {
    if (!showSuccessMessage) return null;
    
    return (
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md flex items-start gap-3 mb-4">
        <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-green-800 dark:text-green-300">회원가입 완료!</h4>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            <strong>{registeredEmail}</strong> 주소로 인증 이메일을 발송했습니다. 이메일을 확인하여 가입을 완료해주세요.
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-2">
            이메일이 도착하지 않았다면 스팸함을 확인해보세요.
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            인증 완료 후에는 인증 창이 자동으로 닫히며, 로그인할 수 있습니다.
          </p>
          <Button 
            variant="link" 
            size="sm" 
            className="text-green-600 dark:text-green-400 p-0 h-auto mt-1"
            onClick={() => setShowSuccessMessage(false)}
          >
            닫기
          </Button>
        </div>
      </div>
    );
  };

  // 오류 메시지 UI 컴포넌트
  const renderErrorMessage = (message: string | null) => {
    if (!message) return null;
    
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md flex items-start gap-3 mb-4">
        <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-red-800 dark:text-red-300">인증 오류</h4>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            {message}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>계정</CardTitle>
        <CardDescription>
          로그인하거나 회원가입하여 이미지를 저장해보세요.
        </CardDescription>
      </CardHeader>
      <Tabs defaultValue={initialTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">로그인</TabsTrigger>
          <TabsTrigger value="signup">회원가입</TabsTrigger>
        </TabsList>
        
        <TabsContent value="signin">
          {renderSuccessMessage()}
          {renderErrorMessage(signinError)}
          <form onSubmit={handleSignIn}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">이메일</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className={signinError ? "border-red-300 focus:ring-red-400" : ""}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">비밀번호</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className={signinError ? "border-red-300 focus:ring-red-400" : ""}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
              <p className="text-center text-sm text-gray-600 dark:text-zinc-400">
                계정이 없으신가요? <Link href="/register" className="font-semibold text-gray-800 hover:underline dark:text-zinc-200">회원가입</Link>하세요.
              </p>
            </CardFooter>
          </form>
        </TabsContent>
        
        <TabsContent value="signup">
          {renderSuccessMessage()}
          {renderErrorMessage(signupError)}
          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="signup-email" className="text-sm font-medium">이메일</label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className={signupError ? "border-red-300 focus:ring-red-400" : ""}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="signup-password" className="text-sm font-medium">비밀번호</label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="최소 6자 이상"
                  required
                  className={signupError ? "border-red-300 focus:ring-red-400" : ""}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || cooldown > 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    가입 중...
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    대기 중... ({cooldown}초)
                  </>
                ) : (
                  '회원가입'
                )}
              </Button>
              <p className="text-center text-sm text-gray-600 dark:text-zinc-400">
                이미 계정이 있으신가요? <Link href="/login" className="font-semibold text-gray-800 hover:underline dark:text-zinc-200">로그인</Link>하세요.
              </p>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
