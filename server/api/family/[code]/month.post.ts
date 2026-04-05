import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)
  const { year, month } = body

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille requis' })
  }

  if (!year || !month || month < 1 || month > 12) {
    throw createError({ statusCode: 400, statusMessage: 'Annee et mois valides requis' })
  }

  const family = await prisma.family.findUnique({ where: { code } })

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })
  }

  const budgetMonth = await prisma.budgetMonth.upsert({
    where: {
      year_month_familyId: { year, month, familyId: family.id }
    },
    create: {
      year,
      month,
      familyId: family.id
    },
    update: {},
    include: {
      lines: {
        include: { category: true }
      }
    }
  })

  return budgetMonth
})
