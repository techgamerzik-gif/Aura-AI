import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors.ts';
import { ScheduleEvent, TaskItem } from '../types/assistant.ts';

// 1. User Profile Sync
export async function syncUserProfileToFirestore(
  userId: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  const path = `users/${userId}`;
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        userId,
        email,
        displayName: displayName || null,
        photoUrl: photoUrl || null,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Executive Events Firestore Sync
export async function saveEventToFirestore(event: ScheduleEvent) {
  const user = auth.currentUser;
  if (!user) return;
  const eventId = event.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `events/${eventId}`;

  try {
    await setDoc(doc(db, 'events', eventId), {
      userId: user.uid,
      title: event.title.substring(0, 300),
      timeStart: event.timeStart,
      timeEnd: event.timeEnd,
      date: event.date,
      location: event.location || 'Executive Suite',
      category: event.category || 'board',
      priority: event.priority || 'high',
      conflict: !!event.conflict,
      conflictReason: event.conflictReason || '',
      notes: event.notes || '',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserEvents(
  userId: string,
  onUpdate: (events: ScheduleEvent[]) => void
) {
  const q = query(collection(db, 'events'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ScheduleEvent[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          timeStart: data.timeStart,
          timeEnd: data.timeEnd,
          date: data.date,
          location: data.location || '',
          category: data.category || 'board',
          priority: data.priority || 'high',
          attendees: [],
          conflict: data.conflict,
          conflictReason: data.conflictReason,
          notes: data.notes,
        };
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    }
  );
}

// 3. Executive Tasks Firestore Sync
export async function saveTaskToFirestore(task: TaskItem) {
  const user = auth.currentUser;
  if (!user) return;
  const taskId = task.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `tasks/${taskId}`;

  try {
    await setDoc(doc(db, 'tasks', taskId), {
      userId: user.uid,
      title: task.title.substring(0, 300),
      priority: task.priority || 'medium',
      category: task.category || 'operations',
      completed: task.status === 'automated_completed',
      dueDate: task.deadline || '',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserTasks(
  userId: string,
  onUpdate: (tasks: TaskItem[]) => void
) {
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: TaskItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          assignee: 'Executive AI',
          deadline: data.dueDate || 'Today',
          priority: data.priority || 'medium',
          status: data.completed ? 'automated_completed' : 'pending',
          category: data.category || 'operations',
        };
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    }
  );
}

// 4. Strategic Documents & Memos Firestore Sync
export async function saveDocToFirestore(title: string, docType: string, content: string) {
  const user = auth.currentUser;
  if (!user) return;
  const docId = `doc_${Date.now()}`;
  const path = `docs/${docId}`;

  try {
    await setDoc(doc(db, 'docs', docId), {
      userId: user.uid,
      title: title.substring(0, 300),
      docType: docType.substring(0, 100),
      content: content.substring(0, 500000),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
