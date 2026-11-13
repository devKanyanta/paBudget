CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Place_name_trgm_idx" ON "Place" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "MenuItem_name_trgm_idx" ON "MenuItem" USING GIN ("name" gin_trgm_ops);
