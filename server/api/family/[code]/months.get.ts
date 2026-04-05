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

  const months = await prisma.budgetMonth.findMany({
    where: {
      familyId: family.id,
      year
    },
    include: {
      lines: {
        include: { category: true }
      }
    },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  })

  return months
})
