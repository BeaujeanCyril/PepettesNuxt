import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '')
  const body = await readBody(event)

  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'ID invalide' })

  const data: Record<string, any> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.amount !== undefined) data.amount = Math.abs(body.amount)
  if (body.type !== undefined) data.type = body.type
  if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
  if (body.dayOfMonth !== undefined) data.dayOfMonth = body.dayOfMonth ? Number(body.dayOfMonth) : null

  const updated = await prisma.recurringLine.update({
    where: { id },
    data
  })

  return updated
})
