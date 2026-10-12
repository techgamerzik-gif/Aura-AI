import { db } from './index.ts';
import { executiveEvents, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getEventsByUserUid(uid: string) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) return [];

    return await db
      .select()
      .from(executiveEvents)
      .where(eq(executiveEvents.userId, user[0].id))
      .orderBy(desc(executiveEvents.createdAt));
  } catch (error) {
    console.error('Database query failed in getEventsByUserUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createEventForUser(
  uid: string,
  event: {
    title: string;
    timeStart: string;
    timeEnd: string;
    date: string;
    location?: string;
    category?: string;
    priority?: string;
    conflict?: string;
    conflictReason?: string;
    notes?: string;
  }
) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) throw new Error('User record not found in database');

    const result = await db
      .insert(executiveEvents)
      .values({
        userId: user[0].id,
        title: event.title,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        date: event.date,
        location: event.location || 'Executive Suite',
        category: event.category || 'board',
        priority: event.priority || 'high',
        conflict: event.conflict || 'false',
        conflictReason: event.conflictReason || null,
        notes: event.notes || null,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in createEventForUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
