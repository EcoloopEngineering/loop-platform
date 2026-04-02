<template>
  <div>
    <div v-if="lines.length" class="commission-table">
      <q-markup-table flat bordered separator="horizontal" class="rounded-card">
        <thead>
          <tr>
            <th class="text-left">Description</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.label">
            <td>{{ line.label }}</td>
            <td class="text-right text-weight-medium">{{ line.value }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="commission-total-row">
            <td class="text-weight-bold">Total</td>
            <td class="text-right text-weight-bold text-primary text-h6">
              {{ total }}
            </td>
          </tr>
        </tfoot>
      </q-markup-table>
    </div>
    <div v-else class="text-grey-6 text-center q-pa-lg">
      No commission data available.
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  lines: Array<{ label: string; value: string }>;
  total: string;
}>();
</script>

<style lang="scss" scoped>
.commission-total-row {
  background: #F9FAFB;
}

.rounded-card {
  border-radius: 12px;
}
</style>
