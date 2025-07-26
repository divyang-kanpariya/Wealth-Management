// Quick database check script
const { PrismaClient } = require('@prisma/client')

async function checkDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Checking database state...\n')
    
    // Check investments
    const investments = await prisma.investment.findMany({
      include: {
        goal: true,
        account: true
      }
    })
    
    console.log(`📊 Total investments in database: ${investments.length}`)
    
    if (investments.length > 0) {
      console.log('\n📋 Investment details:')
      investments.forEach((inv, index) => {
        console.log(`${index + 1}. ${inv.name} (${inv.type})`)
        console.log(`   ID: ${inv.id}`)
        console.log(`   Created: ${inv.createdAt}`)
        console.log(`   Goal: ${inv.goal?.name || 'No goal'}`)
        console.log(`   Account: ${inv.account?.name || 'No account'}`)
        console.log('')
      })
    } else {
      console.log('❌ No investments found in database')
    }
    
    // Check goals
    const goals = await prisma.goal.findMany()
    console.log(`🎯 Total goals in database: ${goals.length}`)
    
    // Check accounts  
    const accounts = await prisma.account.findMany()
    console.log(`🏦 Total accounts in database: ${accounts.length}`)
    
    // Check if there are any recent deletions in logs (if you have audit logs)
    console.log('\n🕐 Recent database activity:')
    console.log('(Note: This would require audit logging to be enabled)')
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()