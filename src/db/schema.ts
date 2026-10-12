import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Executive Schedule Events
export const executiveEvents = pgTable('executive_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  timeStart: text('time_start').notNull(),
  timeEnd: text('time_end').notNull(),
  date: text('date').notNull(),
  location: text('location').default('Executive Suite'),
  category: text('category').default('board'),
  priority: text('priority').default('high'),
  conflict: text('conflict').default('false'),
  conflictReason: text('conflict_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Executive Tasks
export const executiveTasks = pgTable('executive_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  priority: text('priority').default('medium'),
  category: text('category').default('operations'),
  completed: text('completed').default('false'),
  dueDate: text('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generated Strategic Documents & Memos
export const executiveDocs = pgTable('executive_docs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  docType: text('doc_type').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Connected Ecosystem Telemetry (Tesla, Smart Home, Biometrics)
export const ecosystemTelemetry = pgTable('ecosystem_telemetry', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  carBattery: integer('car_battery').default(84),
  carCabinTemp: integer('car_cabin_temp').default(21),
  carLocked: text('car_locked').default('true'),
  homeSecurityArmed: text('home_security_armed').default('true'),
  homeHvacTemp: integer('home_hvac_temp').default(22),
  readinessScore: integer('readiness_score').default(89),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  events: many(executiveEvents),
  tasks: many(executiveTasks),
  docs: many(executiveDocs),
  telemetry: many(ecosystemTelemetry),
}));

export const eventsRelations = relations(executiveEvents, ({ one }) => ({
  user: one(users, {
    fields: [executiveEvents.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(executiveTasks, ({ one }) => ({
  user: one(users, {
    fields: [executiveTasks.userId],
    references: [users.id],
  }),
}));

export const docsRelations = relations(executiveDocs, ({ one }) => ({
  user: one(users, {
    fields: [executiveDocs.userId],
    references: [users.id],
  }),
}));

export const telemetryRelations = relations(ecosystemTelemetry, ({ one }) => ({
  user: one(users, {
    fields: [ecosystemTelemetry.userId],
    references: [users.id],
  }),
}));
