import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies(); // ← await here
    const token = cookieStore.get('jwt')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: { username: string; avatarUrl: string } = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
