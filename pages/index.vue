<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card bg-base-100 shadow-xl w-full max-w-md">
      <div class="card-body items-center text-center">
        <h1 class="card-title text-3xl font-bold mb-2">Pepettes</h1>
        <p class="text-base-content/60 mb-6">Budget familial</p>

        <!-- Portal link -->
        <a href="https://cyriongames.fr" class="btn btn-ghost btn-sm mb-4">
          &larr; Portail
        </a>

        <!-- Loading -->
        <div v-if="isLoading" class="flex flex-col items-center gap-4">
          <span class="loading loading-spinner loading-lg"></span>
          <p>Chargement...</p>
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

        <!-- Authenticated with access -->
        <div v-else class="flex flex-col items-center gap-4 w-full">
          <p class="text-sm text-base-content/60">
            Connecte en tant que <strong>{{ user?.name }}</strong>
          </p>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">Code famille (6 chiffres)</span>
            </label>
            <div class="join w-full">
              <input
                v-model="familyCode"
                type="text"
                maxlength="6"
                pattern="[0-9]{6}"
                placeholder="123456"
                class="input input-bordered join-item flex-1 text-center text-2xl tracking-widest"
                @keyup.enter="joinFamily"
              />
              <button
                class="btn btn-primary join-item"
                :disabled="familyCode.length !== 6 || joining"
                @click="joinFamily"
              >
                <span v-if="joining" class="loading loading-spinner loading-sm"></span>
                <span v-else>Rejoindre</span>
              </button>
            </div>
          </div>

          <p v-if="error" class="text-error text-sm">{{ error }}</p>

          <button class="btn btn-ghost btn-sm mt-4" @click="logout">Se deconnecter</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, user, isLoading, hasAccess, initKeycloak, login, logout } = useAuth()

const familyCode = ref('')
const joining = ref(false)
const error = ref('')
const router = useRouter()

onMounted(async () => {
  await initKeycloak()
})

const joinFamily = async () => {
  if (familyCode.value.length !== 6) return

  joining.value = true
  error.value = ''

  try {
    await $fetch('/api/family/join', {
      method: 'POST',
      body: { code: familyCode.value }
    })
    await router.push(`/family/${familyCode.value}`)
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Erreur lors de la connexion'
  } finally {
    joining.value = false
  }
}
</script>
