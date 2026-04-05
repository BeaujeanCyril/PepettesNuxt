<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-md px-4">
      <div class="navbar-start gap-2">
        <NuxtLink :to="`/family/${code}`" class="btn btn-ghost btn-sm">&larr; Budget</NuxtLink>
      </div>
      <div class="navbar-center">
        <h1 class="text-xl font-bold">📊 Statistiques</h1>
      </div>
      <div class="navbar-end">
        <div class="flex items-center gap-2">
          <button class="btn btn-circle btn-xs" @click="selectedYear--; loadData()">&laquo;</button>
          <span class="font-bold">{{ selectedYear }}</span>
          <button class="btn btn-circle btn-xs" @click="selectedYear++; loadData()">&raquo;</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else class="p-4 max-w-5xl mx-auto space-y-6">

      <!-- KPIs -->
      <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
        <div class="stat">
          <div class="stat-title">Revenus annuels</div>
          <div class="stat-value text-success text-xl">{{ fmt(totalIncome) }}</div>
          <div class="stat-desc">{{ fmt(avgIncome) }} / mois</div>
        </div>
        <div class="stat">
          <div class="stat-title">Depenses annuelles</div>
          <div class="stat-value text-error text-xl">{{ fmt(totalExpense) }}</div>
          <div class="stat-desc">{{ fmt(avgExpense) }} / mois</div>
        </div>
        <div class="stat">
          <div class="stat-title">Epargne</div>
          <div class="stat-value text-xl" :class="totalIncome - totalExpense >= 0 ? 'text-success' : 'text-error'">
            {{ fmt(totalIncome - totalExpense) }}
          </div>
          <div class="stat-desc">{{ totalIncome > 0 ? Math.round((totalIncome - totalExpense) / totalIncome * 100) : 0 }}% des revenus</div>
        </div>
      </div>

      <!-- Evolution mensuelle (bar chart) -->
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-sm">Evolution mensuelle</h2>
          <div class="overflow-x-auto">
            <div class="flex items-end gap-1 h-48 min-w-[600px]">
              <div v-for="m in 12" :key="m" class="flex-1 flex flex-col items-center gap-1">
                <!-- Income bar -->
                <div class="w-full flex justify-center gap-0.5" style="height:140px;align-items:flex-end">
                  <div class="bg-success/60 rounded-t w-2/5"
                    :style="`height: ${maxMonthly > 0 ? (monthlyIncome[m] / maxMonthly * 100) : 0}%`"
                    :title="`Revenus: ${fmt(monthlyIncome[m])}`"></div>
                  <div class="bg-error/60 rounded-t w-2/5"
                    :style="`height: ${maxMonthly > 0 ? (monthlyExpense[m] / maxMonthly * 100) : 0}%`"
                    :title="`Depenses: ${fmt(monthlyExpense[m])}`"></div>
                </div>
                <span class="text-xs text-base-content/50">{{ monthLabels[m - 1] }}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-4 justify-center mt-2 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 bg-success/60 rounded"></span> Revenus</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 bg-error/60 rounded"></span> Depenses</span>
          </div>
        </div>
      </div>

      <!-- Repartition par categorie -->
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-sm">Repartition des depenses par categorie</h2>
          <div class="space-y-2">
            <div v-for="cat in categoryBreakdown" :key="cat.name" class="flex items-center gap-3">
              <span class="text-lg w-8 text-center">{{ cat.emoji }}</span>
              <span class="w-32 text-sm truncate">{{ cat.name }}</span>
              <div class="flex-1 bg-base-200 rounded-full h-4 overflow-hidden">
                <div class="h-full rounded-full bg-error/70 transition-all"
                  :style="`width: ${totalExpense > 0 ? (cat.total / totalExpense * 100) : 0}%`"></div>
              </div>
              <span class="text-sm font-semibold w-24 text-right">{{ fmt(cat.total) }}</span>
              <span class="text-xs text-base-content/50 w-12 text-right">{{ totalExpense > 0 ? Math.round(cat.total / totalExpense * 100) : 0 }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Repartition par moyen de paiement -->
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-sm">Repartition par moyen de paiement</h2>
          <div class="space-y-2">
            <div v-for="pm in paymentBreakdown" :key="pm.label" class="flex items-center gap-3">
              <span class="w-40 text-sm">{{ pm.label }}</span>
              <div class="flex-1 bg-base-200 rounded-full h-4 overflow-hidden">
                <div class="h-full rounded-full bg-warning/70 transition-all"
                  :style="`width: ${totalAllExpense > 0 ? (pm.total / totalAllExpense * 100) : 0}%`"></div>
              </div>
              <span class="text-sm font-semibold w-24 text-right">{{ fmt(pm.total) }}</span>
              <span class="text-xs text-base-content/50 w-12 text-right">{{ totalAllExpense > 0 ? Math.round(pm.total / totalAllExpense * 100) : 0 }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top 10 depenses -->
      <div class="card bg-base-100 shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-sm">Top 10 depenses (annuel)</h2>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Depense</th>
                  <th>Categorie</th>
                  <th>Paiement</th>
                  <th class="text-right">Total annuel</th>
                  <th class="text-right">Mensuel moy.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in topExpenses" :key="item.name">
                  <td class="font-bold text-base-content/40">{{ i + 1 }}</td>
                  <td>{{ item.name }}</td>
                  <td class="text-sm">{{ item.emoji }} {{ item.category }}</td>
                  <td class="text-sm">{{ item.paymentLabel }}</td>
                  <td class="text-right font-semibold text-error">{{ fmt(item.total) }}</td>
                  <td class="text-right text-sm text-base-content/60">{{ fmt(item.avg) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const code = route.params.code as string

const { isAuthenticated, hasAccess, initKeycloak } = useAuth()

const selectedYear = ref(new Date().getFullYear())
const loading = ref(true)
const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

const paymentMethodLabels: Record<string, string> = {
  '': 'Compte courant',
  'visa': '💳 Visa',
  'domiciliation': '🏦 Domiciliation',
  'ordre_permanent': '🔄 Ordre permanent',
  'virement': '➡️ Virement'
}

// Raw data
const allLines = ref<any[]>([])

// Computed stats
const monthlyIncome = ref<Record<number, number>>({})
const monthlyExpense = ref<Record<number, number>>({})

const totalIncome = computed(() => Object.values(monthlyIncome.value).reduce((s, v) => s + v, 0))
const totalExpense = computed(() => Object.values(monthlyExpense.value).reduce((s, v) => s + v, 0))
const avgIncome = computed(() => r2(totalIncome.value / 12))
const avgExpense = computed(() => r2(totalExpense.value / 12))
const maxMonthly = computed(() => {
  let max = 0
  for (let m = 1; m <= 12; m++) {
    max = Math.max(max, monthlyIncome.value[m] || 0, monthlyExpense.value[m] || 0)
  }
  return max
})

// Total all expenses including visa (for payment breakdown)
const totalAllExpense = computed(() => {
  return r2(allLines.value.filter(l => !l.isIncome).reduce((s, l) => s + l.amount, 0))
})

interface CatBreakdown { name: string; emoji: string; total: number }
interface PmBreakdown { label: string; total: number }
interface TopExpense { name: string; category: string; emoji: string; paymentLabel: string; total: number; avg: number }

const categoryBreakdown = computed<CatBreakdown[]>(() => {
  const map = new Map<string, CatBreakdown>()
  allLines.value.filter(l => !l.isIncome).forEach(l => {
    const cat = l.categoryName || 'Sans categorie'
    const emoji = l.categoryEmoji || '📁'
    if (!map.has(cat)) map.set(cat, { name: cat, emoji, total: 0 })
    map.get(cat)!.total += l.amount
  })
  return Array.from(map.values())
    .map(c => ({ ...c, total: r2(c.total) }))
    .sort((a, b) => b.total - a.total)
})

const paymentBreakdown = computed<PmBreakdown[]>(() => {
  const map = new Map<string, number>()
  allLines.value.filter(l => !l.isIncome).forEach(l => {
    const pm = l.paymentMethod || ''
    map.set(pm, (map.get(pm) || 0) + l.amount)
  })
  return Array.from(map.entries())
    .map(([pm, total]) => ({ label: paymentMethodLabels[pm] || pm, total: r2(total) }))
    .sort((a, b) => b.total - a.total)
})

const topExpenses = computed<TopExpense[]>(() => {
  // Group by line name
  const map = new Map<string, TopExpense>()
  allLines.value.filter(l => !l.isIncome).forEach(l => {
    const key = l.name
    if (!map.has(key)) {
      map.set(key, {
        name: l.name,
        category: l.categoryName || 'Sans categorie',
        emoji: l.categoryEmoji || '📁',
        paymentLabel: paymentMethodLabels[l.paymentMethod || ''] || '',
        total: 0,
        avg: 0
      })
    }
    map.get(key)!.total += l.amount
  })
  const list = Array.from(map.values())
    .map(e => ({ ...e, total: r2(e.total), avg: r2(e.total / 12) }))
    .sort((a, b) => b.total - a.total)
  return list.slice(0, 10)
})

const r2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => {
  if (n === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(r2(n))
}

const loadData = async () => {
  loading.value = true
  try {
    const months = await $fetch(`/api/family/${code}/months`, {
      params: { year: selectedYear.value }
    }) as any[]

    const lines: any[] = []
    const incomeByMonth: Record<number, number> = {}
    const expenseByMonth: Record<number, number> = {}

    for (let m = 1; m <= 12; m++) {
      incomeByMonth[m] = 0
      expenseByMonth[m] = 0
    }

    months.forEach((bm: any) => {
      if (!bm.lines) return
      bm.lines.forEach((line: any) => {
        lines.push({
          name: line.name,
          amount: line.amount,
          isIncome: line.isIncome,
          paymentMethod: line.paymentMethod,
          categoryName: line.category?.name || null,
          categoryEmoji: line.category?.emoji || null,
          month: bm.month
        })
        if (line.isIncome) {
          incomeByMonth[bm.month] += line.amount
        } else if (line.paymentMethod !== 'visa') {
          expenseByMonth[bm.month] += line.amount
        }
      })
    })

    allLines.value = lines
    monthlyIncome.value = Object.fromEntries(Object.entries(incomeByMonth).map(([k, v]) => [k, r2(v)]))
    monthlyExpense.value = Object.fromEntries(Object.entries(expenseByMonth).map(([k, v]) => [k, r2(v)]))
  } catch (e) {
    console.error('Error loading stats:', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await initKeycloak()
  if (hasAccess.value) await loadData()
})

watch(() => hasAccess.value, (val) => {
  if (val) loadData()
})
</script>
