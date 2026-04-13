<template>
  <div class="min-h-screen bg-base-200">
    <div class="navbar bg-base-100 shadow-md px-4">
      <div class="navbar-start gap-2">
        <a href="https://cyriongames.fr" class="btn btn-ghost btn-sm">&larr; Portail</a>
        <NuxtLink to="/" class="btn btn-ghost btn-sm">Accueil</NuxtLink>
        <NuxtLink :to="`/family/${code}/stats`" class="btn btn-ghost btn-sm">📊 Stats</NuxtLink>
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
      <div class="flex flex-col items-center gap-3 mb-6">
        <div class="flex items-center gap-4">
          <button class="btn btn-circle btn-sm" @click="changeYear(-1)">&laquo;</button>
          <span class="text-2xl font-bold min-w-[80px] text-center">{{ selectedYear }}</span>
          <button class="btn btn-circle btn-sm" @click="changeYear(1)">&raquo;</button>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-circle btn-sm" @click="shiftMonths(-1)" :disabled="startMonth <= 1">&larr;</button>
          <div class="join">
            <button class="btn btn-sm join-item" :class="viewSize === 6 ? 'btn-primary' : 'btn-ghost'" @click="setView(6)">6 mois</button>
            <button class="btn btn-sm join-item" :class="viewSize === 'rest' ? 'btn-primary' : 'btn-ghost'" @click="setView('rest')">Fin d'annee</button>
            <button class="btn btn-sm join-item" :class="viewSize === 12 ? 'btn-primary' : 'btn-ghost'" @click="setView(12)">Annee</button>
          </div>
          <button class="btn btn-circle btn-sm" @click="shiftMonths(1)" :disabled="startMonth + viewCount > 12">&rarr;</button>
        </div>
      </div>
      <div ref="tableContainer" class="overflow-x-auto bg-base-100 rounded-xl shadow-lg">
        <table class="table table-sm table-pin-cols">
          <thead>
            <tr class="bg-base-200">
              <th class="min-w-[200px] sticky left-0 bg-base-200 z-10">Libelle</th>
              <th v-for="m in visibleMonths" :key="m"
                class="text-center min-w-[100px]"
                :class="m === currentMonth ? 'bg-primary/10' : ''">
                {{ monthNames[m - 1] }}
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
                <td v-for="m in visibleMonths" :key="m" class="text-center font-semibold text-success">{{ formatAmount(getMonthIncome(m)) }}</td>
                <td class="text-center font-bold text-success">{{ formatAmount(totalIncomeVisible) }}</td>
              </template>
              <template v-else>
                <td :colspan="visibleMonths.length + 1"></td>
              </template>
            </tr>
            <template v-if="!incomeCollapsed">
              <tr v-for="line in incomeLines" :key="line.id" class="hover">
                <td class="sticky left-0 bg-base-100 z-10">
                  <div class="flex items-center gap-1">
                    <span class="text-success">{{ line.categoryEmoji }}</span>
                    <span class="cursor-pointer hover:underline" @click="openEditLineModal(line)">{{ line.name }}</span>
                    <button class="btn btn-ghost btn-xs opacity-30 hover:opacity-100" @click="deleteLine(line)">x</button>
                  </div>
                </td>
                <td v-for="m in visibleMonths" :key="m" class="text-center p-0">
                  <input type="number" :value="getCellValue(line.id, m) || ''"
                    class="input input-ghost input-sm w-full text-center text-success"
                    step="0.01" min="0"
                    @change="(e: Event) => onCellChange(line, m, e)"
                    @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
                </td>
                <td class="text-center font-semibold text-success">{{ formatAmount(getLineTotalVisible(line.id)) }}</td>
              </tr>
              <tr class="border-t-2 border-success/30 bg-success/5">
                <td class="font-bold text-success sticky left-0 bg-success/5 z-10">Total revenus</td>
                <td v-for="m in visibleMonths" :key="m" class="text-center font-semibold text-success">{{ formatAmount(getMonthIncome(m)) }}</td>
                <td class="text-center font-bold text-success">{{ formatAmount(totalIncomeVisible) }}</td>
              </tr>
            </template>
            <tr><td :colspan="visibleMonths.length + 2" class="h-2 p-0"></td></tr>
            <tr class="bg-error/10">
              <td :colspan="visibleMonths.length + 2" class="font-bold text-error text-lg sticky left-0 bg-error/10 z-10">
                <div class="flex items-center gap-2 flex-wrap">
                  <span>DEPENSES</span>
                  <button class="btn btn-ghost btn-xs" @click="openAddLineModal(false)">+</button>
                  <button class="btn btn-ghost btn-xs" @click="toggleAllCategories" :title="allCategoriesCollapsed ? 'Tout deplier' : 'Tout replier'">
                    {{ allCategoriesCollapsed ? '▶ tout' : '▼ tout' }}
                  </button>
                  <button class="btn btn-ghost btn-xs" @click="sortByDay = !sortByDay" :class="sortByDay ? 'btn-active' : ''">
                    📅 {{ sortByDay ? 'Par jour' : 'Par cat.' }}
                  </button>
                  <input type="text" v-model="searchQuery"
                    class="input input-xs input-bordered bg-base-100 text-base-content w-40 font-normal text-sm"
                    placeholder="🔍 Rechercher..." />
                </div>
              </td>
            </tr>
            <!-- VIEW: By category -->
            <template v-if="!sortByDay">
              <template v-for="group in expenseGroups" :key="group.category">
                <tr class="bg-error/5 cursor-pointer select-none" @click="toggleCategory(group.category)">
                  <td class="sticky left-0 bg-error/5 z-10 font-semibold text-error">
                    <span class="text-xs mr-1">{{ collapsedCategories.has(group.category) ? '▶' : '▼' }}</span>
                    {{ group.emoji }} {{ group.category }}
                    <span class="text-xs opacity-50 ml-1">({{ group.lines.length }})</span>
                  </td>
                  <td v-for="m in visibleMonths" :key="m" class="text-center font-semibold text-error/70">
                    {{ formatAmount(getCategoryMonthTotal(group, m)) }}
                  </td>
                  <td class="text-center font-semibold text-error">{{ formatAmount(getCategoryTotalVisible(group)) }}</td>
                </tr>
                <template v-if="!collapsedCategories.has(group.category) || searchQuery">
                  <tr v-for="line in group.lines" :key="line.id" class="hover">
                    <td class="sticky left-0 bg-base-100 z-10 pl-8">
                      <div class="flex items-center gap-1">
                        <span class="text-error/40">└</span>
                        <span class="cursor-pointer hover:underline" @click="openEditLineModal(line)">{{ line.name }}</span>
                        <span v-if="line.dayOfMonth" class="text-xs opacity-40">{{ line.dayOfMonth }}/m</span>
                        <span v-if="line.paymentMethod === 'visa'" class="text-xs opacity-60" title="Visa">💳</span>
                        <button class="btn btn-ghost btn-xs opacity-30 hover:opacity-100" @click="deleteLine(line)">x</button>
                      </div>
                    </td>
                    <td v-for="m in visibleMonths" :key="m" class="text-center p-0">
                      <div class="flex items-center gap-0">
                        <input v-if="line.amounts[m]?.lineId" type="checkbox"
                          class="checkbox checkbox-xs checkbox-success ml-1"
                          :checked="line.amounts[m]?.isPaid"
                          @change="togglePaid(line, m)"
                          title="Paye" />
                        <input type="number" :value="getCellValue(line.id, m) || ''"
                          class="input input-ghost input-sm w-full text-center"
                          :class="line.amounts[m]?.isPaid ? 'text-error/40 line-through' : 'text-error'"
                          step="0.01" min="0"
                          @change="(e: Event) => onCellChange(line, m, e)"
                          @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
                      </div>
                    </td>
                    <td class="text-center font-semibold text-error">{{ formatAmount(getLineTotalVisible(line.id)) }}</td>
                  </tr>
                </template>
              </template>
            </template>
            <!-- VIEW: Flat sorted by day -->
            <template v-else>
              <tr v-for="line in expenseLinesByDay" :key="line.id" class="hover">
                <td class="sticky left-0 bg-base-100 z-10">
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-mono text-base-content/40 w-6">{{ line.dayOfMonth ? String(line.dayOfMonth).padStart(2, '0') : '--' }}</span>
                    <span class="text-xs">{{ line.categoryEmoji }}</span>
                    <span class="cursor-pointer hover:underline" @click="openEditLineModal(line)">{{ line.name }}</span>
                    <span v-if="line.paymentMethod === 'visa'" class="text-xs opacity-60">💳</span>
                    <button class="btn btn-ghost btn-xs opacity-30 hover:opacity-100" @click="deleteLine(line)">x</button>
                  </div>
                </td>
                <td v-for="m in visibleMonths" :key="m" class="text-center p-0">
                  <div class="flex items-center gap-0">
                    <input v-if="line.amounts[m]?.lineId" type="checkbox"
                      class="checkbox checkbox-xs checkbox-success ml-1"
                      :checked="line.amounts[m]?.isPaid"
                      @change="togglePaid(line, m)"
                      title="Paye" />
                    <input type="number" :value="getCellValue(line.id, m) || ''"
                      class="input input-ghost input-sm w-full text-center"
                      :class="line.amounts[m]?.isPaid ? 'text-error/40 line-through' : 'text-error'"
                      step="0.01" min="0"
                      @change="(e: Event) => onCellChange(line, m, e)"
                      @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
                  </div>
                </td>
                <td class="text-center font-semibold text-error">{{ formatAmount(getLineTotalVisible(line.id)) }}</td>
              </tr>
            </template>
            <tr class="border-t-2 border-error/30 bg-error/5">
              <td class="font-bold text-error sticky left-0 bg-error/5 z-10">Total depenses</td>
              <td v-for="m in visibleMonths" :key="m" class="text-center font-semibold text-error">{{ formatAmount(getMonthExpense(m)) }}</td>
              <td class="text-center font-bold text-error">{{ formatAmount(totalExpenseVisible) }}</td>
            </tr>
            <tr class="bg-warning/5">
              <td class="sticky left-0 bg-warning/5 z-10 text-warning text-sm">
                💳 dont Visa (indicatif)
              </td>
              <td v-for="m in visibleMonths" :key="m" class="text-center text-sm text-warning">{{ formatAmount(getMonthVisaTotal(m)) }}</td>
              <td class="text-center text-sm font-semibold text-warning">{{ formatAmount(totalVisaVisible) }}</td>
            </tr>
            <tr><td :colspan="visibleMonths.length + 2" class="h-2 p-0"></td></tr>
            <tr class="bg-base-300 border-t-2">
              <td class="font-bold text-xl sticky left-0 bg-base-300 z-10">
                SOLDE COMPTE
                <span class="text-xs font-normal opacity-50 block">Editable — montant actuel</span>
              </td>
              <td v-for="m in visibleMonths" :key="m" class="text-center p-0">
                <input type="number"
                  :value="getSoldeCompte(m) || ''"
                  class="input input-ghost input-sm w-full text-center font-bold text-xl"
                  :class="getSoldeCompte(m) >= 0 ? 'text-success' : 'text-error'"
                  step="0.01"
                  @change="(e: Event) => onSoldeCompteChange(m, e)"
                  @focus="(e: FocusEvent) => (e.target as HTMLInputElement).select()" />
              </td>
              <td class="text-center font-bold text-xl"
                :class="getSoldeCompte(visibleMonths[visibleMonths.length - 1]) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getSoldeCompte(visibleMonths[visibleMonths.length - 1])) }}
              </td>
            </tr>
            <tr class="bg-base-200">
              <td class="font-bold text-lg sticky left-0 bg-base-200 z-10">
                APRES DEPENSES
                <span class="text-xs font-normal opacity-50 block">Solde compte - reste a payer</span>
              </td>
              <td v-for="m in visibleMonths" :key="m" class="text-center font-bold text-lg"
                :class="getAfterExpenses(m) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getAfterExpenses(m)) }}
              </td>
              <td class="text-center font-bold text-lg"
                :class="getAfterExpenses(visibleMonths[visibleMonths.length - 1]) >= 0 ? 'text-success' : 'text-error'">
                {{ formatAmount(getAfterExpenses(visibleMonths[visibleMonths.length - 1])) }}
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
        <div v-if="!addingIncome" class="form-control mb-3">
          <label class="label"><span class="label-text">Moyen de paiement</span></label>
          <select v-model="newLinePaymentMethod" class="select select-bordered">
            <option v-for="pm in paymentMethods" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
          </select>
          <p v-if="newLinePaymentMethod === 'visa'" class="text-xs text-warning mt-1">💳 Les depenses Visa sont detaillees dans la categorie mais ne comptent pas dans le total. Seul le montant Visa saisi manuellement compte.</p>
        </div>
        <div v-if="!addingIncome" class="form-control mb-3">
          <label class="label"><span class="label-text">Jour de paiement habituel</span></label>
          <select v-model.number="newLineDayOfMonth" class="select select-bordered">
            <option :value="0">Non defini</option>
            <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Recurrence</span></label>
          <select v-model="newLineRecurrence" class="select select-bordered">
            <option value="none">Ponctuel</option>
            <option value="monthly">Mensuel</option>
            <option value="quarterly">Trimestriel</option>
            <option value="yearly">Annuel</option>
          </select>
        </div>
        <div v-if="newLineRecurrence === 'none' || newLineRecurrence === 'yearly'" class="form-control mb-3">
          <label class="label"><span class="label-text">Mois concerne</span></label>
          <select v-model.number="newLineFromMonth" class="select select-bordered">
            <option v-for="m in visibleMonths" :key="m" :value="m">{{ monthNames[m - 1] }}</option>
          </select>
        </div>
        <div v-if="newLineRecurrence === 'quarterly'" class="form-control mb-3">
          <label class="label"><span class="label-text">Premier mois</span></label>
          <select v-model.number="newLineFromMonth" class="select select-bordered">
            <option v-for="m in visibleMonths" :key="m" :value="m">{{ monthNames[m - 1] }}</option>
          </select>
          <p class="text-xs text-base-content/50 mt-1">Puis tous les 3 mois ({{ monthNames[newLineFromMonth - 1] }}, {{ monthNames[((newLineFromMonth - 1 + 3) % 12)] }}, {{ monthNames[((newLineFromMonth - 1 + 6) % 12)] }}, {{ monthNames[((newLineFromMonth - 1 + 9) % 12)] }})</p>
        </div>
        <div v-if="newLineRecurrence === 'monthly'" class="form-control mb-3">
          <label class="label"><span class="label-text">A partir de</span></label>
          <select v-model.number="newLineFromMonth" class="select select-bordered">
            <option v-for="m in visibleMonths" :key="m" :value="m">{{ monthNames[m - 1] }}</option>
          </select>
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

    <!-- Edit line modal -->
    <dialog ref="editLineModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          Modifier {{ editLineIsIncome ? 'le revenu' : 'la depense' }}
        </h3>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nom</span></label>
          <input v-model="editLineName" type="text" class="input input-bordered" />
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Categorie</span></label>
          <select v-model="editLineCategoryId" class="select select-bordered">
            <option :value="null">Aucune</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.emoji }} {{ cat.name }}
            </option>
          </select>
        </div>
        <div v-if="!editLineIsIncome" class="form-control mb-3">
          <label class="label"><span class="label-text">Moyen de paiement</span></label>
          <select v-model="editLinePaymentMethod" class="select select-bordered">
            <option v-for="pm in paymentMethods" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
          </select>
        </div>
        <div v-if="!editLineIsIncome" class="form-control mb-3">
          <label class="label"><span class="label-text">Jour de paiement habituel</span></label>
          <select v-model.number="editLineDayOfMonth" class="select select-bordered">
            <option :value="0">Non defini</option>
            <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="form-control mb-3">
          <label class="label"><span class="label-text">Nouveau montant</span></label>
          <input v-model.number="editLineAmount" type="number" class="input input-bordered" step="0.01" min="0" placeholder="Laisser vide pour ne pas modifier" />
          <p class="text-xs text-base-content/50 mt-1">Applique a tous les mois existants de cette ligne</p>
        </div>
        <div class="divider text-xs">Recurrence</div>
        <div v-if="editLineRecurringId" class="form-control mb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="badge badge-outline badge-sm">{{ editLineRecurringType }}</span>
            <span class="text-sm text-base-content/60">depuis {{ monthNames[(editLineRecurringStartMonth || 1) - 1] }} {{ editLineRecurringStartYear }}</span>
          </div>
          <select v-model="editLineNewRecurrence" class="select select-bordered select-sm">
            <option value="">Ne pas modifier</option>
            <option value="monthly">Mensuel</option>
            <option value="quarterly">Trimestriel</option>
            <option value="yearly">Annuel</option>
            <option value="stop">Arreter la recurrence</option>
          </select>
        </div>
        <div v-else class="text-sm text-base-content/50 mb-3">
          Aucune recurrence associee (ligne ponctuelle)
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="editLineModal?.close()">Annuler</button>
          <button class="btn btn-primary" @click="saveEditLine">Enregistrer</button>
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
const currentMonth = new Date().getMonth() + 1
const currentMonthEl = ref<HTMLElement | null>(null)
const tableContainer = ref<HTMLElement | null>(null)
const incomeCollapsed = ref(true)
const startMonth = ref(currentMonth)
const viewSize = ref<6 | 12 | 'rest'>(6)

