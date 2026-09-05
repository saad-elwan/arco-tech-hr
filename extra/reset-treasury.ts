import { prisma } from './src/lib/prisma';

async function main() {
  try {
    const deletedTransactions = await prisma.$transaction([prisma.transaction.deleteMany()]);
    console.log(`Successfully deleted ${deletedTransactions[0].count} transactions.`);
  } catch (error) {
    console.error('Error deleting transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
