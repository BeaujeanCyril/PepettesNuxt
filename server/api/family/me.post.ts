import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { keycloakUserId, name } = body

  if (!keycloakUserId) {
    throw createError({ statusCode: 400, statusMessage: 'keycloakUserId requis' })
  }

  // Find or create family for this user
  let family = await prisma.family.findUnique({
    where: { keycloakUserId }
  })

  if (!family) {
    family = await prisma.family.create({
      data: {
        keycloakUserId,
        name: name || 'Mon budget'
      }
    })
  }

  return family
})
