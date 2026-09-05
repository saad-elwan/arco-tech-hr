require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
async function main() {
  const hashedPassword = await bcrypt.hash("arco8925", 12);
  
  // Find if Arco exists by name
  let arco = await prisma.employee.findFirst({
    where: { name: { equals: 'Arco', mode: 'insensitive' } }
  });
  
  if (arco) {
    await prisma.employee.update({
      where: { id: arco.id },
      data: {
        password: hashedPassword,
        role: 'superadmin',
        email: 'arco@arcotech.com',
        status: 'active'
      }
    });
    console.log("Arco user updated!");
  } else {
    await prisma.employee.create({
      data: {
        name: "Arco",
        email: "arco@arcotech.com",
        password: hashedPassword,
        role: "superadmin",
        status: "active",
        basicSalary: 0,
        maxAdvanceLimit: 0,
        permissions: JSON.stringify(["/dashboard", "/employees", "/attendance", "/tasks", "/evaluations", "/finance", "/tracking", "/shifts", "/departments", "/reports", "/settings", "/requests", "/super-admin"])
      }
    });
    console.log("Arco user created!");
  }
}
main().finally(() => prisma.$disconnect());
