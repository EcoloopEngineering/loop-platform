import {
  HubSpotDealResponse,
  HubSpotDeal,
  HubSpotContactResponse,
  HubSpotContact,
  HubSpotDealProperties,
  HubSpotContactProperties,
} from './hubspot.types';

export class HubSpotMapper {
  // ---- API response -> domain ----

  static toDeal(raw: HubSpotDealResponse): HubSpotDeal {
    return {
      hubspotDealId: raw.id,
      name: raw.properties.dealname,
      stage: raw.properties.dealstage,
      amount: raw.properties.amount ? Number(raw.properties.amount) : null,
      pipeline: raw.properties.pipeline ?? null,
      closeDate: raw.properties.closedate
        ? new Date(raw.properties.closedate)
        : null,
      leadId: raw.properties.lead_id ?? null,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  static toContact(raw: HubSpotContactResponse): HubSpotContact {
    return {
      hubspotContactId: raw.id,
      firstName: raw.properties.firstname,
      lastName: raw.properties.lastname,
      email: raw.properties.email ?? null,
      phone: raw.properties.phone ?? null,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  // ---- Domain -> API payload ----

  static toDealProperties(lead: {
    id: string;
    currentStage: string;
    kw?: number | null;
    epc?: number | null;
    systemSize?: number | null;
  }): HubSpotDealProperties {
    const props: HubSpotDealProperties = {
      dealname: `Lead ${lead.id}`,
      dealstage: lead.currentStage,
      lead_id: lead.id,
    };
    if (lead.systemSize != null) {
      props.system_size_kw = String(lead.systemSize);
    }
    if (lead.epc != null) {
      props.epc = String(lead.epc);
    }
    return props;
  }

  static toContactProperties(customer: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  }): HubSpotContactProperties {
    const props: HubSpotContactProperties = {
      firstname: customer.firstName,
      lastname: customer.lastName,
    };
    if (customer.email) props.email = customer.email;
    if (customer.phone) props.phone = customer.phone;
    return props;
  }
}
