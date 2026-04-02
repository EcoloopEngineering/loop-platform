<template>
  <div>
    <div class="row items-center q-mb-md">
      <span class="text-subtitle2 text-weight-bold col">Documents</span>
      <q-btn
        unelevated
        no-caps
        color="primary"
        size="sm"
        icon="upload_file"
        label="Upload"
        class="rounded-btn"
        @click="uploadFile"
      />
    </div>

    <q-list v-if="documents.length" separator class="file-list">
      <q-item v-for="file in documents" :key="file.id" class="file-item">
        <q-item-section avatar>
          <q-icon :name="fileIcon(file.name)" :color="fileIconColor(file.name)" size="24px" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ file.name }}</q-item-label>
          <q-item-label caption>{{ formatFileSize(file.size) }} · {{ formatDate(file.createdAt ?? '') }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row no-wrap q-gutter-xs">
            <q-btn flat dense round icon="download" color="grey-7" @click="downloadFile(file)">
              <q-tooltip>Download</q-tooltip>
            </q-btn>
            <q-btn flat dense round icon="delete_outline" color="red-4" @click="deleteFile(file)">
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else class="text-grey-6 text-center q-pa-lg">
      No documents uploaded yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';
import { API_URL } from '@/config/api';

interface FileItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  createdAt?: string;
  uploadedAt?: string;
}

const props = defineProps<{
  leadId: string;
  documents: FileItem[];
}>();

const emit = defineEmits<{
  (e: 'fileAdded', file: FileItem): void;
  (e: 'fileDeleted', fileId: string): void;
}>();

const $q = useQuasar();
const apiBaseUrl = API_URL;

function uploadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.heic,.svg,.xls,.xlsx,.csv,.txt';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('leadId', props.leadId);
    form.append('documentType', 'OTHER');
    try {
      const { data } = await api.post<FileItem>('/documents/upload', form);
      emit('fileAdded', data);
      $q.notify({ type: 'positive', message: 'File uploaded' });
    } catch {
      $q.notify({ type: 'negative', message: 'Upload failed' });
    }
  };
  input.click();
}

function downloadFile(file: FileItem) {
  window.open(`${apiBaseUrl}${file.url}`, '_blank');
}

function deleteFile(file: FileItem) {
  $q.dialog({
    title: 'Delete File',
    message: `Delete "${file.name}"? This will be logged in the activity.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', flat: true },
  }).onOk(async () => {
    try {
      await api.delete(`/documents/${file.id}`);
      emit('fileDeleted', file.id);
      $q.notify({ type: 'positive', message: 'File deleted' });
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to delete file' });
    }
  });
}

function fileIcon(name: string) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'image';
  if (['pdf'].includes(ext ?? '')) return 'picture_as_pdf';
  if (['doc', 'docx'].includes(ext ?? '')) return 'description';
  return 'insert_drive_file';
}

function fileIconColor(name: string) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'purple';
  if (['pdf'].includes(ext ?? '')) return 'red';
  if (['doc', 'docx'].includes(ext ?? '')) return 'blue';
  return 'grey-6';
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<style lang="scss" scoped>
.file-list {
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  overflow: hidden;
}

.file-item {
  transition: background 0.15s;

  &:hover {
    background: #F9FAFB;
  }
}

.rounded-btn {
  border-radius: 10px;
}
</style>
