import prisma from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body

  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw createError({ statusCode: 400, statusMessage: 'Code famille invalide (6 caracteres requis)' })
  }

  let family = await prisma.family.findUnique({ where: { code } })

  if (!family) {
    family = await prisma.family.create({
      data: {
        code,
        name: `Famille ${code}`
      }
    })
  }

  return family
})
