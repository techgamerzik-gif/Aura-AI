import { db } from './index.ts';
import { executiveDocs, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getDocsByUserUid(uid: string) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) return [];

    return await db
      .select()
      .from(executiveDocs)
      .where(eq(executiveDocs.userId, user[0].id))
      .orderBy(desc(executiveDocs.createdAt));
  } catch (error) {
    console.error('Database query failed in getDocsByUserUid:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function createDocForUser(
  uid: string,
  doc: {
    title: string;
    docType: string;
    content: string;
  }
) {
  try {
    const user = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!user.length) throw new Error('User record not found in database');

    const result = await db
      .insert(executiveDocs)
      .values({
        userId: user[0].id,
        title: doc.title,
        docType: doc.docType,
        content: doc.content,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in createDocForUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
