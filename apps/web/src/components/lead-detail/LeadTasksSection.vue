<template>
  <q-tab-panel name="tasks">
    <div v-if="tasks.length === 0" class="text-center text-grey-5 q-pa-lg">
      <q-icon name="task_alt" size="48px" color="grey-3" />
      <div class="q-mt-sm">No tasks for this lead yet.</div>
      <div class="text-caption q-mt-xs">Tasks are auto-created when the lead changes stage.</div>
    </div>
    <div v-else>
      <!-- Progress header -->
      <div class="row items-center q-mb-md">
        <div class="text-weight-bold text-grey-8">
          {{ completedCount }}/{{ tasks.length }} completed
        </div>
        <q-space />
        <q-linear-progress
          :value="tasks.length ? completedCount / tasks.length : 0"
          color="positive"
          track-color="grey-3"
          rounded
          style="width: 120px; height: 8px"
        />
      </div>

      <!-- Kanban Board -->
      <div class="task-board row q-col-gutter-sm">
        <!-- OPEN column -->
        <div class="col">
          <div class="board-col">
            <div class="board-col-header bg-blue-1 text-blue-8">
              <q-icon name="radio_button_unchecked" size="16px" class="q-mr-xs" />
              Open ({{ openTasks.length }})
            </div>
            <div class="board-col-body">
              <div
                v-for="task in openTasks"
                :key="task.id"
                class="task-card"
                :class="{ 'task-new': isNew(task) }"
              >
                <div class="row items-start no-wrap">
                  <div class="col">
                    <div class="task-title">{{ task.title }}</div>
                    <div class="task-assignee text-caption text-grey">
                      {{ task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned' }}
                    </div>
                    <!-- Subtasks progress -->
                    <div v-if="task.subtasks?.length" class="q-mt-xs">
                      <div class="text-caption text-grey-6">
                        {{ task.subtasks.filter((s: SubtaskItem) => s.status === 'COMPLETED').length }}/{{ task.subtasks.length }} subtasks
                      </div>
                      <q-linear-progress
                        :value="task.subtasks.filter((s: SubtaskItem) => s.status === 'COMPLETED').length / task.subtasks.length"
                        color="primary"
                        track-color="grey-3"
                        rounded
                        size="4px"
                        class="q-mt-xs"
                      />
                    </div>
                  </div>
                  <div class="col-auto q-ml-sm">
                    <q-btn flat dense round icon="arrow_forward" size="xs" color="orange" @click="moveTask(task.id, 'IN_PROGRESS')" aria-label="Move to In Progress">
                      <q-tooltip>Move to In Progress</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
              <div v-if="!openTasks.length" class="text-caption text-grey-4 text-center q-pa-sm">No open tasks</div>
            </div>
          </div>
        </div>

        <!-- IN_PROGRESS column -->
        <div class="col">
          <div class="board-col">
            <div class="board-col-header bg-orange-1 text-orange-8">
              <q-icon name="pending" size="16px" class="q-mr-xs" />
              In Progress ({{ inProgressTasks.length }})
            </div>
            <div class="board-col-body">
              <div
                v-for="task in inProgressTasks"
                :key="task.id"
                class="task-card"
              >
                <div class="row items-start no-wrap">
                  <div class="col">
                    <div class="task-title">{{ task.title }}</div>
                    <div class="task-assignee text-caption text-grey">
                      {{ task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned' }}
                    </div>
                    <div v-if="task.subtasks?.length" class="q-mt-xs">
                      <div class="text-caption text-grey-6">
                        {{ task.subtasks.filter((s: SubtaskItem) => s.status === 'COMPLETED').length }}/{{ task.subtasks.length }} subtasks
                      </div>
                      <q-linear-progress
                        :value="task.subtasks.filter((s: SubtaskItem) => s.status === 'COMPLETED').length / task.subtasks.length"
                        color="orange"
                        track-color="grey-3"
                        rounded
                        size="4px"
                        class="q-mt-xs"
                      />
                    </div>
                  </div>
                  <div class="col-auto q-ml-sm">
                    <q-btn flat dense round icon="check_circle" size="xs" color="positive" @click="emit('completeTask', task.id)" aria-label="Complete task">
                      <q-tooltip>Complete</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
              <div v-if="!inProgressTasks.length" class="text-caption text-grey-4 text-center q-pa-sm">No tasks in progress</div>
            </div>
          </div>
        </div>

        <!-- COMPLETED column -->
        <div class="col">
          <div class="board-col">
            <div class="board-col-header bg-green-1 text-green-8">
              <q-icon name="check_circle" size="16px" class="q-mr-xs" />
              Done ({{ completedCount }})
            </div>
            <div class="board-col-body">
              <div
                v-for="task in completedTasks"
                :key="task.id"
                class="task-card task-done"
              >
                <div class="task-title text-strike text-grey-5">{{ task.title }}</div>
                <div class="task-assignee text-caption text-grey-4">
                  {{ task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '' }}
                </div>
              </div>
              <div v-if="!completedTasks.length" class="text-caption text-grey-4 text-center q-pa-sm">No completed tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-tab-panel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { api } from '@/boot/axios';
import { useQuasar } from 'quasar';

interface SubtaskItem {
  id: string;
  title: string;
  status: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  createdAt?: string;
  assignee?: { firstName: string; lastName: string };
  subtasks?: SubtaskItem[];
}

const props = defineProps<{
  tasks: TaskItem[];
}>();

const emit = defineEmits<{
  (e: 'completeTask', taskId: string): void;
  (e: 'taskUpdated'): void;
}>();

const $q = useQuasar();

const openTasks = computed(() => props.tasks.filter((t) => t.status === 'OPEN'));
const inProgressTasks = computed(() => props.tasks.filter((t) => t.status === 'IN_PROGRESS'));
const completedTasks = computed(() => props.tasks.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED'));
const completedCount = computed(() => completedTasks.value.length);

function isNew(task: TaskItem): boolean {
  if (!task.createdAt) return false;
  return Date.now() - new Date(task.createdAt).getTime() < 30_000;
}

async function moveTask(taskId: string, newStatus: string) {
  try {
    await api.patch(`/tasks/${taskId}`, { status: newStatus });
    $q.notify({ type: 'info', message: `Task moved to ${newStatus.replace('_', ' ')}`, timeout: 2000 });
    emit('taskUpdated');
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update task' });
  }
}
</script>

<style lang="scss" scoped>
.task-board {
  min-height: 200px;
}

.board-col {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
  min-height: 200px;
}

.board-col-header {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
}

.board-col-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 150px;
}

.task-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 10px;
  transition: box-shadow 0.15s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.task-new {
  border-left: 3px solid #2196F3;
  animation: highlight-fade 3s ease-out;
}

.task-done {
  opacity: 0.6;
}

.task-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
}

.task-assignee {
  font-size: 11px;
  margin-top: 2px;
}

@keyframes highlight-fade {
  0% { background-color: rgba(33, 150, 243, 0.12); }
  100% { background-color: #FFFFFF; }
}

// Dark mode
:global(.body--dark) {
  .board-col {
    border-color: #333;
  }
  .board-col-header {
    &.bg-blue-1 { background: rgba(33, 150, 243, 0.15) !important; }
    &.bg-orange-1 { background: rgba(255, 152, 0, 0.15) !important; }
    &.bg-green-1 { background: rgba(76, 175, 80, 0.15) !important; }
  }
  .task-card {
    background: #1e1e1e;
    border-color: #333;
    &:hover { box-shadow: 0 2px 8px rgba(255, 255, 255, 0.05); }
  }
  .task-title { color: #E5E7EB; }
  @keyframes highlight-fade {
    0% { background-color: rgba(33, 150, 243, 0.2); }
    100% { background-color: #1e1e1e; }
  }
}
</style>