const viewCount = computed(() => {
  if (viewSize.value === 12) return 12
  if (viewSize.value === 'rest') return 13 - startMonth.value
  return Math.min(viewSize.value as number, 13 - startMonth.value)
})

const visibleMonths = computed(() => {
  const months = []
  for (let i = 0; i < viewCount.value; i++) {
    const m = startMonth.value + i
    if (m >= 1 && m <= 12) months.push(m)
  }
  return months
})

const setView = (size: 6 | 12 | 'rest') => {
  viewSize.value = size
  if (size === 12) startMonth.value = 1
  else if (size === 'rest') startMonth.value = currentMonth
}

const shiftMonths = (delta: number) => {
  const next = startMonth.value + delta
  if (next >= 1 && next <= 12) startMonth.value = next
}

interface LineDefinition {
  id: string
  name: string
  isIncome: boolean
  categoryId: number | null
  categoryEmoji: string
  paymentMethod: string | null
  dayOfMonth: number | null
  amounts: Record<number, { lineId: number; amount: number; isPaid: boolean }>
}

const paymentMethods = [
  { value: '', label: 'Compte courant' },
  { value: 'visa', label: '💳 Visa' },
  { value: 'domiciliation', label: '🏦 Domiciliation' },
  { value: 'ordre_permanent', label: '🔄 Ordre permanent' },
  { value: 'virement', label: '➡️ Virement' }
]

