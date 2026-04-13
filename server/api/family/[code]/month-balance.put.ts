import { findFamily } from '~/server/utils/family'
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)

  if (!code) throw createError({ statusCode: 400, statusMessage: 'Code requis' })

  const family = await findFamily(code!)
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  const { year, month } = body

  if (!year || !month) throw createError({ statusCode: 400, statusMessage: 'year et month requis' })

  const data: Record<string, any> = {}
  if (body.manualBalance !== undefined) data.manualBalance = body.manualBalance ?? null
  if (body.manualReport !== undefined) data.manualReport = body.manualReport ?? null
  if (body.manualSolde !== undefined) data.manualSolde = body.manualSolde ?? null

  let budgetMonth = await prisma.budgetMonth.findUnique({
    where: { year_month_familyId: { year, month, familyId: family.id } }
  })

  if (!budgetMonth) {
    budgetMonth = await prisma.budgetMonth.create({
      data: { year, month, familyId: family.id, ...data }
    })
  } else {
    budgetMonth = await prisma.budgetMonth.update({
      where: { id: budgetMonth.id },
      data
    })
  }

  return budgetMonth
})
