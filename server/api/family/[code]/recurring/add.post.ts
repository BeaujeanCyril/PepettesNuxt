import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)

  if (!code) throw createError({ statusCode: 400, statusMessage: 'Code requis' })

  const family = await prisma.family.findUnique({ where: { code } })
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  const { name, amount, isIncome, categoryId, startMonth, startYear, endMonth, endYear } = body

  if (!name || amount === undefined || !startMonth || !startYear) {
    throw createError({ statusCode: 400, statusMessage: 'Champs requis: name, amount, startMonth, startYear' })
  }

  // Create the recurring line definition
  const recurring = await prisma.recurringLine.create({
    data: {
      name,
      amount: Math.abs(amount),
      isIncome: !!isIncome,
      categoryId: categoryId || null,
      familyId: family.id,
      startMonth,
      startYear,
      endMonth: endMonth || null,
      endYear: endYear || null
    }
  })

  // Materialize lines for the start year immediately
  await materializeRecurring(family.id, recurring, startYear)

  return recurring
})

async function materializeRecurring(familyId: number, recurring: any, year: number) {
  for (let m = 1; m <= 12; m++) {
    if (!isMonthInRange(year, m, recurring)) continue

    // Ensure BudgetMonth exists
    let budgetMonth = await prisma.budgetMonth.findUnique({
      where: { year_month_familyId: { year, month: m, familyId } }
    })
    if (!budgetMonth) {
      budgetMonth = await prisma.budgetMonth.create({
        data: { year, month: m, familyId }
      })
    }

    // Check if line already exists for this month
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