const lineDefinitions = ref<LineDefinition[]>([])
const monthMap = ref<Record<number, number>>({})
const manualBalances = ref<Record<number, number | null>>({})
const manualReports = ref<Record<number, number | null>>({})
const manualSoldes = ref<Record<number, number | null>>({})

const incomeLines = computed(() => lineDefinitions.value.filter(l => l.isIncome))
const expenseLines = computed(() => lineDefinitions.value.filter(l => !l.isIncome))

interface ExpenseGroup {
  category: string
  emoji: string
  lines: LineDefinition[]
}

const collapsedCategories = ref(new Set<string>())
const searchQuery = ref('')
const sortByDay = ref(false)

const expenseLinesByDay = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let lines = expenseLines.value.filter(l => l.paymentMethod !== 'visa')
  if (q) {
    lines = lines.filter(l => {
      const nameMatch = l.name.toLowerCase().includes(q)
      const amountMatch = Object.values(l.amounts).some(a => String(a.amount).includes(q))
      return nameMatch || amountMatch
    })
  }
  return [...lines].sort((a, b) => (a.dayOfMonth || 99) - (b.dayOfMonth || 99))
})

const expenseGroups = computed<ExpenseGroup[]>(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const groups = new Map<string, ExpenseGroup>()
  for (const line of expenseLines.value) {
    // Filter by search query (name or amount)
    if (q) {
      const nameMatch = line.name.toLowerCase().includes(q)
      const amountMatch = Object.values(line.amounts).some(a => String(a.amount).includes(q))
      if (!nameMatch && !amountMatch) continue
    }
    const catName = line.categoryId
      ? (categories.value.find((c: any) => c.id === line.categoryId)?.name || 'Autres')
      : 'Sans catégorie'
    const catEmoji = line.categoryEmoji || '📁'
    if (!groups.has(catName)) {
      groups.set(catName, { category: catName, emoji: catEmoji, lines: [] })
    }
    groups.get(catName)!.lines.push(line)
  }
  const result = Array.from(groups.values()).sort((a, b) => a.category.localeCompare(b.category))
  if (sortByDay.value) {
    for (const g of result) {
      g.lines.sort((a, b) => (a.dayOfMonth || 99) - (b.dayOfMonth || 99))
    }
  }
  return result
})

