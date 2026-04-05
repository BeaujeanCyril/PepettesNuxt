import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const query = getQuery(event)
  const year = query.year ? Number(query.year) : new Date().getFullYear()

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille requis' })
  }

  const family = await prisma.family.findUnique({ where: { code } })

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })
  }

  // Materialize recurring lines for this year
  const recurringLines = await prisma.recurringLine.findMany({
    where: { familyId: family.id }
  })

  for (const recurring of recurringLines) {
    for (let m = 1; m <= 12; m++) {
      if (!isMonthInRange(year, m, recurring)) continue

      // Ensure BudgetMonth exists
      let budgetMonth = await prisma.budgetMonth.findUnique({
        where: { year_month_familyId: { year, month: m, familyId: family.id } }
      })
      if (!budgetMonth) {
        budgetMonth = await prisma.budgetMonth.create({
          data: { year, month: m, familyId: family.id }
        })
      }

      // Check if line already exists
      const existing = await prisma.budgetLine.findFirst({
        where: {
          budgetMonthId: budgetMonth.id,
          name: recurring.name,
          isIncome: recurring.isIncome
        }
      })

      if (!existing) {
        await prisma.budgetLine.create({
          data: {
            name: recurring.name,
            amount: recurring.amount,
            isIncome: recurring.isIncome,
            categoryId: recurring.categoryId,
            budgetMonthId: budgetMonth.id
          }
        })
      }
    }
  }

  // Now fetch all months with materialized lines
  const months = await prisma.budgetMonth.findMany({
    where: {
      familyId: family.id,
      year
    },
    include: {
      lines: {
        include: { category: true },
        orderBy: { name: 'asc' }
      }
    },
    orderBy: { month: 'asc' }
  })

  return months
})

function isMonthInRange(year: number, month: number, recurring: any): boolean {
  const start = recurring.startYear * 12 + recurring.startMonth
  const current = year * 12 + month
  if (current < start) return false
  if (recurring.endYear && recurring.endMonth) {
    const end = recurring.endYear * 12 + recurring.endMonth
    if (current > end) return false
  }
  return true
}
