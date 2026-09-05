const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Assuming bcryptjs is used, or maybe the app uses bcrypt or built-in crypto.

async function main() {
  const prisma = new PrismaClient();
  try {
    // Let's first check what auth library is used by the app to hash passwords.
    // Looking at the previous file, it imports `hashPassword` from `@/lib/auth`.
    // I will just require that file. But next.js aliases don't work easily in raw node scripts.
    
    // I will find the employee named Arco
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
    
    // To ensure the password is 'arco8925', let's use the same bcrypt as the app.
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