const toggleCategory = (category: string) => {
  const next = new Set(collapsedCategories.value)
  if (next.has(category)) next.delete(category)
  else next.add(category)
  collapsedCategories.value = next
}

const allCategoriesCollapsed = computed(() => {
  return expenseGroups.value.length > 0 && expenseGroups.value.every(g => collapsedCategories.value.has(g.category))
})

const toggleAllCategories = () => {
  if (allCategoriesCollapsed.value) {
    collapsedCategories.value = new Set()
  } else {
    collapsedCategories.value = new Set(expenseGroups.value.map(g => g.category))
  }
}


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
  return r2(incomeLines.value.reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0))
}

const getMonthExpense = (month: number): number => {
  return r2(expenseLines.value
    .filter(l => l.paymentMethod !== 'visa')
    .reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0))
}

// Depenses restant a payer (exclut les payees)
const getMonthExpenseUnpaid = (month: number): number => {
  return r2(expenseLines.value
    .filter(l => l.paymentMethod !== 'visa')
    .filter(l => !l.amounts[month]?.isPaid)
    .reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0))
}

const getMonthBalance = (month: number): number => {
  return r2(getMonthIncome(month) - getMonthExpenseUnpaid(month))
}

// Solde compte - depenses restant a payer
const getAfterExpenses = (month: number): number => {
  return r2(getSoldeCompte(month) - getMonthExpenseUnpaid(month))
}

