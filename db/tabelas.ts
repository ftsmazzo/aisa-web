import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  papel: text("papel").notNull().default("gestor"),
  criadoEm: timestamp("criado_em", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessoes = pgTable("sessoes", {
  id: text("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
});
