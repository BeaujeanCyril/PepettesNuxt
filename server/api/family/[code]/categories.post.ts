import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  const body = await readBody(event)
  const { name, emoji } = body

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille requis' })
  }

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nom de categorie requis' })
  }

  const family = await prisma.family.findUnique({ where: { code } })

  if (!family) {
    throw createError({ statusCode: 404, statusMessage: 'Famille non trouvee' })
  }

  const category = await prisma.category.create({
    data: {
      name,
      emoji: emoji || undefined,
      familyId: family.id
    }
  })

  return category
})
