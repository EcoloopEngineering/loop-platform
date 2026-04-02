<template>
  <div>
    <div v-if="tasks.length === 0" class="text-center text-grey-5 q-pa-lg">
      <q-icon name="task_alt" size="48px" color="grey-3" />
      <div class="q-mt-sm">No tasks for this lead yet.</div>
      <div class="text-caption q-mt-xs">Tasks are auto-created when the lead changes stage.</div>
    </div>
    <div v-else>
      <div class="row items-center q-mb-sm">
        <div class="text-weight-bold text-grey-8 text-body2">
          {{ completedCount }}/{{ tasks.length }} completed
        </div>
        <q-space />
        <q-linear-progress
          :value="tasks.length ? completedCount / tasks.length : 0"
          color="positive"
          track-color="grey-3"
          rounded
          style="width: 100px; height: 6px"
        />
      </div>

      <q-list separator class="task-list">
        <q-item v-for="task in tasks" :key="task.id" class="task-item">
          <q-item-section side>
            <q-icon
              :name="statusIcon(task.status)"
              :color="statusColor(task.status)"
              size="20px"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label :class="{ 'text-strike text-grey-5': task.status === 'COMPLETED' }">
              {{ task.title }}
            </q-item-label>
            <q-item-label caption>
              {{ task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              :color="statusBadgeColor(task.status)"
              :text-color="statusBadgeText(task.status)"
              class="status-badge"
            >
              {{ formatStatus(task.status) }}
            </q-badge>
          </q-item-section>
          <q-item-section v-if="task.status !== 'COMPLETED' && task.status !== 'CANCELLED'" side>
            <q-btn-dropdown flat dense round icon="more_vert" size="sm" color="grey-6" no-icon-animation>
              <q-list dense class="task-menu">
                <q-item v-if="task.status === 'OPEN'" clickable v-close-popup @click="moveTask(task.id, 'IN_PROGRESS')">
                  <q-item-section avatar><q-icon name="pending" size="16px" color="orange" /></q-item-section>
                  <q-item-section>Start</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="emit('completeTask', task.id)">
                  <q-item-section avatar><q-icon name="check_circle" size="16px" color="positive" /></q-item-section>
                  <q-item-section>Complete</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/boot/axios';
import { useQuasar } from 'quasar';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
  assignee?: { firstName: string; lastName: string };
  subtasks?: Array<{ id: string; title: string; status: string }>;
}

const props = defineProps<{
  tasks: TaskItem[];
}>();

const emit = defineEmits<{
  (e: 'completeTask', taskId: string): void;
  (e: 'taskUpdated'): void;
}>();

const $q = useQuasar();

const completedCount = computed(() =>
  props.tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED').length,
);

function statusIcon(status: string) {
  if (status === 'COMPLETED') return 'check_circle';
  if (status === 'IN_PROGRESS') return 'pending';
  if (status === 'CANCELLED') return 'cancel';
  return 'radio_button_unchecked';
}

function statusColor(status: string) {
  if (status === 'COMPLETED') return 'positive';
  if (status === 'IN_PROGRESS') return 'orange';
  if (status === 'CANCELLED') return 'grey-5';
  return 'blue-4';
}

function statusBadgeColor(status: string) {
  if (status === 'COMPLETED') return 'green-1';
  if (status === 'IN_PROGRESS') return 'orange-1';
  if (status === 'CANCELLED') return 'grey-2';
  return 'blue-1';
}

function statusBadgeText(status: string) {
  if (status === 'COMPLETED') return 'green-8';
  if (status === 'IN_PROGRESS') return 'orange-8';
  if (status === 'CANCELLED') return 'grey-6';
  return 'blue-8';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

async function moveTask(taskId: string, newStatus: string) {
  try {
    await api.patch(`/tasks/${taskId}`, { status: newStatus });
    $q.notify({ type: 'info', message: `Task moved to ${formatStatus(newStatus)}`, timeout: 2000 });
    emit('taskUpdated');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update task' });
  }
}
</script>

<style lang="scss" scoped>
.task-list {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
}

.task-item {
  padding: 10px 14px;
  min-height: 48px;

  &:hover {
    background: #F9FAFB;
  }
}

.status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.task-menu {
  min-width: 120px;
}
</style>
