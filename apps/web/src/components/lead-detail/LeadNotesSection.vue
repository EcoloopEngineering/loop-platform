<template>
  <q-tab-panel name="notes">
    <div class="q-mb-md">
      <q-input
        v-model="newNote"
        type="textarea"
        outlined
        placeholder="Add a note..."
        autogrow
        :input-style="{ minHeight: '80px' }"
        class="note-input"
      />
      <div class="row justify-end q-mt-sm">
        <q-btn
          unelevated
          no-caps
          color="primary"
          label="Save note"
          :loading="savingNote"
          :disable="!newNote.trim()"
          class="rounded-btn"
          @click="saveNote"
        />
      </div>
    </div>

    <q-separator class="q-mb-md" />

    <div v-if="notes.length === 0" class="text-grey-6 text-center q-pa-lg">
      No notes yet.
    </div>
    <div v-for="note in notes" :key="note.id" class="note-item q-mb-md">
      <div class="row items-center q-mb-xs">
        <q-avatar size="30px" color="grey-3" text-color="grey-7" class="q-mr-sm">
          <span style="font-size: 10px">{{ initials(note.userName) }}</span>
        </q-avatar>
        <span class="text-weight-medium text-body2">{{ note.userName }}</span>
        <q-space />
        <span class="text-caption text-grey-5">{{ formatDateTime(note.createdAt) }}</span>
        <q-btn flat dense round icon="more_vert" size="xs" color="grey-5" class="q-ml-xs">
          <q-menu>
            <q-list dense style="min-width: 120px">
              <q-item clickable v-close-popup @click="startEditNote(note)">
                <q-item-section avatar><q-icon name="edit" size="16px" /></q-item-section>
                <q-item-section>Edit</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="deleteNote(note)">
                <q-item-section avatar><q-icon name="delete" size="16px" color="negative" /></q-item-section>
                <q-item-section class="text-negative">Delete</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
      <!-- Edit mode -->
      <div v-if="editingNoteId === note.id">
        <q-input
          v-model="editingNoteContent"
          type="textarea"
          outlined
          autogrow
          dense
          class="note-input q-mb-xs"
        />
        <div class="row justify-end q-gutter-xs">
          <q-btn flat dense no-caps label="Cancel" color="grey-6" @click="editingNoteId = null" />
          <q-btn unelevated dense no-caps label="Save" color="primary" class="rounded-btn" @click="saveEditNote(note)" />
        </div>
      </div>
      <!-- View mode -->
      <div v-else class="text-body2 text-grey-8 note-body">{{ note.body }}</div>
      <div v-if="note.editedAt" class="text-caption text-grey-4 q-mt-xs" style="font-size: 10px">(edited)</div>
    </div>
  </q-tab-panel>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

interface NoteItem {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
  editedAt?: string;
}

const props = defineProps<{
  leadId: string;
  notes: NoteItem[];
}>();

const emit = defineEmits<{
  (e: 'noteAdded', note: NoteItem): void;
  (e: 'noteUpdated', note: NoteItem): void;
  (e: 'noteDeleted', noteId: string): void;
}>();

const $q = useQuasar();
const newNote = ref('');
const savingNote = ref(false);
const editingNoteId = ref<string | null>(null);
const editingNoteContent = ref('');

async function saveNote() {
  if (!newNote.value.trim()) return;
  savingNote.value = true;
  try {
    const { data } = await api.post(`/leads/${props.leadId}/notes`, { content: newNote.value.trim() });
    const noteItem: NoteItem = {
      id: data.id ?? crypto.randomUUID(),
      body: newNote.value.trim(),
      userName: data.userName ?? 'You',
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    emit('noteAdded', noteItem);
    newNote.value = '';
    $q.notify({ type: 'positive', message: 'Note saved' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save note' });
  } finally {
    savingNote.value = false;
  }
}

function startEditNote(note: NoteItem) {
  editingNoteId.value = note.id;
  editingNoteContent.value = note.body;
}

async function saveEditNote(note: NoteItem) {
  if (!editingNoteContent.value.trim()) return;
  try {
    await api.put(`/leads/${props.leadId}/notes/${note.id}`, { content: editingNoteContent.value.trim() });
    emit('noteUpdated', {
      ...note,
      body: editingNoteContent.value.trim(),
      editedAt: new Date().toISOString(),
    });
    editingNoteId.value = null;
    $q.notify({ type: 'positive', message: 'Note updated' });
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update note' });
  }
}

async function deleteNote(note: NoteItem) {
  $q.dialog({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note? This will be logged in the activity.',
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.patch(`/leads/${props.leadId}/notes/${note.id}/delete`);
      emit('noteDeleted', note.id);
      $q.notify({ type: 'positive', message: 'Note deleted' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete note' });
    }
  });
}

function formatDateTime(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style lang="scss" scoped>
.note-input {
  :deep(.q-field__control) {
    border-radius: 10px;
  }
}

.note-item {
  padding: 12px;
  background: #F9FAFB;
  border-radius: 10px;
}

.note-body {
  padding-left: 34px;
  white-space: pre-wrap;
}

.rounded-btn {
  border-radius: 10px;
}
</style>
