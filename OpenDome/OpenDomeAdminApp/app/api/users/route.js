import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { cookies } from 'next/headers';

// Helper to get current user
function getCurrentUser(db) {
  const sessionId = cookies().get('auth_session');
  if (!sessionId) return null;
  return db.users.find(u => u.id === sessionId.value) || null;
}


export async function GET() {
  const db = getDb();
  const currentUser = getCurrentUser(db);
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'CHECKER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Strip passwords before returning
  const usersSafe = db.users.map(({ password, ...u }) => u);
  return NextResponse.json(usersSafe);
}

export async function POST(request) {
  const db = getDb();
  const currentUser = getCurrentUser(db);
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Only ADMIN can add users.' }, { status: 401 });
  }

  const { address, name, role } = await request.json();
  
  if (db.users.find(u => u.address === address)) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }

  const newUser = {
    id: Date.now().toString(),
    address,
    name,
    role: role || 'USER', // Default to USER
    tickets: []
  };

  db.users.push(newUser);
  saveDb(db);

  return NextResponse.json(newUser);
}

export async function PUT(request) {
  const db = getDb();
  const currentUser = getCurrentUser(db);
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Only ADMIN can modify roles.' }, { status: 401 });
  }

  const { id, role } = await request.json();
  
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent modifying an existing ADMIN's role (unless they are editing themselves, or another admin, but let's be strict: cannot demote admin)
  if (user.role === 'ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Cannot demote an ADMIN' }, { status: 403 });
  }

  user.role = role;
  saveDb(db);

  return NextResponse.json(user);
}

export async function DELETE(request) {
  const db = getDb();
  const currentUser = getCurrentUser(db);
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Only ADMIN can delete users.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  const targetUser = db.users.find(u => u.id === id);
  if (targetUser && targetUser.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot delete an ADMIN user' }, { status: 403 });
  }

  db.users = db.users.filter(u => u.id !== id);
  saveDb(db);

  return NextResponse.json({ success: true });
}
