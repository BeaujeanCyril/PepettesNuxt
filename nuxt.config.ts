export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {}
    }
  },
  app: {
    head: {
      title: 'Pepettes - Budget familial',
      meta: [
        { name: 'description', content: 'Gestion de budget familial' }
      ]
    }
  }
})