const getMonthVisaTotal = (month: number): number => {
  return r2(expenseLines.value
    .filter(l => l.paymentMethod === 'visa')
    .reduce((sum, l) => sum + (l.amounts[month]?.amount || 0), 0))
}

const totalVisaVisible = computed(() => {
  return r2(visibleMonths.value.reduce((sum, m) => sum + getMonthVisaTotal(m), 0))
})

const togglePaid = async (lineDef: LineDefinition, month: number) => {
  const entry = lineDef.amounts[month]
  if (!entry) return
  const newPaid = !entry.isPaid
  await $fetch('/api/family/' + code + '/lines/' + entry.lineId, {
    method: 'PUT',
    body: { isPaid: newPaid }
  })
  entry.isPaid = newPaid
  lineDefinitions.value = [...lineDefinitions.value]
}

const onSoldeCompteChange = async (month: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const val = input.value.trim()
  const newVal = val === '' ? null : r2(parseFloat(val))
  manualSoldes.value = { ...manualSoldes.value, [month]: newVal }
  await $fetch('/api/family/' + code + '/month-balance', {
    method: 'PUT',
    body: { year: selectedYear.value, month, manualSolde: newVal }
  })
}

const getCategoryMonthTotal = (group: any, month: number): number => {
  return r2(group.lines.reduce((sum: number, l: LineDefinition) => sum + (l.amounts[month]?.amount || 0), 0))
}

