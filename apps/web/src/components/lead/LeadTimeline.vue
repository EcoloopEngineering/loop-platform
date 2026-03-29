<template>
  <q-timeline color="primary" class="q-px-sm">
    <q-timeline-entry
      v-for="item in activities"
      :key="item.id"
      :icon="activityIcon(item.type)"
      :color="activityColor(item.type)"
    >
      <template #subtitle>
        <div class="row items-center q-gutter-x-sm">
          <q-avatar v-if="item.userName" size="28px" color="grey-4" text-color="grey-8">
            <span class="text-caption" style="font-size: 10px">
              {{ initials(item.userName) }}
            </span>
          </q-avatar>
          <span class="text-caption text-grey-6">
            {{ formatDate(item.createdAt) }}
          </span>
        </div>
      </template>
      <div class="text-body2">{{ item.description }}</div>
    </q-timeline-entry>

    <div v-if="activities.length === 0" class="text-grey-6 text-center q-pa-lg">
      No activity yet.
    </div>
  </q-timeline>
</template>

<script setup lang="ts">
defineProps<{
  activities: {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    userName?: string;
  }[];
}>();

const ICONS: Record<string, string> = {
  stage_change: 'swap_horiz',
  note: 'sticky_note_2',
  document: 'attach_file',
  appointment: 'event',
  call: 'phone',
  email: 'email',
};

const COLORS: Record<string, string> = {
  stage_change: 'primary',
  note: 'amber',
  document: 'blue',
  appointment: 'purple',
  call: 'positive',
  email: 'orange',
};

function activityIcon(type: string) {
  return ICONS[type] ?? 'circle';
}

function activityColor(type: string) {
  return COLORS[type] ?? 'grey-6';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style lang="scss" scoped>
</style>
