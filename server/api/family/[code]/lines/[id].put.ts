import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID ligne invalide' })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.amount !== undefined) data.amount = Math.abs(Number(body.amount))
  if (body.isIncome !== undefined) data.isIncome = Boolean(body.isIncome)
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod || null

  const line = await prisma.budgetLine.update({
    where: { id },
    data,
    include: { category: true }
  })

  return line
})
