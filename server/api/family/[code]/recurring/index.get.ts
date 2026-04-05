import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) throw createError({ statusCode: 400, statusMessage: 'Code requis' })

  const family = await prisma.family.findUnique({ where: { code } })
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  return prisma.recurringLine.findMany({
    where: { familyId: family.id },
    include: { category: true },
    orderBy: [{ isIncome: 'desc' }, { name: 'asc' }]
  })
})
