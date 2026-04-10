import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const shares = sqliteTable("shares", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["file", "folder"] }).notNull(),
  passwordHash: text("password_hash"),
  expiresAt: integer("expires_at").notNull(),
  maxDownloads: integer("max_downloads"),
  downloadCount: integer("download_count").notNull().default(0),
  totalSize: integer("total_size").notNull().default(0),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  createdBy: text("created_by").notNull(),
  s3Prefix: text("s3_prefix").notNull(),
});

export const shareFiles = sqliteTable("share_files", {
  id: text("id").primaryKey(),
  shareId: text("share_id")
    .notNull()
    .references(() => shares.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  s3Key: text("s3_key").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});
