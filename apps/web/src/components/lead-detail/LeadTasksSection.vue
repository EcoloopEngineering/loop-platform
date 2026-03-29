<template>
  <q-tab-panel name="tasks">
    <div v-if="tasks.length === 0" class="text-center text-grey-5 q-pa-lg">
      <q-icon name="task_alt" size="48px" color="grey-3" />
      <div class="q-mt-sm">No tasks for this lead yet.</div>
    </div>
    <div v-else>
      <q-list separator>
        <q-item v-for="task in tasks" :key="task.id">
          <q-item-section avatar>
            <q-icon :name="task.status === 'COMPLETED' ? 'check_circle' : 'radio_button_unchecked'"
                    :color="task.status === 'COMPLETED' ? 'positive' : 'grey-4'" size="24px" />
          </q-item-section>
          <q-item-section>
            <q-item-label :class="task.status === 'COMPLETED' ? 'text-strike text-grey-5' : ''">
              {{ task.title }}
            </q-item-label>
            <q-item-label caption>
              {{ task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned' }}
              <span v-if="task.dueDate"> · Due {{ new Date(task.dueDate).toLocaleDateString() }}</span>
            </q-item-label>
            <div v-if="task.subtasks?.length" class="q-mt-xs q-ml-md">
              <div v-for="sub in task.subtasks" :key="sub.id" class="row items-center q-mb-xs">
                <q-icon :name="sub.status === 'COMPLETED' ? 'check_box' : 'check_box_outline_blank'"
                        :color="sub.status === 'COMPLETED' ? 'positive' : 'grey-4'" size="18px" class="q-mr-xs" />
                <span class="text-caption" :class="sub.status === 'COMPLETED' ? 'text-strike text-grey-5' : ''">{{ sub.title }}</span>
              </div>
            </div>
          </q-item-section>
          <q-item-section side>
            <q-badge :color="task.status === 'COMPLETED' ? 'positive' : task.status === 'IN_PROGRESS' ? 'orange' : 'blue'"
                     :label="task.status.replace('_', ' ')" />
          </q-item-section>
          <q-item-section side v-if="task.status !== 'COMPLETED' && task.status !== 'CANCELLED'">
            <q-btn flat dense icon="check" color="positive" size="sm" @click="emit('completeTask', task.id)" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-tab-panel>
</template>

<script setup lang="ts">
interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  assignee?: { firstName: string; lastName: string };
  subtasks?: Array<{ id: string; title: string; status: string }>;
}

defineProps<{
  tasks: TaskItem[];
}>();

const emit = defineEmits<{
  (e: 'completeTask', taskId: string): void;
}>();
</script>

<style lang="scss" scoped>
</style>
