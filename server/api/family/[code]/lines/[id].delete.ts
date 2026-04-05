import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'ID ligne invalide' })
  }

  await prisma.budgetLine.delete({ where: { id } })

  return { success: true }
})
