import prisma from './db'

export async function findFamily(code: string) {
  // Try keycloakUserId first, then legacy code
  let family = await prisma.family.findUnique({ where: { keycloakUserId: code } })
  if (!family) {
    family = await prisma.family.findUnique({ where: { code } })
  }
  return family
}
