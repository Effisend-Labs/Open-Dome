import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get('auth_session');

  if (!sessionId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getDb();
  const user = db.users.find(u => u.id === sessionId.value);

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const { password: _, ...userWithoutPassword } = user;
  return NextResponse.json({ authenticated: true, user: userWithoutPassword });
}
