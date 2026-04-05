<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-md px-4">
      <div class="navbar-start gap-2">
        <a href="https://cyriongames.fr" class="btn btn-ghost btn-sm">&larr; Portail</a>
        <NuxtLink to="/" class="btn btn-ghost btn-sm">Accueil</NuxtLink>
      </div>
      <div class="navbar-center">
        <h1 class="text-xl font-bold">{{ familyName }}</h1>
      </div>
      <div class="navbar-end">
        <span v-if="user" class="text-sm text-base-content/60 mr-2">{{ user.name }}</span>
        <button class="btn btn-ghost btn-sm" @click="logout">Deconnexion</button>
      </div>
    </div>
    <div v-if="isLoading || loadingData" class="flex items-center justify-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
    <div v-else-if="!hasAccess" class="flex items-center justify-center h-64">
      <div class="alert alert-warning max-w-md"><span>Acces non autorise.</span></div>
    </div>
    <div v-else class="p-4 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-center gap-4 mb-6">
        <button class="btn btn-circle btn-sm" @click="changeYear(-1)">&laquo;</button>
        <span class="text-2xl font-bold min-w-[80px] text-center">{{ selectedYear }}</span>
        <button class="btn btn-circle btn-sm" @click="changeYear(1)">&raquo;</button>
      </div>
      <div class="overflow-x-auto bg-base-100 rounded-xl shadow-lg">
        <table class="table table-sm table-pin-cols">
          <thead>
            <tr class="bg-base-200">
              <th class="min-w-[200px] sticky left-0 bg-base-200 z-10">Libelle</th>
              <th v-for="m in 12" :key="m" :ref="el => { if (m === currentMonth) currentMonthEl = el as HTMLElement }"
                class="text-center min-w-[100px]"
                :class="m === currentMonth ? 'bg-primary/10 border-b-2 border-primary' : ''">
                {{ monthNames[m - 1] }}{{ m === currentMonth ? ' ●' : '' }}
              </th>
              <th class="text-center min-w-[110px] font-bold">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr class="bg-success/10 cursor-pointer select-none" @click="incomeCollapsed = !incomeCollapsed">
              <td class="font-bold text-success text-lg sticky left-0 bg-success/10 z-10">
                <span>{{ incomeCollapsed ? '▶' : '▼' }}</span>
                REVENUS
                <button class="btn btn-ghost btn-xs ml-2" @click.stop="openAddLineModal(true)">+</button>
              </td>
              <template v-if="incomeCollapsed">
                <td v-for="m in 12" :key="m" class="text-center font-semibold text-success">{{ formatAmount(getMonthIncome(m)) }}</td>
                <td class="text-center font-bold text-success">{{ formatAmount(totalIncomeYear) }}</td>
              </template>
              <template v-else>
                <td colspan="13"></td>
              </template>
            </tr>
            <template v-if="!incomeCollapsed">
              <tr v-for="line in incomeLines" :key="line.id" class="hover">
                <td class="sticky left-0 bg-base-100 z-10">
                  <div class="flex items-center gap-1">
                    <span class="text-success">{{ line.categoryEmoji }}</span>
                    <span>{{ line.name }}</span>
                    <button class="btn btn-ghost btn-xs opacity-30 hover:opacity-100" @click="deleteLine(line)">x</button>
                  </div>
                </td>
                <td v-for="m in 12" :key="m" class="text-center p-0">
                  <input type="number" :value="getCellValue(line.id, m)"
                    class="input input-ghost input-sm w-full text-center text-success"
                    step="0.01" min="0"
                    @change="(e: Event) => onCellChange(line, m, e)"
                    @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
                </td>
                <td class="text-center font-semibold text-success">{{ formatAmount(getLineTotal(line.id)) }}</td>
              </tr>
              <tr class="border-t-2 border-success/30 bg-success/5">
                <td class="font-bold text-success sticky left-0 bg-success/5 z-10">Total revenus</td>
                <td v-for="m in 12" :key="m" class="text-center font-semibold text-success">{{ formatAmount(getMonthIncome(m)) }}</td>
                <td class="text-center font-bold text-success">{{ formatAmount(totalIncomeYear) }}</td>
              </tr>
            </template>
            <tr><td colspan="14" class="h-2 p-0"></td></tr>
            <tr class="bg-error/10">
              <td colspan="14" class="font-bold text-error text-lg sticky left-0 bg-error/10 z-10">
                DEPENSES
                <button class="btn btn-ghost btn-xs ml-2" @click="openAddLineModal(false)">+</button>
              </td>
            </tr>
            <tr v-for="line in expenseLines" :key="line.id" class="hover">
              <td class="sticky left-0 bg-base-100 z-10">
                <div class="flex items-center gap-1">
                  <span class="text-error">{{ line.categoryEmoji }}</span>
                  <span>{{ line.name }}</span>
                  <button class="btn btn-ghost btn-xs opacity-30 hover:opacity-100" @click="deleteLine(line)">x</button>
                </div>
              </td>
              <td v-for="m in 12" :key="m" class="text-center p-0">
                <input type="number" :value="getCellValue(line.id, m)"
                  class="input input-ghost input-sm w-full text-center text-error"
                  step="0.01" min="0"
                  @change="(e: Event) => onCellChange(line, m, e)"
                  @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
              </td>
              <td class="text-center font-semibold text-error">{{ formatAmount(getLineTotal(line.id)) }}</td>
            </tr>
            <tr class="border-t-2 border-error/30 bg-error/5">
              <td class="font-bold text-error sticky left-0 bg-error/5 z-10">Total depenses</td>
              <td v-for="m in 12" :key="m" class="text-center font-semibold text-error">{{ formatAmount(getMonthExpense(m)) }}</td>
              <td class="text-center font-bold text-error">{{ formatAmount(totalExpenseYear) }}</td>
            </tr>
            <tr><td colspan="14" class="h-2 p-0"></td></tr>
            <tr class="bg-base-200 border-t-2">
              <td class="font-bold text-lg sticky left-0 bg-base-200 z-10">SOLDE DU MOIS</td>
              <td v-for="m in 12" :key="m" class="text-center font-bold text-lg"
                :class="getMonthBalance(m) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getMonthBalance(m)) }}
              </td>
              <td class="text-center font-bold text-lg"
                :class="totalBalanceYear >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(totalBalanceYear) }}
              </td>
            </tr>
            <tr class="bg-base-200/50">
              <td class="font-semibold sticky left-0 bg-base-200/50 z-10">REPORT PRECEDENT</td>
              <td v-for="m in 12" :key="m" class="text-center"
                :class="getCarryOver(m) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getCarryOver(m)) }}
              </td>
              <td></td>
            </tr>
            <tr class="bg-base-300 border-t-2">
              <td class="font-bold text-xl sticky left-0 bg-base-300 z-10">SOLDE CUMULE</td>
              <td v-for="m in 12" :key="m" class="text-center font-bold text-xl"
                :class="getCumulativeBalance(m) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getCumulativeBalance(m)) }}
              </td>
              <td class="text-center font-bold text-xl"
                :class="getCumulativeBalance(12) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getCumulativeBalance(12)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <dialog ref="addLineModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          Ajouter {{ addingIncome ? 'un revenu' : 'une depense' }}
        </h3>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nom</span></label>
          <input v-model="newLineName" type="text" class="input input-bordered" placeholder="Ex: Salaire, Loyer..." />
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Montant</span></label>
          <input v-model.number="newLineAmount" type="number" class="input input-bordered" step="0.01" min="0" placeholder="0.00" />
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Recurrence</span></label>
          <select v-model="newLineRecurrence" class="select select-bordered">
            <option value="none">Ponctuel (mois en cours)</option>
            <option value="monthly">Mensuel</option>
            <option value="yearly">Annuel (ce mois uniquement)</option>
          </select>
        </div>
        <div v-if="newLineRecurrence === 'monthly'" class="form-control mb-3 flex flex-row gap-2 items-end">
          <div class="flex-1">
            <label class="label"><span class="label-text">Du mois</span></label>
            <select v-model.number="newLineFromMonth" class="select select-bordered w-full">
              <option v-for="m in 12" :key="m" :value="m">{{ monthNames[m - 1] }}</option>
            </select>
          </div>
          <div class="flex-1">
            <label class="label"><span class="label-text">Au mois</span></label>
            <select v-model.number="newLineToMonth" class="select select-bordered w-full">
              <option v-for="m in 12" :key="m" :value="m">{{ monthNames[m - 1] }}</option>
            </select>
          </div>
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Categorie</span></label>
          <div class="flex gap-2">
            <select v-model="newLineCategoryId" class="select select-bordered flex-1">
              <option :value="null">Aucune</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.emoji }} {{ cat.name }}
              </option>
            </select>
            <button class="btn btn-outline btn-sm" @click="showNewCategory = !showNewCategory">
              {{ showNewCategory ? 'Annuler' : '+ Cat.' }}
            </button>
          </div>
        </div>
        <div v-if="showNewCategory" class="form-control mb-3 pl-4 border-l-2 border-primary">
          <div class="flex gap-2">
            <input v-model="newCategoryName" type="text" class="input input-bordered input-sm flex-1" placeholder="Nom categorie" />
            <input v-model="newCategoryEmoji" type="text" class="input input-bordered input-sm w-16 text-center" maxlength="2" />
            <button class="btn btn-primary btn-sm" @click="createCategory" :disabled="!newCategoryName">OK</button>
          </div>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="closeAddLineModal">Annuler</button>
          <button class="btn" :class="addingIncome ? 'btn-success' : 'btn-error'" :disabled="!newLineName" @click="addLine">
            Ajouter
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const code = route.params.code as string

