-- Remove HubSpot integration columns and indices

DROP INDEX IF EXISTS "customers_hubspot_contact_id_key";
DROP INDEX IF EXISTS "leads_hubspot_deal_id_key";

ALTER TABLE "customers" DROP COLUMN IF EXISTS "hubspot_contact_id";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "hubspot_deal_id";
