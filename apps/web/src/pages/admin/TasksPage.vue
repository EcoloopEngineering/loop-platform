<template>
  <q-page class="q-pa-md page-bg">
    <div class="row items-center q-mb-lg">
      <div class="text-h5 text-weight-bold">Tasks</div>
      <q-space />
      <q-btn-toggle
        v-model="viewMode"
        flat dense no-caps
        toggle-color="primary"
        :options="[
          { value: 'board', slot: 'board' },
          { value: 'list', slot: 'list' },
        ]"
        class="q-mr-md"
      >
        <template #board><q-icon name="view_kanban" size="20px" /><q-tooltip>Board</q-tooltip></template>
        <template #list><q-icon name="view_list" size="20px" /><q-tooltip>List</q-tooltip></template>
      </q-btn-toggle>
      <q-btn unelevated no-caps color="primary" icon="add" label="New Task" @click="showCreate = true" class="radius-10" aria-label="Create a new task" />
    </div>

    <!-- Filters row -->
    <div class="row q-gutter-md q-mb-md">
      <q-select
        v-model="filterStatus"
        :options="statusOptions"
        label="Status"
        outlined
        dense
        clearable
        emit-value
        map-options
        class="min-w-150"
      />
      <q-select
        v-model="filterAssignee"
        :options="assigneeOptions"
        label="Assignee"
        outlined
        dense
        clearable
        emit-value
        map-options
        class="min-w-180"
      />
      <q-input v-model="search" outlined dense placeholder="Search tasks..." class="min-w-200" aria-label="Search tasks">
        <template #prepend><q-icon name="search" aria-hidden="true" /></template>
      </q-input>
    </div>

    <!-- Error -->
    <q-banner v-if="tasksApi.error.value" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ tasksApi.error.value }}
      <template #action>
        <q-btn flat label="Retry" @click="loadTasks" />
      </template>
    </q-banner>

    <!-- BOARD VIEW (Jira-style Kanban) -->
    <div v-else-if="viewMode === 'board'" class="jira-board">
      <div v-for="col in boardColumns" :key="col.status" class="jira-col">
        <div
          class="jira-col-inner"
          :class="{ 'jira-drag-over': dragOverCol === col.status }"
          @dragover.prevent
          @dragenter.prevent="dragOverCol = col.status"
          @dragleave="dragOverCol = null"
          @drop="onDrop(col.status)"
        >
          <!-- Column header -->
          <div class="jira-col-header">
            <span class="jira-col-title">{{ col.label }}</span>
            <span class="jira-col-count">{{ col.tasks.length }}</span>
          </div>

          <!-- Cards -->
          <div class="jira-col-cards">
            <div
              v-for="task in col.tasks"
              :key="task.id"
              class="jira-card"
              draggable="true"
              @dragstart="onDragStart($event, task)"
              @click="openTaskDetail(task)"
            >
              <!-- Lead badge -->
              <div v-if="task.lead?.customerName" class="jira-card-lead" @click.stop="router.push(`/crm/leads/${task.lead.id}`)">
                {{ task.lead.customerName }}
              </div>

              <!-- Title -->
              <div class="jira-card-title">{{ task.title }}</div>

              <!-- Subtask progress -->
              <div v-if="task.subtasks?.length" class="jira-card-subtasks">
                <q-icon name="checklist" size="14px" color="grey-5" />
                <span>{{ task.subtasks.filter((s: Record<string, string>) => s.status === 'COMPLETED').length }}/{{ task.subtasks.length }}</span>
              </div>

              <!-- Footer: priority + avatar -->
              <div class="jira-card-footer">
                <q-icon
                  :name="priorityIcon(task.priority)"
                  :color="priorityColor(String(task.priority))"
                  size="16px"
                />
                <q-space />
                <UserAvatar
                  :name="assigneeName(task.assignee)"
                  size="24px"
                  color="grey-6"
                />
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="!col.tasks.length" class="jira-col-empty">
              Drag tasks here
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- LIST VIEW -->
    <q-card v-else flat class="list-card">
      <q-table
        :rows="filteredTasks"
        :columns="columns"
        row-key="id"
        :loading="tasksApi.loading.value"
        flat
        :pagination="{ rowsPerPage: 25 }"
        :rows-per-page-options="[10, 25, 50]"
        class="task-table"
      >
        <template #body="props">
          <q-tr :props="props" class="cursor-pointer" @click="props.expand = !props.expand">
            <q-td key="title" :props="props">
              <div class="row items-center no-wrap gap-xs">
                <q-icon :name="props.expand ? 'expand_less' : 'expand_more'" size="18px" color="grey-5" />
                <span class="text-weight-bold">{{ props.row.title }}</span>
              </div>
            </q-td>
            <q-td key="lead" :props="props">
              <span v-if="props.row.lead" class="text-primary text-weight-medium">{{ titleCase(props.row.lead.customerName) }}</span>
              <span v-else class="text-grey-4">--</span>
            </q-td>
            <q-td key="assignee" :props="props">
              <div v-if="props.row.assignee" class="row items-center no-wrap gap-xs">
                <UserAvatar :user-id="props.row.assignee.id" :name="titleCase(assigneeName(props.row.assignee))" size="28px" />
                <span class="text-caption">{{ titleCase(assigneeName(props.row.assignee)) }}</span>
              </div>
              <span v-else class="text-grey-4">--</span>
            </q-td>
            <q-td key="status" :props="props">
              <q-badge
                :style="{ background: statusColorMap(props.row.status) }"
                text-color="white"
                class="status-badge"
              >
                {{ formatEnum(props.row.status) }}
              </q-badge>
            </q-td>
            <q-td key="priority" :props="props">
              <q-badge
                :color="priorityColor(props.row.priority)"
                outline
                class="status-badge"
              >
                {{ formatEnum(props.row.priority) }}
              </q-badge>
            </q-td>
            <q-td key="dueDate" :props="props">
              <span v-if="props.row.dueDate" class="text-caption" :class="isOverdue(props.row) ? 'text-negative text-weight-bold' : 'text-grey-7'">
                {{ formatDate(props.row.dueDate) }}
              </span>
              <span v-else class="text-grey-4">--</span>
            </q-td>
            <q-td key="created" :props="props">
              <span class="text-caption text-grey-6">{{ formatDate(props.row.createdAt) }}</span>
            </q-td>
            <q-td key="actions" :props="props" auto-width>
              <div class="row no-wrap gap-xxs">
                <q-btn
                  v-if="props.row.status !== 'COMPLETED' && props.row.status !== 'CANCELLED'"
                  flat dense round icon="check_circle" size="sm" color="positive"
                  aria-label="Mark task as complete"
                  @click.stop="handleCompleteTask(props.row.id)"
                >
                  <q-tooltip>Complete</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="delete" size="sm" color="negative" aria-label="Delete task" @click.stop="handleDeleteTask(props.row.id)">
                  <q-tooltip>Delete</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </q-tr>
          <q-tr v-show="props.expand" :props="props">
            <q-td colspan="100%" class="bg-grey-1 expanded-detail">
              <div v-if="props.row.description" class="q-mb-md">
                <div class="text-weight-bold text-grey-7 q-mb-xs text-12">DESCRIPTION</div>
                <div class="detail-text">{{ props.row.description }}</div>
              </div>
              <div v-if="props.row.subtasks && props.row.subtasks.length > 0">
                <div class="text-weight-bold text-grey-7 q-mb-xs text-12">SUBTASKS</div>
                <div v-for="sub in props.row.subtasks" :key="sub.id" class="row items-center q-mb-xs gap-sm">
                  <q-icon
                    :name="sub.completed ? 'check_box' : 'check_box_outline_blank'"
                    :color="sub.completed ? 'positive' : 'grey-5'"
                    size="20px"
                  />
                  <span :class="sub.completed ? 'text-grey-5 text-strike' : ''" class="text-13">{{ sub.title }}</span>
                </div>
              </div>
              <div v-if="!props.row.description && (!props.row.subtasks || props.row.subtasks.length === 0)" class="text-grey-5 text-13">
                No additional details.
              </div>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="text-center q-pa-xl text-grey-5 text-14">
            No tasks found.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Create Task Dialog -->
    <q-dialog v-model="showCreate" persistent @keyup.esc="showCreate = false" aria-label="Create new task dialog">
      <q-card class="dialog-card-lg">
        <q-card-section>
          <div class="text-h6 text-weight-bold">New Task</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input v-model="form.title" label="Title *" outlined dense class="q-mb-sm" />
          <q-input v-model="form.description" label="Description" outlined dense type="textarea" autogrow class="q-mb-sm" />
          <q-select
            v-model="form.priority"
            :options="priorityOptions"
            label="Priority"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-sm"
          />
          <q-select
            v-model="form.assigneeId"
            :options="assigneeOptions"
            label="Assignee"
            outlined
            dense
            clearable
            emit-value
            map-options
            class="q-mb-sm"
          />
          <q-input v-model="form.dueDate" label="Due Date" outlined dense type="date" class="q-mb-sm" />
          <q-input v-model="form.leadId" label="Lead ID (optional)" outlined dense class="q-mb-sm" />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Cancel" color="grey-7" @click="showCreate = false" aria-label="Cancel task creation" />
          <q-btn unelevated no-caps label="Create" color="primary" :loading="creating" :disable="!form.title" @click="handleCreateTask" class="radius-md" aria-label="Confirm create task" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Task Detail Dialog -->
    <q-dialog v-model="showTaskDetail" @keyup.esc="showTaskDetail = false">
      <q-card style="min-width: 450px" class="radius-lg">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ selectedTask?.title }}</div>
          <q-space />
          <q-badge :color="statusColorMap(selectedTask?.status ?? '')" :label="formatEnum(selectedTask?.status ?? '')" class="q-mr-sm" />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section v-if="selectedTask">
          <!-- Lead link -->
          <div v-if="selectedTask.lead" class="q-mb-md">
            <div class="text-caption text-grey-6 q-mb-xs">LEAD</div>
            <q-btn flat dense no-caps color="primary" :label="selectedTask.lead.customerName" icon="open_in_new"
              @click="router.push(`/crm/leads/${selectedTask.lead.id}`); showTaskDetail = false" />
          </div>

          <!-- Description -->
          <div v-if="selectedTask.description" class="q-mb-md">
            <div class="text-caption text-grey-6 q-mb-xs">DESCRIPTION</div>
            <div class="text-body2">{{ selectedTask.description }}</div>
          </div>

          <!-- Assignee -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-6 q-mb-xs">ASSIGNEE</div>
            <div class="row items-center gap-xs">
              <UserAvatar :name="assigneeName(selectedTask.assignee)" size="24px" />
              <span>{{ assigneeName(selectedTask.assignee) || 'Unassigned' }}</span>
            </div>
          </div>

          <!-- Priority & Due Date -->
          <div class="row q-gutter-lg q-mb-md">
            <div>
              <div class="text-caption text-grey-6 q-mb-xs">PRIORITY</div>
              <q-badge :color="priorityColor(String(selectedTask.priority))" :label="formatEnum(String(selectedTask.priority))" />
            </div>
            <div v-if="selectedTask.dueDate">
              <div class="text-caption text-grey-6 q-mb-xs">DUE DATE</div>
              <span :class="isOverdue(selectedTask) ? 'text-negative' : ''">{{ formatDate(selectedTask.dueDate) }}</span>
            </div>
          </div>

          <!-- Subtasks -->
          <div v-if="selectedTask.subtasks?.length">
            <div class="text-caption text-grey-6 q-mb-xs">SUBTASKS ({{ selectedTask.subtasks.filter((s: Record<string, unknown>) => s.status === 'COMPLETED' || s.completed).length }}/{{ selectedTask.subtasks.length }})</div>
            <div v-for="sub in selectedTask.subtasks" :key="(sub as Record<string, string>).id" class="row items-center q-mb-xs">
              <q-icon
                :name="(sub as Record<string, unknown>).status === 'COMPLETED' || (sub as Record<string, unknown>).completed ? 'check_box' : 'check_box_outline_blank'"
                :color="(sub as Record<string, unknown>).status === 'COMPLETED' || (sub as Record<string, unknown>).completed ? 'positive' : 'grey-4'"
                size="20px"
                class="q-mr-sm"
              />
              <span :class="(sub as Record<string, unknown>).status === 'COMPLETED' || (sub as Record<string, unknown>).completed ? 'text-strike text-grey-5' : ''">
                {{ (sub as Record<string, string>).title }}
              </span>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn v-if="selectedTask?.status === 'OPEN'" flat no-caps color="orange" icon="arrow_forward" label="Start" @click="moveTaskStatus(selectedTask.id, 'IN_PROGRESS').then(() => { loadTasks(); showTaskDetail = false; })" />
          <q-btn v-if="selectedTask?.status === 'IN_PROGRESS'" flat no-caps color="positive" icon="check" label="Complete" @click="handleCompleteTask(selectedTask.id).then(() => { showTaskDetail = false; })" />
          <q-btn v-if="selectedTask?.lead" flat no-caps color="primary" label="Open Lead" @click="router.push(`/crm/leads/${selectedTask.lead.id}`); showTaskDetail = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useTasksApi, type TaskRow } from '@/composables/useTasksApi';
