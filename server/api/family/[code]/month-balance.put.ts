import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)

  if (!code) throw createError({ statusCode: 400, statusMessage: 'Code requis' })

  const family = await prisma.family.findUnique({ where: { code } })
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  const { year, month, manualBalance } = body

  if (!year || !month) throw createError({ statusCode: 400, statusMessage: 'year et month requis' })

  let budgetMonth = await prisma.budgetMonth.findUnique({
    where: { year_month_familyId: { year, month, familyId: family.id } }
  })

  if (!budgetMonth) {
    budgetMonth = await prisma.budgetMonth.create({
      data: { year, month, familyId: family.id, manualBalance: manualBalance ?? null }
    })
  } else {
    budgetMonth = await prisma.budgetMonth.update({
      where: { id: budgetMonth.id },
      data: { manualBalance: manualBalance ?? null }
    })
  }

  return budgetMonth
})
