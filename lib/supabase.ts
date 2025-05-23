import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// 환경 변수 확인 및 로깅
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다:', { 
    url: supabaseUrl ? '설정됨' : '없음', 
    key: supabaseAnonKey ? '설정됨' : '없음' 
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'supabase-auth'
  }
});

// 사용자 인증 관련 함수
export async function signIn(email: string, password: string) {
  try {
    console.log('로그인 시도:', { email });
    
    // 먼저 이메일이 존재하는지 확인
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    // 사용자가 존재하지 않으면 명확한 메시지 반환
    if (!existingUser && !checkError) {
      console.log('존재하지 않는 이메일로 로그인 시도:', email);
      return { 
        data: null, 
        error: { 
          message: '존재하지 않는 계정입니다. 회원가입 먼저 진행해주세요.' 
        } 
      };
    }
    
    // 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('로그인 오류 발생:', error);
      
      // 이메일/비밀번호 오류 메시지 개선
      if (error.message && error.message.includes('Invalid login credentials')) {
        error.message = '존재하지 않는 계정이거나 비밀번호가 일치하지 않습니다. 계정이 없다면 회원가입을 진행해주세요.';
      }
      
      // AuthApiError 같은 기술적 접두사 제거
      if (error.message && error.message.includes('AuthApiError:')) {
        error.message = error.message.replace('AuthApiError:', '').trim();
      }
      
      return { data: null, error };
    } else {
      console.log('로그인 성공:', data.user?.id);
      
      // 세션 확인 및 로깅
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('세션 정보:', sessionData?.session ? '있음' : '없음');
      
      // User 테이블 확인 및 필요 시 생성
      if (data.user) {
        try {
          // User 테이블에서 사용자 조회
          console.log('user 테이블에서 사용자 조회:', data.user.id);
          const { data: userData, error: userError } = await supabase
            .from('user')  // 소문자 'user'로 변경
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (userError || !userData) {
            console.log('user 테이블에 사용자 정보가 없습니다. 생성합니다.');
            
            // User 테이블에 사용자 정보 추가
            const { error: insertError } = await supabase
              .from('user')  // 소문자 'user'로 변경
              .insert([
                { 
                  id: data.user.id,
                  email: data.user.email,
                  // 추가 필드가 있다면 여기에 추가
                }
              ]);
            
            if (insertError) {
              console.warn('user 테이블 데이터 추가 실패:', insertError);
            } else {
              console.log('user 테이블에 데이터 추가 성공');
            }
          } else {
            console.log('user 테이블 사용자 정보 확인 완료');
          }
        } catch (userDbError) {
          console.warn('user 테이블 확인/생성 예외:', userDbError);
        }
      }
    }
    
    return { data, error };
  } catch (e) {
    console.error('로그인 예외 발생:', e);
    return { data: null, error: e instanceof Error ? e : new Error('알 수 없는 오류') };
  }
}