import { titleCase } from '@/composables/useLeadFormatting';
import UserAvatar from '@/components/common/UserAvatar.vue';

const router = useRouter();

const $q = useQuasar();
const tasksApi = useTasksApi();

const viewMode = ref('board');
const creating = ref(false);
const tasks = ref<TaskRow[]>([]);
const showCreate = ref(false);

const filterStatus = ref<string | null>(null);
const filterAssignee = ref<string | null>(null);
const search = ref('');

const form = ref({
  title: '',
  description: '',
  priority: 'MEDIUM',
  assigneeId: null as string | null,
  dueDate: '',
  leadId: '',
});

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const priorityOptions = [
  { label: 'Low', value: 0 },
  { label: 'Medium', value: 1 },
  { label: 'High', value: 2 },
  { label: 'Urgent', value: 3 },
];

const assigneeOptions = ref<{ label: string; value: string }[]>([]);

const columns = [
  { name: 'title', label: 'Task Title', field: 'title', align: 'left' as const, sortable: true },
  { name: 'lead', label: 'Lead Name', field: (row: TaskRow) => row.lead?.customerName ?? '', align: 'left' as const, sortable: true },
  { name: 'assignee', label: 'Assignee', field: (row: TaskRow) => assigneeName(row.assignee), align: 'left' as const, sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left' as const, sortable: true },
  { name: 'priority', label: 'Priority', field: 'priority', align: 'left' as const, sortable: true },
  { name: 'dueDate', label: 'Due Date', field: 'dueDate', align: 'left' as const, sortable: true },
  { name: 'created', label: 'Created', field: 'createdAt', align: 'left' as const, sortable: true },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const filteredTasks = computed(() => {
  let result = tasks.value;

  if (filterStatus.value) {
    result = result.filter((t) => t.status === filterStatus.value);
  }

  if (filterAssignee.value) {
    result = result.filter((t) => t.assignee?.id === filterAssignee.value);
  }

  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q) ||
        (t.lead?.customerName ?? '').toLowerCase().includes(q) ||
        assigneeName(t.assignee).toLowerCase().includes(q),
    );
  }

  return result;
});

