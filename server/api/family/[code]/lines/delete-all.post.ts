import { findFamily } from '~/server/utils/family'
import prisma from '~/server/utils/db'

// Supprime COMPLETEMENT une ligne : la definition recurrente (pour stopper la
// re-materialisation) + toutes les BudgetLine correspondantes, tous mois/annees.
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody<{ name: string; isIncome: boolean }>(event)
  const name = body?.name?.trim()
  const isIncome = !!body?.isIncome

  if (!code || !name) {
    throw createError({ statusCode: 400, statusMessage: 'name requis' })
  }

  const family = await findFamily(code)
  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })
  }

  // 1. Supprimer les lignes recurrentes (stoppe la re-materialisation)
  await prisma.recurringLine.deleteMany({
    where: { familyId: family.id, name, isIncome }
  })

  // 2. Supprimer toutes les BudgetLine de cette famille avec ce nom + type
  const result = await prisma.budgetLine.deleteMany({
    where: {
      name,
      isIncome,
      budgetMonth: { familyId: family.id }
    }
  })

  return { success: true, deletedCount: result.count }
})
