const { PrismaClient } = require('@prisma/client');

async function checkAccounts() {
  const prisma = new PrismaClient();
  try {
    const accounts = await prisma.account.findMany({
      include: {
        investments: true
      }
    });
    console.log('Accounts found:', accounts.length);
    accounts.forEach(account => {
      console.log(`- ${account.name} (${account.id}) - ${account.investments.length} investments`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAccounts();