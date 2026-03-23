import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  HubSpotDeal,
  HubSpotContact,
  HubSpotDealResponse,
  HubSpotContactResponse,
} from './hubspot.types';
import { HubSpotMapper } from './hubspot.mapper';

@Injectable()
export class HubSpotSyncService {
  private readonly logger = new Logger(HubSpotSyncService.name);
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('HUBSPOT_SERVICE_URL', '');
    this.token = this.config.get<string>('HUBSPOT_SERVICE_TOKEN', '');
  }

  async pushLead(
    lead: { id: string; currentStage: string; kw?: number | null; epc?: number | null; systemSize?: number | null },
    customer: { firstName: string; lastName: string; email?: string | null; phone?: string | null },
    property: { streetAddress: string; city: string; state: string; zip: string },
  ): Promise<HubSpotDeal> {
    try {
      const dealProperties = {
        ...HubSpotMapper.toDealProperties(lead),
        address: `${property.streetAddress}, ${property.city}, ${property.state} ${property.zip}`,
        contact_name: `${customer.firstName} ${customer.lastName}`,
      };

      const { data } = await firstValueFrom(
        this.http.post<HubSpotDealResponse>(
          `${this.baseUrl}/crm/v3/objects/deals`,
          { properties: dealProperties },
          { headers: this.headers() },
        ),
      );
      return HubSpotMapper.toDeal(data);
    } catch (error) {
      this.logger.error(`Failed to push lead ${lead.id} to HubSpot`, error);
      throw error;
    }
  }

  async pullDeal(hubspotDealId: string): Promise<HubSpotDeal> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<HubSpotDealResponse>(
          `${this.baseUrl}/crm/v3/objects/deals/${hubspotDealId}`,
          { headers: this.headers() },
        ),
      );
      return HubSpotMapper.toDeal(data);
    } catch (error) {
      this.logger.error(`Failed to pull HubSpot deal ${hubspotDealId}`, error);
      throw error;
    }
  }

  async pushContact(customer: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<HubSpotContact> {
    try {
      const contactProperties = HubSpotMapper.toContactProperties(customer);

      const { data } = await firstValueFrom(
        this.http.post<HubSpotContactResponse>(
          `${this.baseUrl}/crm/v3/objects/contacts`,
          { properties: contactProperties },
          { headers: this.headers() },
        ),
      );
      return HubSpotMapper.toContact(data);
    } catch (error) {
      this.logger.error('Failed to push contact to HubSpot', error);
      throw error;
    }
  }

  async syncLeadStage(leadId: string, stage: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch(
          `${this.baseUrl}/crm/v3/objects/deals/${leadId}`,
          { properties: { dealstage: stage } },
          { headers: this.headers() },
        ),
      );
      this.logger.log(`Synced lead ${leadId} stage to ${stage} in HubSpot`);
    } catch (error) {
      this.logger.error(`Failed to sync lead stage for ${leadId}`, error);
      throw error;
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}
