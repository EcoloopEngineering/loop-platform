import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface PipelineLead {
  id: string;
  customerName: string;
  leadScore: number;
  leadSource: string;
  stage: string;
  assignedTo?: string;
  createdAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  leads: PipelineLead[];
}

export interface PipelineView {
  stages: PipelineStage[];
}

export const usePipelineStore = defineStore('pipeline', () => {
  const pipelineData = ref<PipelineView | null>(null);
  const loading = ref(false);

  async function fetchPipelineView(params?: {
    source?: string;
    assignedTo?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    loading.value = true;
    try {
      const { data } = await api.get<PipelineView>('/pipeline', { params });
      pipelineData.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function moveLeadStage(leadId: string, fromStage: string, toStage: string) {
    await api.patch(`/leads/${leadId}`, { stage: toStage });
    if (!pipelineData.value) return;

    const from = pipelineData.value.stages.find((s) => s.id === fromStage);
    const to = pipelineData.value.stages.find((s) => s.id === toStage);
    if (!from || !to) return;

    const leadIdx = from.leads.findIndex((l) => l.id === leadId);
    if (leadIdx < 0) return;

    const [lead] = from.leads.splice(leadIdx, 1);
    lead.stage = toStage;
    to.leads.push(lead);
  }

  return {
    pipelineData,
    loading,
    fetchPipelineView,
    moveLeadStage,
  };
});
