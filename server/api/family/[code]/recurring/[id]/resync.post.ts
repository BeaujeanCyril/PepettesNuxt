import { findFamily } from '~/server/utils/family'
import prisma from '~/server/utils/db'

// Re-synchronise la materialisation d'une ligne recurrente a partir d'un mois donne :
// - supprime les BudgetLine des mois qui ne doivent PAS avoir de paiement (selon le type)
// - cree celles manquantes pour les mois qui doivent en avoir
// Ne touche pas aux mois anterieurs au cutoff (historique preserve).
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const id = parseInt(getRouterParam(event, 'id') || '')
  const body = await readBody<{ fromYear?: number; fromMonth?: number }>(event)

  if (!code || isNaN(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Parametres invalides' })
  }

  const family = await findFamily(code)
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })

  const recurring = await prisma.recurringLine.findFirst({ where: { id, familyId: family.id } })
  if (!recurring) throw createError({ statusCode: 404, statusMessage: 'Ligne recurrente non trouvee' })

  const now = new Date()
  const fromYear = body?.fromYear ?? now.getFullYear()
  const fromMonth = body?.fromMonth ?? (now.getMonth() + 1)
  const cutoff = fromYear * 12 + fromMonth

  const shouldHavePayment = (year: number, month: number): boolean => {
    const start = recurring.startYear * 12 + recurring.startMonth
    const current = year * 12 + month
    if (current < start) return false
    if (recurring.endYear && recurring.endMonth) {
      const end = recurring.endYear * 12 + recurring.endMonth
      if (current > end) return false
    }
    if (recurring.type === 'yearly') return month === recurring.startMonth
    if (recurring.type === 'quarterly') return (current - start) % 3 === 0
    return true // monthly
  }

  // Tous les mois >= cutoff de cette famille
  const months = await prisma.budgetMonth.findMany({
    where: {
      familyId: family.id,
      OR: [
        { year: { gt: fromYear } },
        { year: fromYear, month: { gte: fromMonth } }
      ]
    },
    include: {
      lines: {
        where: { name: recurring.name, isIncome: recurring.isIncome }
      }
    }
  })

  let deleted = 0
  let created = 0

  for (const bm of months) {
    if ((bm.year * 12 + bm.month) < cutoff) continue
    const keep = shouldHavePayment(bm.year, bm.month)

    if (!keep) {
      // Supprimer les lignes hors planning
      for (const line of bm.lines) {
        await prisma.budgetLine.delete({ where: { id: line.id } })
        deleted++
      }
    } else if (bm.lines.length === 0) {
      // Creer la ligne manquante pour ce mois en planning
      await prisma.budgetLine.create({
        data: {
          name: recurring.name,
          amount: recurring.amount,
          isIncome: recurring.isIncome,
          categoryId: recurring.categoryId,
          paymentMethod: recurring.paymentMethod,
          dayOfMonth: recurring.dayOfMonth,
          budgetMonthId: bm.id
        }
      })
      created++
    }
  }

  return { success: true, deleted, created }
})