const { isAuthenticated, user, isLoading, hasAccess, initKeycloak, logout } = useAuth()

const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec']

const selectedYear = ref(new Date().getFullYear())
const loadingData = ref(true)
const familyName = ref('')
const categories = ref<any[]>([])
const currentMonthEl = ref<HTMLElement | null>(null)
const incomeCollapsed = ref(true)

interface LineDefinition {
  id: string
  name: string
  isIncome: boolean
  categoryId: number | null
  categoryEmoji: string
  amounts: Record<number, { lineId: number; amount: number }>
}

const lineDefinitions = ref<LineDefinition[]>([])
const monthMap = ref<Record<number, number>>({})

const incomeLines = computed(() => lineDefinitions.value.filter(l => l.isIncome))
const expenseLines = computed(() => lineDefinitions.value.filter(l => !l.isIncome))

const getCellValue = (lineDefId: string, month: number): number => {
  const line = lineDefinitions.value.find(l => l.id === lineDefId)
  return line?.amounts[month]?.amount || 0
}

const getLineTotal = (lineDefId: string): number => {
  const line = lineDefinitions.value.find(l => l.id === lineDefId)
  if (!line) return 0
  return Object.values(line.amounts).reduce((sum, a) => sum + a.amount, 0)
}

const getMonthIncome = (month: number): number => {
  return incomeLines.value.reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0)
}

