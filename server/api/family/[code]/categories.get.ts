import { findFamily } from '~/server/utils/family'
import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille requis' })
  }

  const family = await findFamily(code!)

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })
  }

  const categories = await prisma.category.findMany({
    where: { familyId: family.id },
    orderBy: { name: 'asc' }
  })

  return categories
})