const boardColumns = computed(() => [
  { status: 'OPEN', label: 'Open', color: '#2196F3', qcolor: 'blue', tasks: filteredTasks.value.filter((t) => t.status === 'OPEN') },
  { status: 'IN_PROGRESS', label: 'In Progress', color: '#FF9800', qcolor: 'orange', tasks: filteredTasks.value.filter((t) => t.status === 'IN_PROGRESS') },
  { status: 'COMPLETED', label: 'Done', color: '#4CAF50', qcolor: 'positive', tasks: filteredTasks.value.filter((t) => t.status === 'COMPLETED') },
]);

// Drag and drop state
const dragOverCol = ref<string | null>(null);
const draggedTask = ref<TaskRow | null>(null);

function onDragStart(event: DragEvent, task: TaskRow) {
  draggedTask.value = task;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  }
}

async function onDrop(targetStatus: string) {
  dragOverCol.value = null;
  if (!draggedTask.value || draggedTask.value.status === targetStatus) return;

  if (targetStatus === 'COMPLETED') {
    await handleCompleteTask(draggedTask.value.id);
  } else {
    await moveTaskStatus(draggedTask.value.id, targetStatus);
  }
  draggedTask.value = null;
}

// Task detail dialog
const selectedTask = ref<TaskRow | null>(null);
const showTaskDetail = ref(false);

