import {
  AuroraProjectResponse,
  AuroraProject,
  AuroraDesignResponse,
  AuroraDesign,
  AuroraDesignStatusResponse,
  AuroraDesignStatus,
} from './aurora.types';

export class AuroraMapper {
  static toProject(raw: AuroraProjectResponse): AuroraProject {
    return {
      projectId: raw.project_id,
      name: raw.name,
      status: raw.status,
      createdAt: new Date(raw.created_at),
    };
  }

  static toDesign(raw: AuroraDesignResponse): AuroraDesign {
    return {
      designId: raw.design_id,
      projectId: raw.project_id,
      systemSizeKw: raw.system_size_kw,
      annualProductionKwh: raw.annual_production_kwh,
      panelCount: raw.panel_count,
      imageUrl: raw.image_url,
      status: raw.status,
      createdAt: new Date(raw.created_at),
    };
  }

  static toDesignStatus(raw: AuroraDesignStatusResponse): AuroraDesignStatus {
    return {
      projectId: raw.project_id,
      status: raw.status,
      progressPct: raw.progress_pct,
    };
  }
}
