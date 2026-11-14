import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkForce2UpgradeSchema1710000000001 implements MigrationInterface {
  name = 'WorkForce2UpgradeSchema1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. ai_conversations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" varchar(255) NOT NULL DEFAULT 'New Conversation',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_conversations_user_id" ON "ai_conversations" ("user_id");
    `);

    // 2. ai_messages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE,
        "role" varchar(50) NOT NULL,
        "content" text NOT NULL,
        "tool_calls" jsonb,
        "tool_results" jsonb,
        "tokens_used" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ai_messages_conv_created" ON "ai_messages" ("conversation_id", "created_at");
    `);

    // 3. worker_documents
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "worker_documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "worker_id" uuid NOT NULL REFERENCES "workers"("id") ON DELETE CASCADE,
        "document_type" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "document_number" varchar(100),
        "file_name" varchar(255) NOT NULL,
        "file_path" varchar(500) NOT NULL,
        "file_size" integer,
        "mime_type" varchar(100),
        "issue_date" date,
        "expiry_date" date,
        "verification_status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "verified_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "notes" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_worker_documents_worker_type" ON "worker_documents" ("worker_id", "document_type");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_worker_documents_expiry" ON "worker_documents" ("expiry_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "worker_documents" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_conversations" CASCADE;`);
  }
}
