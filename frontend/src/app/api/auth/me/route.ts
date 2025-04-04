import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const token = request.cookies.get('jwt'); // Get the JWT token from cookies
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Send request to the backend to verify the token and get user info
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Pass the JWT token in the header
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: { username: string, avatarUrl: string } = await res.json(); // Type the response
    return NextResponse.json(data); // Send user data to the frontend

  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
