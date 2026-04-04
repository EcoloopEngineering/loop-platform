-- CreateTable
CREATE TABLE "lead_chats" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lead_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_chats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_chats_lead_id_created_at_idx" ON "lead_chats"("lead_id", "created_at");

-- AddForeignKey
ALTER TABLE "lead_chats" ADD CONSTRAINT "lead_chats_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_chats" ADD CONSTRAINT "lead_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
