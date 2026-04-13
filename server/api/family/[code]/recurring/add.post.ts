import { findFamily } from '~/server/utils/family'
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)

  if (!code) throw createError({ statusCode: 400, statusMessage: 'Code requis' })

  const family = await findFamily(code!)
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  const { name, amount, isIncome, categoryId, startMonth, startYear, type, paymentMethod, dayOfMonth } = body

  if (!name || amount === undefined || !startMonth || !startYear) {
    throw createError({ statusCode: 400, statusMessage: 'Champs requis: name, amount, startMonth, startYear' })
  }

  const recurring = await prisma.recurringLine.create({
    data: {
      name,
      amount: Math.abs(amount),
      isIncome: !!isIncome,
      type: type || 'monthly',
      categoryId: categoryId || null,
      paymentMethod: paymentMethod || null,
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
      familyId: family.id,
      startMonth,
      startYear,
      endMonth: null,
      endYear: null
    }
  })

  // Materialize for the start year
  await materializeRecurring(family.id, recurring, startYear)

  return recurring
})

async function materializeRecurring(familyId: number, recurring: any, year: number) {
  for (let m = 1; m <= 12; m++) {
    if (!shouldMaterialize(year, m, recurring)) continue

    let budgetMonth = await prisma.budgetMonth.findUnique({
      where: { year_month_familyId: { year, month: m, familyId } }
    })
    if (!budgetMonth) {
      budgetMonth = await prisma.budgetMonth.create({
        data: { year, month: m, familyId }
      })
    }

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
          paymentMethod: recurring.paymentMethod,
          dayOfMonth: recurring.dayOfMonth,
          budgetMonthId: budgetMonth.id
        }
      })
    }
  }
}

function shouldMaterialize(year: number, month: number, recurring: any): boolean {
  const start = recurring.startYear * 12 + recurring.startMonth
  const current = year * 12 + month
  if (current < start) return false
  if (recurring.endYear && recurring.endMonth) {
    const end = recurring.endYear * 12 + recurring.endMonth
    if (current > end) return false
  }
  // Yearly: only the specific month each year
  if (recurring.type === 'yearly') {
    return month === recurring.startMonth
  }
  // Quarterly: every 3 months from start month
  if (recurring.type === 'quarterly') {
    const diff = (current - start)
    return diff % 3 === 0
  }
  return true
}