function openTaskDetail(task: TaskRow) {
  selectedTask.value = task;
  showTaskDetail.value = true;
}

async function moveTaskStatus(taskId: string, newStatus: string) {
  try {
    await tasksApi.updateTaskStatus(taskId, newStatus);
    $q.notify({ type: 'info', message: `Task moved to ${newStatus.replace('_', ' ')}`, timeout: 2000 });
    loadTasks();
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to move task' });
  }
}

function assigneeName(assignee?: { firstName?: string; lastName?: string; name?: string }): string {
  if (!assignee) return '';
  if (assignee.name) return assignee.name;
  return `${assignee.firstName ?? ''} ${assignee.lastName ?? ''}`.trim();
}

function statusColorMap(status: string): string {
  const map: Record<string, string> = {
    OPEN: '#2196F3',
    IN_PROGRESS: '#FF9800',
    COMPLETED: '#4CAF50',
    CANCELLED: '#9E9E9E',
  };
  return map[status] ?? '#6B7280';
}

function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    '0': 'grey-6', LOW: 'grey-6',
    '1': 'blue', MEDIUM: 'blue',
    '2': 'orange', HIGH: 'orange',
    '3': 'negative', URGENT: 'negative',
  };
  return map[priority] ?? 'grey-6';
}

function priorityIcon(priority: string | number): string {
  const p = String(priority);
  const map: Record<string, string> = {
    '0': 'arrow_downward', LOW: 'arrow_downward',
    '1': 'remove', MEDIUM: 'remove',
    '2': 'arrow_upward', HIGH: 'arrow_upward',
    '3': 'priority_high', URGENT: 'priority_high',
  };
  return map[p] ?? 'remove';
}

