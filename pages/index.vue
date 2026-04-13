<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 shadow-xl w-full max-w-md">
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">Pepettes</h1>
        <p class="text-base-content/60 mb-6">Budget familial</p>

        <a href="https://cyriongames.fr" class="btn btn-ghost btn-sm mb-4">
          &larr; Portail
        </a>

        <!-- Loading -->
        <div v-if="isLoading || autoJoining" class="flex flex-col items-center gap-4">
          <span class="loading loading-spinner loading-lg"></span>
          <p>{{ autoJoining ? 'Chargement de votre budget...' : 'Connexion...' }}</p>
        </div>

        <!-- Not authenticated -->
        <div v-else-if="!isAuthenticated" class="flex flex-col items-center gap-4">
          <p class="text-base-content/60">Connectez-vous pour acceder a votre budget.</p>
          <button class="btn btn-primary" @click="login">Se connecter</button>
        </div>

        <!-- No access -->
        <div v-else-if="!hasAccess" class="flex flex-col items-center gap-4">
          <div class="alert alert-warning">
            <span>Vous n'avez pas acces a cette application.</span>
          </div>
          <button class="btn btn-ghost" @click="logout">Se deconnecter</button>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-col items-center gap-4">
          <div class="alert alert-error">{{ error }}</div>
          <button class="btn btn-ghost" @click="logout">Se deconnecter</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, user, isLoading, hasAccess, initKeycloak, login, logout } = useAuth()

const autoJoining = ref(false)
const error = ref('')
const router = useRouter()

onMounted(async () => {
  await initKeycloak()
})

// Once authenticated, auto-join and redirect
watch([isAuthenticated, hasAccess, isLoading], async ([auth, access, loading]) => {
  if (loading || !auth || !access || autoJoining.value) return
  if (!user.value?.id) return

  autoJoining.value = true
  error.value = ''

  try {
    const family = await $fetch('/api/family/me', {
      method: 'POST',
      body: {
        keycloakUserId: user.value.id,
        name: `Budget de ${user.value.name}`
      }
    }) as any

    // Redirect using keycloakUserId as route param
    await router.push(`/family/${user.value.id}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Erreur lors du chargement'
    autoJoining.value = false
  }
})
</script>