const getCategoryTotalVisible = (group: any): number => {
  return r2(visibleMonths.value.reduce((sum, m) => sum + getCategoryMonthTotal(group, m), 0))
}

// Solde compte: manual if set, otherwise projection from previous + balance
const getSoldeCompte = (month: number): number => {
  const manual = manualSoldes.value[month]
  if (manual !== null && manual !== undefined) return r2(manual)
  // Projection: apres depenses du mois precedent + revenus du mois courant
  if (month <= 1) return 0
  return r2(getAfterExpenses(month - 1) + getMonthIncome(month))
}

const totalIncomeVisible = computed(() => {
  return visibleMonths.value.reduce((sum, m) => sum + getMonthIncome(m), 0)
})

const totalExpenseVisible = computed(() => {
  return visibleMonths.value.reduce((sum, m) => sum + getMonthExpense(m), 0)
})


const getLineTotalVisible = (lineDefId: string): number => {
  const line = lineDefinitions.value.find(l => l.id === lineDefId)
  if (!line) return 0
  return visibleMonths.value.reduce((sum, m) => sum + (line.amounts[m]?.amount || 0), 0)
}

const r2 = (n: number) => Math.round(n * 100) / 100

const formatAmount = (amount: number): string => {
  if (amount === 0) return '-'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(r2(amount))
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
    await loadRecurringLines()

    const months = await $fetch('/api/family/' + code + '/months', {
      params: { year: selectedYear.value }
    }) as any[]

    const mMap: Record<number, number> = {}
    const mbMap: Record<number, number | null> = {}
    const mrMap: Record<number, number | null> = {}
    const msMap: Record<number, number | null> = {}
    months.forEach((bm: any) => {
      mMap[bm.month] = bm.id
      mbMap[bm.month] = bm.manualBalance ?? null
      mrMap[bm.month] = bm.manualReport ?? null
      msMap[bm.month] = bm.manualSolde ?? null
    })
    monthMap.value = mMap
    manualBalances.value = mbMap
    manualReports.value = mrMap
    manualSoldes.value = msMap

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
            paymentMethod: line.paymentMethod || null,
            dayOfMonth: line.dayOfMonth || null,
            amounts: {}
          })
        }
        const def = lineMap.get(key)!
        def.amounts[bm.month] = { lineId: line.id, amount: line.amount, isPaid: line.isPaid ?? false }
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
  const newAmount = Math.round(Math.abs(parseFloat(input.value) || 0) * 100) / 100

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
    lineDef.amounts[month] = { lineId: created.id, amount: created.amount, isPaid: false }
  }
  // Force reactivity update
  lineDefinitions.value = [...lineDefinitions.value]
}

