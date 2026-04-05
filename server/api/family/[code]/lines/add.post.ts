import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)
  const { budgetMonthId, name, amount, isIncome, categoryId, paymentMethod } = body

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille requis' })
  }

  if (!budgetMonthId || !name || amount === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'budgetMonthId, name et amount requis' })
  }

  const line = await prisma.budgetLine.create({
    data: {
      name,
      amount: Math.abs(Number(amount)),
      isIncome: Boolean(isIncome),
      categoryId: categoryId ? Number(categoryId) : null,
      paymentMethod: paymentMethod || null,
      budgetMonthId: Number(budgetMonthId)
    },
    include: { category: true }
  })

  return line
})
