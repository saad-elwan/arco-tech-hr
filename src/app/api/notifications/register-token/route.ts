import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/middleware';

export async function POST(request: Request) {
  try {
    const auth = getAuthFromRequest(request as any);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await prisma.employee.update({
      where: { id: auth.id },
      data: { fcmToken: token }
    });

    return NextResponse.json({ success: true, message: 'Token registered successfully' });
  } catch (error) {
    console.error('Error registering token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