export async function signUp(email: string, password: string) {
  try {
    console.log('회원가입 시도:', { email });
    
    // 환경 변수 다시 확인
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('회원가입 시 Supabase 환경 변수 확인 실패');
      return { 
        data: null, 
        error: new Error('Supabase 구성이 올바르지 않습니다. 관리자에게 문의하세요.') 
      };
    }
    
    // 이미 가입된 이메일인지 확인
    try {
      // user 테이블에서 확인
      const { count, error: countError } = await supabase
        .from('user')
        .select('*', { count: 'exact', head: true })
        .eq('email', email);
      
      if (count && count > 0) {
        console.log('이미 가입된 이메일로 회원가입 시도:', email);
        return { 
          data: null, 
          error: new Error('이미 가입된 이메일입니다. 로그인을 시도해주세요.') 
        };
      }
      
      // 추가 확인: 로그인 시도로 계정 존재 여부 확인
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: 'temp_check_only_123', // 임의 패스워드, 실제로는 틀린 비밀번호
      }).catch(() => ({ data: null, error: null }));
      
      // 비밀번호가 틀려도 계정이 있으면 응답에 user 객체가 포함됩니다
      if (authData && authData.user) {
        console.log('이미 등록된 이메일로 회원가입 시도:', email);
        return { 
          data: null, 
          error: new Error('이미 가입된 이메일입니다. 로그인을 시도해주세요.') 
        };
      }
    } catch (checkError) {
      console.warn('이메일 중복 확인 중 오류:', checkError);
      // 확인 과정에서 오류가 발생해도 회원가입 계속 진행
    }
    
    // URL 생성
    const redirectUrl = `${window.location.origin}/auth-callback`;
    console.log('리디렉션 URL 설정:', redirectUrl);
    
    // 이메일 확인 유지하며 회원가입
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });
    
    if (error) {
      console.error('회원가입 오류:', error);
      
      // 오류 메시지 개선
      if (error.message) {
        // 이미 가입된 계정 오류
        if (error.message.includes('already registered')) {
          error.message = '이미 존재하는 계정입니다. 로그인을 시도해주세요.';
        }
        
        // 비밀번호 길이 오류
        else if (error.message.includes('password') && error.message.includes('length')) {
          error.message = '비밀번호는 최소 6자 이상이어야 합니다.';
        }
        
        // 이메일 형식 오류
        else if (error.message.includes('email') && error.message.includes('format')) {
          error.message = '이메일 형식이 올바르지 않습니다.';
        }
        
        // AuthApiError 같은 기술적 접두사 제거
        if (error.message.includes('AuthApiError:')) {
          error.message = error.message.replace('AuthApiError:', '').trim();
        }
      }
      
      return { data: null, error };
    }
    
    console.log('회원가입 성공:', data);
    
    // 사용자 정보가 있으면 User 테이블에도 추가
    if (data.user) {
      try {
        // User 테이블에 추가 - 테이블 이름은 소문자로 사용
        console.log('user 테이블에 데이터 추가 시도:', { id: data.user.id, email: data.user.email });
        const { error: userError } = await supabase
          .from('user')  // 소문자 'user'로 변경
          .insert([
            { 
              id: data.user.id,
              email: data.user.email,
              // 추가 필드가 있다면 여기에 추가
            }
          ]);
        
        if (userError) {
          console.warn('user 테이블 데이터 추가 실패:', userError);
          // 인증은 성공했으므로 오류를 반환하지 않고 로그만 남김
        } else {
          console.log('user 테이블에 데이터 추가 성공');
        }
      } catch (userDbError) {
        console.warn('user 테이블 추가 예외:', userDbError);
        // 인증은 성공했으므로 오류를 반환하지 않고 로그만 남김
      }
    }
    
    // 데이터 반환 (이메일 인증 필요)
    return { data, error: null };
  } catch (e) {
    console.error('회원가입 예외 발생:', e);
    return { data: null, error: e instanceof Error ? e : new Error('알 수 없는 오류') };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('로그아웃 오류:', error);
    } else {
      console.log('로그아웃 성공');
    }
    return { error };
  } catch (e) {
    console.error('로그아웃 예외:', e);
    return { error: e instanceof Error ? e : new Error('알 수 없는 오류') };
  }
}

// 현재 로그인된 사용자 가져오기
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return { user, error: null };
  } catch (e) {
    console.error('사용자 조회 예외:', e);
    return { user: null, error: e instanceof Error ? e : new Error('알 수 없는 오류') };
  }
}

// 이미지 갤러리 관련 함수
export async function saveGeneratedImage(userId: string, imageUrl: string, prompt: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .insert([
      { 
        user_id: userId, 
        image_url: imageUrl, 
        prompt, 
        created_at: new Date().toISOString() 
      }
    ]);
  
  return { data, error };
}

export async function getUserImages(userId: string, page = 1) {
  const limit = 4; // 페이지당 4개 이미지 (1줄 x 4열)
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  console.log(`이미지 로드: 페이지 ${page}, 범위 ${from}-${to}`);
  
  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  
  console.log(`이미지 로드 결과: ${data?.length}개`);
  
  return { data, error };
}

export async function deleteUserImage(imageId: string) {
  const { data, error } = await supabase
    .from('generated_images')
    .delete()
    .eq('id', imageId);
  
  return { data, error };
}

// 전체 이미지 개수 조회 함수 추가
export async function getTotalImageCount(userId: string) {
  console.log(`총 이미지 개수 조회: ${userId}`);
  
  const { count, error } = await supabase
    .from('generated_images')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  console.log(`총 이미지 개수: ${count}`);
  
  return { count, error };
} 