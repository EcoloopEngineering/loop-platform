-- DropIndex
DROP INDEX IF EXISTS "commission_payments_lead_id_user_id_type_idx";

-- CreateIndex (unique)
CREATE UNIQUE INDEX "commission_payments_lead_id_user_id_type_key" ON "commission_payments"("lead_id", "user_id", "type");
