import { db } from './index.ts';
import { executiveTasks, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getTasksByUserUid(uid: string) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) return [];

    return await db
      .select()
      .from(executiveTasks)
      .where(eq(executiveTasks.userId, user[0].id))
      .orderBy(desc(executiveTasks.createdAt));
  } catch (error) {
    console.error('Database query failed in getTasksByUserUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createTaskForUser(
  uid: string,
  task: {
    title: string;
    priority?: string;
    category?: string;
    dueDate?: string;
  }
) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) throw new Error('User record not found in database');

    const result = await db
      .insert(executiveTasks)
      .values({
        userId: user[0].id,
        title: task.title,
        priority: task.priority || 'medium',
        category: task.category || 'operations',
        completed: 'false',
        dueDate: task.dueDate || null,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in createTaskForUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function updateTaskCompletion(taskId: number, completed: boolean) {
  try {
    const result = await db
      .update(executiveTasks)
      .set({ completed: completed ? 'true' : 'false' })
      .where(eq(executiveTasks.id, taskId))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error('Database query failed in updateTaskCompletion:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