const addLineModal = ref<HTMLDialogElement>()
const addingIncome = ref(false)
const newLineName = ref('')
const newLineAmount = ref<number>(0)
const newLineRecurrence = ref<'none' | 'monthly' | 'quarterly' | 'yearly'>('monthly')
const newLineFromMonth = ref(1)
const newLineToMonth = ref(12)
const newLinePaymentMethod = ref('')
const newLineDayOfMonth = ref(0)
const newLineCategoryId = ref<number | null>(null)
const showNewCategory = ref(false)
const newCategoryName = ref('')
const newCategoryEmoji = ref('')

// Edit line
const editLineModal = ref<HTMLDialogElement>()
const editingLine = ref<LineDefinition | null>(null)
const editLineName = ref('')
const editLineCategoryId = ref<number | null>(null)
const editLinePaymentMethod = ref('')
const editLineDayOfMonth = ref(0)
const editLineIsIncome = ref(false)
const editLineAmount = ref<number | null>(null)
const editLineRecurringId = ref<number | null>(null)
const editLineRecurringType = ref('')
const editLineRecurringStartMonth = ref<number | null>(null)
const editLineRecurringStartYear = ref<number | null>(null)
const editLineNewRecurrence = ref('')
const recurringLines = ref<any[]>([])

const loadRecurringLines = async () => {
  try {
    recurringLines.value = await $fetch('/api/family/' + code + '/recurring') as any[]
  } catch { recurringLines.value = [] }
}

const openEditLineModal = (line: LineDefinition) => {
  editingLine.value = line
  editLineName.value = line.name
  editLineCategoryId.value = line.categoryId
  editLinePaymentMethod.value = line.paymentMethod || ''
  editLineDayOfMonth.value = line.dayOfMonth || 0
  editLineIsIncome.value = line.isIncome
  editLineAmount.value = null
  editLineNewRecurrence.value = ''

  // Find matching recurring line
  const recurring = recurringLines.value.find(
    (r: any) => r.name === line.name && r.isIncome === line.isIncome
  )
  if (recurring) {
    editLineRecurringId.value = recurring.id
    editLineRecurringType.value = recurring.type
    editLineRecurringStartMonth.value = recurring.startMonth
    editLineRecurringStartYear.value = recurring.startYear
  } else {
    editLineRecurringId.value = null
    editLineRecurringType.value = ''
    editLineRecurringStartMonth.value = null
    editLineRecurringStartYear.value = null
  }

  editLineModal.value?.showModal()
}

