import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const db = getDb();

    // Find user by name
    const user = db.users.find(u => u.name === username);

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Set secure HTTP-only cookie
    // In a real app, this should be a signed JWT, but for this prototype, storing the ID is fine.
    cookies().set({
      name: 'auth_session',
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
