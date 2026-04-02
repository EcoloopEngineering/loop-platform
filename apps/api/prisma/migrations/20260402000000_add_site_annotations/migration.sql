-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('TREE_REMOVAL', 'SHADE_AREA', 'OBSTACLE', 'PANEL_PLACEMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AnnotationGeometryType" AS ENUM ('POINT', 'POLYGON', 'LINE');

-- CreateTable
CREATE TABLE "site_annotations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "lead_id" UUID NOT NULL,
    "type" "AnnotationType" NOT NULL,
    "geometry_type" "AnnotationGeometryType" NOT NULL,
    "coordinates" JSONB NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "color" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_annotations_lead_id_idx" ON "site_annotations"("lead_id");

-- AddForeignKey
ALTER TABLE "site_annotations" ADD CONSTRAINT "site_annotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_annotations" ADD CONSTRAINT "site_annotations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
