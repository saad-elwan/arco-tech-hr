import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
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
      console.log('Arco account not found. It will be auto-created on login if they type arco@arcotech.com');
      return;
    }

    console.log('Found Arco account:', arco.id, arco.email, arco.role);
    
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
    
    console.log('Password reset to arco8925 successfully!');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
