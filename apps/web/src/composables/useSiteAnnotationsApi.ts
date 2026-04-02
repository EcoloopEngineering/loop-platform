import { api } from '@/boot/axios';
import type { SiteAnnotation } from '@/types/api';

export function useSiteAnnotationsApi() {
  async function fetchAnnotations(leadId: string): Promise<SiteAnnotation[]> {
    try {
      const { data } = await api.get<SiteAnnotation[]>(`/leads/${leadId}/annotations`);
      return data;
    } catch {
      return [];
    }
  }

  async function createAnnotation(
    leadId: string,
    payload: Omit<SiteAnnotation, 'id' | 'leadId' | 'createdAt'>,
  ): Promise<SiteAnnotation | null> {
    try {
      const { data } = await api.post<SiteAnnotation>(`/leads/${leadId}/annotations`, payload);
      return data;
    } catch {
      return null;
    }
  }

  async function updateAnnotation(
    leadId: string,
    annotationId: string,
    payload: Partial<Omit<SiteAnnotation, 'id' | 'leadId' | 'createdAt'>>,
  ): Promise<SiteAnnotation | null> {
    try {
      const { data } = await api.patch<SiteAnnotation>(
        `/leads/${leadId}/annotations/${annotationId}`,
        payload,
      );
      return data;
    } catch {
      return null;
    }
  }

  async function deleteAnnotation(leadId: string, annotationId: string): Promise<boolean> {
    try {
      await api.delete(`/leads/${leadId}/annotations/${annotationId}`);
      return true;
    } catch {
      return false;
    }
  }

  return { fetchAnnotations, createAnnotation, updateAnnotation, deleteAnnotation };
}
