import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const id = parseInt(getRouterParam(event, 'id') || '')

  if (!code || isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Paramètres invalides' })

  const family = await prisma.family.findUnique({ where: { code } })
  if (!family) throw createError({ statusCode: 404, statusMessage: 'Famille non trouvée' })

  // Set end date to current month (stop recurrence going forward)
  const now = new Date()
  await prisma.recurringLine.update({
    where: { id },
    data: {
      endMonth: now.getMonth() + 1,
      endYear: now.getFullYear()
    }
  })

  return { success: true }
})
