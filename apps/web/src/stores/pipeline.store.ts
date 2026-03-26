import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';

export interface PipelineLead {
  id: string;
  customerName: string;
  leadScore: number;
  leadSource: string;
  stage: string;
  owner?: string;
  projectManager?: string;
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
    pipelineId?: string;
    source?: string;
    assignedTo?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    loading.value = true;
    try {
      const { data } = await api.get('/pipeline', { params });
      // API returns array of stages directly, not { stages: [...] }
      const rawStages = Array.isArray(data) ? data : data.stages ?? [];
      const stages: PipelineStage[] = rawStages.map((s: any) => ({
        id: s.stage,
        name: s.label || s.stage,
        color: s.color || '#6B7280',
        order: s.order ?? 0,
        leads: (s.leads ?? []).map((l: any) => {
          const assignments = l.assignments ?? [];
          const primary = assignments.find((a: any) => a.isPrimary);
          const ownerUser = primary?.user;
          const pmUser = l.projectManager;
          return {
            id: l.id,
            customerName: l.customer
              ? `${l.customer.firstName} ${l.customer.lastName}`
              : 'Unknown',
            leadScore: Number(l.leadScore?.total ?? l.leadScore?.totalScore ?? l.score?.totalScore ?? l.score?.total ?? 0),
            leadSource: l.source ?? '',
            stage: l.currentStage ?? s.stage,
            owner: ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : undefined,
            ownerId: primary?.userId ?? null,
            projectManager: pmUser ? `${pmUser.firstName} ${pmUser.lastName}` : undefined,
            pmId: l.projectManagerId ?? null,
            assignedTo: ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : undefined,
            createdAt: l.createdAt,
          };
        }),
      }));
      pipelineData.value = { stages };
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