const saveEditLine = async () => {
  if (!editingLine.value || !editLineName.value) return
  const line = editingLine.value
  const newName = editLineName.value
  const newCategoryId = editLineCategoryId.value
  const category = categories.value.find((c: any) => c.id === newCategoryId)
  const newAmount = editLineAmount.value

  const newPaymentMethod = editLinePaymentMethod.value || null
  const newDayOfMonth = editLineDayOfMonth.value || null

  // Update all BudgetLine records
  for (const [, entry] of Object.entries(line.amounts)) {
    const body: any = { name: newName, categoryId: newCategoryId, paymentMethod: newPaymentMethod, dayOfMonth: newDayOfMonth }
    if (newAmount !== null && newAmount > 0) body.amount = newAmount
    await $fetch('/api/family/' + code + '/lines/' + (entry as any).lineId, {
      method: 'PUT',
      body
    })
    if (newAmount !== null && newAmount > 0) (entry as any).amount = newAmount
  }

  // Update recurring line if needed
  if (editLineRecurringId.value) {
    // Update amount on recurring definition
    if (newAmount !== null && newAmount > 0) {
      await $fetch('/api/family/' + code + '/recurring/' + editLineRecurringId.value, {
        method: 'PUT',
        body: { name: newName, amount: newAmount, categoryId: newCategoryId }
      }).catch(() => {})
    }
    // Change recurrence type or stop
    if (editLineNewRecurrence.value === 'stop') {
      await $fetch('/api/family/' + code + '/recurring/' + editLineRecurringId.value, {
        method: 'DELETE'
      })
    } else if (editLineNewRecurrence.value) {
      await $fetch('/api/family/' + code + '/recurring/' + editLineRecurringId.value, {
        method: 'PUT',
        body: { type: editLineNewRecurrence.value }
      }).catch(() => {})
    }
  }

  // Update local state
  line.name = newName
  line.categoryId = newCategoryId
  line.categoryEmoji = category?.emoji || ''
  line.paymentMethod = newPaymentMethod
  line.dayOfMonth = newDayOfMonth
  line.id = newName + '__' + String(line.isIncome)
  lineDefinitions.value = [...lineDefinitions.value]

  editLineModal.value?.close()
  await loadRecurringLines()
}

const openAddLineModal = (isIncome: boolean) => {
  addingIncome.value = isIncome
  newLineName.value = ''
  newLineAmount.value = 0
  newLineRecurrence.value = 'monthly'
  newLineFromMonth.value = currentMonth
  newLineToMonth.value = 12
  newLinePaymentMethod.value = ''
  newLineDayOfMonth.value = 0
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
  const month = newLineFromMonth.value

  if (newLineRecurrence.value === 'none') {
    // Ponctuel: single line for the selected month
    let budgetMonthId = monthMap.value[month]
    if (!budgetMonthId) {
      const bm = await $fetch('/api/family/' + code + '/month', {
        method: 'POST',
        body: { year: selectedYear.value, month }
      }) as any
      budgetMonthId = bm.id
      monthMap.value[month] = bm.id
    }
    await $fetch('/api/family/' + code + '/lines/add', {
      method: 'POST',
      body: {
        budgetMonthId,
        name: newLineName.value,
        amount: amount || 0,
        isIncome: addingIncome.value,
        categoryId: newLineCategoryId.value,
        paymentMethod: (addingIncome.value || !newLinePaymentMethod.value) ? null : newLinePaymentMethod.value,
        dayOfMonth: newLineDayOfMonth.value || null
      }
    })
  } else {
    // Recurring (monthly, quarterly, or yearly)
    await $fetch('/api/family/' + code + '/recurring/add', {
      method: 'POST',
      body: {
        name: newLineName.value,
        amount: amount || 0,
        isIncome: addingIncome.value,
        categoryId: newLineCategoryId.value,
        paymentMethod: (addingIncome.value || !newLinePaymentMethod.value) ? null : newLinePaymentMethod.value,
        dayOfMonth: newLineDayOfMonth.value || null,
        type: newLineRecurrence.value,
        startMonth: month,
        startYear: selectedYear.value
      }
    })
  }

  closeAddLineModal()
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
  }
})

watch(hasAccess, (val) => {
  if (val) fetchData()
})
</script>
