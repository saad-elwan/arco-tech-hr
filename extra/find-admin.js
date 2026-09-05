require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admins = await prisma.employee.findMany({
    where: { OR: [{ role: 'superadmin' }, { role: 'admin' }] }
  });
  console.log(JSON.stringify(admins.map(a => ({ email: a.email, phone: a.phone, role: a.role, password_hash: a.password })), null, 2));
}
main().finally(() => prisma.$disconnect());
