<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <h5 class="q-my-none text-weight-bold col">My Forms</h5>
      <q-btn
        color="primary"
        unelevated
        no-caps
        icon="add"
        label="New Form"
        class="rounded-btn"
        @click="$router.push('/forms/new')"
      />
    </div>

    <div v-if="loading" class="row justify-center q-pa-xl">
      <q-spinner-dots color="primary" size="40px" />
    </div>

    <template v-else-if="forms.length">
      <q-card
        v-for="form in forms"
        :key="form.id"
        flat
        bordered
        class="rounded-card q-mb-sm"
      >
        <q-card-section class="row items-center no-wrap">
          <div class="col">
            <div class="text-subtitle2 text-weight-bold">{{ form.title }}</div>
            <div class="text-caption text-grey-6">
              {{ form.viewCount }} views
              <span class="q-mx-xs">|</span>
              {{ form.submissionCount }} submissions
            </div>
          </div>

          <q-btn
            flat
            dense
            round
            icon="content_copy"
            @click="copyFormLink(form)"
          >
            <q-tooltip>Copy link</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            round
            icon="edit"
            @click="$router.push(`/forms/${form.id}/edit`)"
          >
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
        </q-card-section>
      </q-card>
    </template>

    <div v-else class="text-grey-6 text-center q-pa-xl">
      You haven't created any forms yet.
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { api } from '@/boot/axios';

interface PublicForm {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  submissionCount: number;
}

const $q = useQuasar();
const forms = ref<PublicForm[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const { data } = await api.get<PublicForm[]>('/forms');
    forms.value = data;
  } catch {
    // Empty state
  } finally {
    loading.value = false;
  }
});

async function copyFormLink(form: PublicForm) {
  const url = `${window.location.origin}/f/${form.slug}`;
  try {
    await navigator.clipboard.writeText(url);
    $q.notify({ type: 'positive', message: 'Form link copied!' });
  } catch {
    // Fallback
  }
}
</script>

<style lang="scss" scoped>
.rounded-card {
  border-radius: 12px;
}
.rounded-btn {
  border-radius: 10px;
}
</style>
