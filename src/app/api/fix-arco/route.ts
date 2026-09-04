import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    let arco = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: 'arco@arcotech.com' },
          { name: 'Arco' }
        ]
      }
    });

    if (!arco) {
      return NextResponse.json({ error: 'Arco account not found.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('arco8925', salt);
    
    await prisma.employee.update({
      where: { id: arco.id },
      data: { 
        password: hash, 
        role: 'superadmin',
        permissions: JSON.stringify(["/dashboard", "/employees", "/attendance", "/tasks", "/evaluations", "/finance", "/tracking", "/shifts", "/departments", "/reports", "/settings", "/requests", "/super-admin"])
      }
    });
    
    return NextResponse.json({ success: true, message: 'Arco password reset to arco8925 successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
