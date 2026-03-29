import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/boot/axios';
import type { PipelineLead, PipelineStage, PipelineView } from '@/types/api';

export type { PipelineLead, PipelineStage, PipelineView };

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
      interface RawAssignment {
        isPrimary: boolean;
        userId?: string;
        user?: { firstName: string; lastName: string };
      }
      interface RawLead {
        id: string;
        customer?: { firstName: string; lastName: string };
        leadScore?: { total?: number; totalScore?: number };
        score?: { totalScore?: number; total?: number };
        source?: string;
        currentStage?: string;
        assignments?: RawAssignment[];
        projectManager?: { firstName: string; lastName: string };
        projectManagerId?: string | null;
        createdAt: string;
      }
      interface RawStage {
        stage: string;
        label?: string;
        color?: string;
        order?: number;
        leads?: RawLead[];
      }
      const stages: PipelineStage[] = (rawStages as RawStage[]).map((s) => ({
        id: s.stage,
        name: s.label || s.stage,
        color: s.color || '#6B7280',
        order: s.order ?? 0,
        leads: (s.leads ?? []).map((l) => {
          const assignments = l.assignments ?? [];
          const primary = assignments.find((a) => a.isPrimary);
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