const getMonthExpense = (month: number): number => {
  return expenseLines.value.reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0)
}

const getMonthBalance = (month: number): number => {
  return getMonthIncome(month) - getMonthExpense(month)
}

const getCarryOver = (month: number): number => {
  if (month <= 1) return 0
  let carry = 0
  for (let m = 1; m < month; m++) {
    carry += getMonthBalance(m)
  }
  return carry
}

const getCumulativeBalance = (month: number): number => {
  return getCarryOver(month) + getMonthBalance(month)
}

const totalIncomeYear = computed(() => {
  let total = 0
  for (let m = 1; m <= 12; m++) total += getMonthIncome(m)
  return total
})

const totalExpenseYear = computed(() => {
  let total = 0
  for (let m = 1; m <= 12; m++) total += getMonthExpense(m)
  return total
})

const totalBalanceYear = computed(() => totalIncomeYear.value - totalExpenseYear.value)

const formatAmount = (amount: number): string => {
  if (amount === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

const fetchData = async () => {
  loadingData.value = true
  try {
    const family = await $fetch('/api/family/join', {
      method: 'POST',
      body: { code }
    })
    familyName.value = (family as any).name

    categories.value = await $fetch('/api/family/' + code + '/categories')

    const months = await $fetch('/api/family/' + code + '/months', {
      params: { year: selectedYear.value }
    }) as any[]

    const mMap: Record<number, number> = {}
    months.forEach((bm: any) => { mMap[bm.month] = bm.id })
    monthMap.value = mMap

    const lineMap = new Map<string, LineDefinition>()
    months.forEach((bm: any) => {
      if (!bm.lines) return
      bm.lines.forEach((line: any) => {
        const key = line.name + '__' + String(line.isIncome)
        if (!lineMap.has(key)) {
          lineMap.set(key, {
            id: key,
            name: line.name,
            isIncome: line.isIncome,
            categoryId: line.categoryId,
            categoryEmoji: line.category?.emoji || '',
            amounts: {}
          })
        }
        const def = lineMap.get(key)!
        def.amounts[bm.month] = { lineId: line.id, amount: line.amount }
        if (line.categoryId) {
          def.categoryId = line.categoryId
          def.categoryEmoji = line.category?.emoji || ''
        }
      })
    })
    lineDefinitions.value = Array.from(lineMap.values())
  } catch (e) {
    console.error('Error loading data:', e)
  } finally {
    loadingData.value = false
  }
}

const changeYear = (delta: number) => {
  selectedYear.value += delta
  fetchData()
}

const onCellChange = async (lineDef: LineDefinition, month: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const newAmount = Math.abs(parseFloat(input.value) || 0)

  let budgetMonthId = monthMap.value[month]
  if (!budgetMonthId) {
    const bm = await $fetch('/api/family/' + code + '/month', {
      method: 'POST',
      body: { year: selectedYear.value, month }
    }) as any
    budgetMonthId = bm.id
    monthMap.value[month] = bm.id
  }

  const existing = lineDef.amounts[month]
  if (existing) {
    if (newAmount === 0) {
      await $fetch('/api/family/' + code + '/lines/' + existing.lineId, { method: 'DELETE' })
      delete lineDef.amounts[month]
    } else {
      await $fetch('/api/family/' + code + '/lines/' + existing.lineId, {
        method: 'PUT',
        body: { amount: newAmount }
      })
      existing.amount = newAmount
    }
  } else if (newAmount > 0) {
    const created = await $fetch('/api/family/' + code + '/lines/add', {
      method: 'POST',
      body: {
        budgetMonthId,
        name: lineDef.name,
        amount: newAmount,
        isIncome: lineDef.isIncome,
        categoryId: lineDef.categoryId
      }
    }) as any
    lineDef.amounts[month] = { lineId: created.id, amount: created.amount }
  }
  // Force reactivity update
  lineDefinitions.value = [...lineDefinitions.value]
}

const addLineModal = ref<HTMLDialogElement>()
const addingIncome = ref(false)
const newLineName = ref('')
const newLineAmount = ref<number>(0)
const newLineRecurrence = ref<'none' | 'monthly' | 'yearly'>('monthly')
const newLineFromMonth = ref(1)
const newLineToMonth = ref(12)
const newLineCategoryId = ref<number | null>(null)
const showNewCategory = ref(false)
const newCategoryName = ref('')
const newCategoryEmoji = ref('')

const currentMonth = new Date().getMonth() + 1

const openAddLineModal = (isIncome: boolean) => {
  addingIncome.value = isIncome
  newLineName.value = ''
  newLineAmount.value = 0
  newLineRecurrence.value = 'monthly'
  newLineFromMonth.value = 1
  newLineToMonth.value = 12
  newLineCategoryId.value = null
  showNewCategory.value = false
  addLineModal.value?.showModal()
}

const closeAddLineModal = () => {
  addLineModal.value?.close()
}

const createCategory = async () => {
  if (!newCategoryName.value) return
  try {
    const cat = await $fetch('/api/family/' + code + '/categories', {
      method: 'POST',
      body: {
        name: newCategoryName.value,
        emoji: newCategoryEmoji.value || undefined
      }
    }) as any
    categories.value.push(cat)
    newLineCategoryId.value = cat.id
    showNewCategory.value = false
    newCategoryName.value = ''
    newCategoryEmoji.value = ''
  } catch (e) {
    console.error('Error creating category:', e)
  }
}

const addLine = async () => {
  if (!newLineName.value) return
  const amount = Math.abs(newLineAmount.value || 0)

  if (newLineRecurrence.value === 'none') {
    // Ponctuel: create a single line for current month
    let budgetMonthId = monthMap.value[currentMonth]
    if (!budgetMonthId) {
      const bm = await $fetch('/api/family/' + code + '/month', {
        method: 'POST',
        body: { year: selectedYear.value, month: currentMonth }
      }) as any
      budgetMonthId = bm.id
      monthMap.value[currentMonth] = bm.id
    }
    await $fetch('/api/family/' + code + '/lines/add', {
      method: 'POST',
      body: {
        budgetMonthId,
        name: newLineName.value,
        amount: amount || 0,
        isIncome: addingIncome.value,
        categoryId: newLineCategoryId.value
      }
    })
  } else {
    // Recurring (monthly or yearly): create via backend
    const startMonth = newLineRecurrence.value === 'monthly' ? newLineFromMonth.value : currentMonth
    const endMonth = newLineRecurrence.value === 'monthly' ? newLineToMonth.value : currentMonth
    const endYear = newLineRecurrence.value === 'yearly' ? null : null // ongoing

    await $fetch('/api/family/' + code + '/recurring/add', {
      method: 'POST',
      body: {
        name: newLineName.value,
        amount: amount || 0,
        isIncome: addingIncome.value,
        categoryId: newLineCategoryId.value,
        startMonth,
        startYear: selectedYear.value,
        endMonth: null,  // ongoing until stopped
        endYear: null
      }
    })
  }

  closeAddLineModal()
  // Reload data to show materialized lines
  await fetchData()
}

const deleteLine = async (lineDef: LineDefinition) => {
  if (!confirm('Supprimer "' + lineDef.name + '" et toutes ses valeurs ?')) return
  const deletePromises = Object.values(lineDef.amounts).map(a =>
    $fetch('/api/family/' + code + '/lines/' + a.lineId, { method: 'DELETE' })
  )
  await Promise.all(deletePromises)
  lineDefinitions.value = lineDefinitions.value.filter(l => l.id !== lineDef.id)
}

onMounted(async () => {
  await initKeycloak()
  if (hasAccess.value) {
    await fetchData()
    await nextTick()
    if (currentMonthEl.value) {
      currentMonthEl.value.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }
})

watch(hasAccess, (val) => {
  if (val) fetchData()
})
</script>
