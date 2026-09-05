// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || "hr-system-secret-key-2024";

async function main() {
  const token = jwt.sign({ id: 1, role: 'admin', name: 'Admin' }, JWT_SECRET);
  console.log("Token:", token);

  const res = await fetch('http://localhost:3000/api/dashboard', {
    headers: {
      'Cookie': `hr_token=${token}`
    }
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

main().catch(console.error);