function formatEnum(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(task: TaskRow): boolean {
  if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

async function loadTasks() {
  tasks.value = await tasksApi.fetchTasks({
    status: filterStatus.value ?? undefined,
    assigneeId: filterAssignee.value ?? undefined,
  });
}

async function handleCreateTask() {
  creating.value = true;
  const ok = await tasksApi.createTask({
    title: form.value.title,
    description: form.value.description || undefined,
    priority: form.value.priority,
    assigneeId: form.value.assigneeId,
    dueDate: form.value.dueDate || undefined,
    leadId: form.value.leadId || undefined,
  });
  if (ok) {
    showCreate.value = false;
    form.value = { title: '', description: '', priority: 'MEDIUM', assigneeId: null, dueDate: '', leadId: '' };
    $q.notify({ type: 'positive', message: 'Task created successfully' });
    loadTasks();
  } else {
    $q.notify({ type: 'negative', message: tasksApi.error.value ?? 'Failed to create task' });
  }
  creating.value = false;
}

async function handleCompleteTask(id: string) {
  const ok = await tasksApi.completeTask(id);
  if (ok) {
    $q.notify({ type: 'positive', message: 'Task completed' });
    loadTasks();
  } else {
    $q.notify({ type: 'negative', message: tasksApi.error.value ?? 'Failed to complete task' });
  }
}

function handleDeleteTask(id: string) {
  $q.dialog({
    title: 'Delete Task',
    message: 'Are you sure you want to delete this task?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const ok = await tasksApi.deleteTask(id);
    if (ok) {
      $q.notify({ type: 'positive', message: 'Task deleted' });
      loadTasks();
    } else {
      $q.notify({ type: 'negative', message: tasksApi.error.value ?? 'Failed to delete task' });
    }
  });
}

onMounted(async () => {
  assigneeOptions.value = await tasksApi.fetchAssigneeOptions();
  loadTasks();
});
</script>

<style lang="scss" scoped>
.list-card {
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  overflow: hidden;
}

.task-table {
  :deep(thead th) {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #6B7280;
    letter-spacing: 0.04em;
    border-bottom: 2px solid #E5E7EB;
  }

  :deep(tbody tr) {
    transition: background 0.15s;

    &:hover {
      background: #F9FAFB;
    }

    td {
      font-size: 13px;
      border-bottom: 1px solid #F3F4F6;
      padding: 10px 16px;
    }
  }
}

.status-badge {
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
}

// ── Jira-style Board ──
.jira-board {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: 500px;
}

.jira-col {
  min-width: 280px;
  flex: 1;
}

.jira-col-inner {
  background: #F4F5F7;
  border-radius: 6px;
  min-height: 480px;
  transition: background 0.2s, outline 0.2s;

  &.jira-drag-over {
    outline: 2px dashed #00897B;
    background: #E8F5E9;
  }
}

.jira-col-header {
  padding: 12px 14px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.jira-col-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #5E6C84;
}

.jira-col-count {
  font-size: 11px;
  font-weight: 600;
  color: #5E6C84;
  background: #DFE1E6;
  border-radius: 10px;
  padding: 1px 7px;
  min-width: 20px;
  text-align: center;
}

.jira-col-cards {
  padding: 0 6px 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.jira-card {
  background: #FFFFFF;
  border-radius: 4px;
  padding: 10px 12px;
  cursor: grab;
  box-shadow: 0 1px 2px rgba(9, 30, 66, 0.12);
  transition: box-shadow 0.15s, transform 0.1s;

  &:hover {
    background: #FAFBFC;
    box-shadow: 0 2px 6px rgba(9, 30, 66, 0.18);
    transform: translateY(-1px);
  }

  &:active {
    cursor: grabbing;
    box-shadow: 0 4px 12px rgba(9, 30, 66, 0.25);
    transform: scale(1.02);
  }
}

.jira-card-lead {
  font-size: 11px;
  font-weight: 600;
  color: #00897B;
  margin-bottom: 4px;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.jira-card-title {
  font-size: 13px;
  font-weight: 500;
  color: #172B4D;
  line-height: 1.35;
  margin-bottom: 8px;
}

.jira-card-subtasks {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #5E6C84;
  margin-bottom: 8px;
}

.jira-card-footer {
  display: flex;
  align-items: center;
}

.jira-col-empty {
  text-align: center;
  padding: 24px 12px;
  color: #B3BAC5;
  font-size: 12px;
  font-style: italic;
}

</style>
