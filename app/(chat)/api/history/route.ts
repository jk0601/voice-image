import { auth } from '@/app/(auth)/auth';
import { NextRequest } from 'next/server';
// import { getChatsByUserId } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return Response.json(
      'Only one of starting_after or ending_before can be provided!',
      { status: 400 },
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  try {
    // 채팅 기록 데이터베이스 요청 대신 빈 결과 반환
    // const chats = await getChatsByUserId({
    //   id: session.user.id,
    //   limit,
    //   startingAfter,
    //   endingBefore,
    // });

    // 빈 채팅 목록과 더 이상 데이터가 없음을 나타내는 응답 반환
    const emptyChats = {
      chats: [],
      hasMore: false
    };

    return Response.json(emptyChats);
  } catch (_) {
    return Response.json('Failed to fetch chats!', { status: 500 });
  }
}
