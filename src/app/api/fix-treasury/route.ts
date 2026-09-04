import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.treasuryTransaction.deleteMany();
    await prisma.treasury.upsert({
      where: { id: 1 },
      update: {
        balance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0
      },
      create: {
        id: 1,
        balance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0
      }
    });
    return NextResponse.json({ success: true, message: 'Treasury reset completed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
