-- CreateIndex
CREATE INDEX "leads_created_by_id_idx" ON "leads"("created_by_id");

-- CreateIndex
CREATE INDEX "leads_project_manager_id_idx" ON "leads"("project_manager_id");

-- CreateIndex
CREATE INDEX "lead_activities_user_id_idx" ON "lead_activities"("user_id");

-- CreateIndex
CREATE INDEX "gamification_events_user_id_created_at_idx" ON "gamification_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "gamification_events_event_type_created_at_idx" ON "gamification_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "commission_payments_lead_id_user_id_type_idx" ON "commission_payments"("lead_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "lead_assignments_lead_id_is_primary_idx" ON "lead_assignments"("lead_id", "is_primary");

-- CreateIndex
CREATE INDEX "appointments_lead_id_status_idx" ON "appointments"("lead_id", "status");
