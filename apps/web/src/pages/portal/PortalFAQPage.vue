<template>
  <q-page class="portal-faq q-pa-md">
    <h5 class="page-title q-mb-sm">Help & FAQ</h5>
    <p class="text-grey-6 q-mb-lg text-14">Find answers to common questions about your solar project</p>

    <!-- Search -->
    <q-input v-model="search" outlined dense placeholder="Search questions..." class="q-mb-lg">
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <!-- FAQ Categories -->
    <div v-for="cat in filteredCategories" :key="cat.title" class="q-mb-lg">
      <div class="category-title q-mb-sm">{{ cat.title }}</div>
      <q-expansion-item
        v-for="(item, idx) in cat.items"
        :key="idx"
        :label="item.q"
        dense
        class="faq-item q-mb-xs"
        expand-icon-class="text-grey-5"
      >
        <q-card flat>
          <q-card-section class="q-pa-md text-grey-7 faq-answer">
            {{ item.a }}
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </div>

    <!-- Contact -->
    <q-card flat class="contact-card q-mt-lg">
      <q-card-section class="text-center q-pa-lg">
        <q-icon name="support_agent" size="48px" color="primary" class="q-mb-sm" />
        <div class="text-weight-bold text-16">Still have questions?</div>
        <p class="text-grey-6 q-mb-md text-13">Our team is ready to help you</p>
        <div class="row q-gutter-sm justify-center">
          <q-btn unelevated no-caps color="primary" icon="email" label="Email Us" href="mailto:support@ecoloop.us" class="radius-10" />
          <q-btn outline no-caps color="primary" icon="phone" label="Call Us" href="tel:+18005551234" class="radius-10" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const search = ref('');

const categories = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How does solar installation work?', a: 'The process starts with a site assessment, followed by custom design, permitting, installation, and final inspection. The entire process typically takes 4-8 weeks depending on your location and permit requirements.' },
      { q: 'How long does installation take?', a: 'Most residential installations are completed in 1-2 days. Commercial installations may take longer depending on the system size.' },
      { q: 'Do I need to be home during installation?', a: 'Yes, we recommend having someone present during installation. Our team will coordinate a convenient time with you.' },
    ],
  },
  {
    title: 'My Project',
    items: [
      { q: 'How can I check my project status?', a: 'You can view your project status anytime on the "My Project" page. The progress bar and stage timeline show exactly where your project stands.' },
      { q: 'What do the different stages mean?', a: 'Each stage represents a milestone: Design (panel layout creation), Permitting (local authority approval), Installation (physical setup), and Commissioning (system activation and testing).' },
      { q: 'How will I know when my installation is scheduled?', a: 'You\'ll receive an email and in-app notification when your installation date is confirmed. You can also check the project page for scheduling updates.' },
    ],
  },
  {
    title: 'Billing & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept credit/debit cards, ACH bank transfers, and financing through our partner programs. Your sales representative can discuss the best option for you.' },
      { q: 'Are there any hidden costs?', a: 'No. The price quoted includes all equipment, installation, permitting, and inspection costs. Any change orders will be discussed and approved by you before proceeding.' },
      { q: 'What about tax credits and incentives?', a: 'The federal Investment Tax Credit (ITC) allows you to deduct a percentage of the cost of your solar system from your federal taxes. State and local incentives may also apply. Consult your tax advisor for details.' },
    ],
  },
  {
    title: 'After Installation',
    items: [
      { q: 'How do I monitor my solar production?', a: 'Most systems come with monitoring software that lets you track energy production in real-time through a mobile app or web portal.' },
      { q: 'What maintenance is required?', a: 'Solar panels require minimal maintenance. We recommend an annual cleaning and inspection. Our maintenance team can help with any issues.' },
      { q: 'What warranty do I get?', a: 'Our installations come with a 25-year panel warranty, 10-year inverter warranty, and a 10-year workmanship warranty.' },
    ],
  },
];

const filteredCategories = computed(() => {
  if (!search.value) return categories;
  const q = search.value.toLowerCase();
  return categories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    }))
    .filter(cat => cat.items.length > 0);
});
</script>

<style lang="scss" scoped>
.portal-faq {
  background: #F8FAFB;
  padding: 24px 5% !important;
  max-width: 100%;
  margin: 0 auto;
}

.page-title {
  margin: 0;
  font-weight: 700;
  color: #111827;
}

.category-title {
  font-size: 13px;
  font-weight: 700;
  color: #00897B;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.faq-item {
  border-radius: 12px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;

  :deep(.q-item__label) {
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }
}

.faq-answer {
  font-size: 13px;
  line-height: 1.6;
}

.contact-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #F0FDFA, #ECFDF5);
}
</style>
