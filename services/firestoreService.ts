import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, UserProfile } from '../types';

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { ...data });
}

export async function getSubscriptionStatus(userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return false;
  return snap.data().hasPaid === true;
}

export async function getLeads(userId: string): Promise<Lead[]> {
  const q = query(
    collection(db, 'users', userId, 'leads'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      ...data,
      id: d.id,
      timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
    } as Lead;
  });
}

export async function addLead(userId: string, lead: Lead): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'leads', lead.id), {
    ...lead,
    createdAt: serverTimestamp(),
  });
}

export async function updateLead(userId: string, lead: Lead): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'leads', lead.id), { ...lead });
}

export async function deleteLead(userId: string, leadId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'leads', leadId));
}

export async function deleteLeads(userId: string, leadIds: string[]): Promise<void> {
  await Promise.all(leadIds.map(id => deleteDoc(doc(db, 'users', userId, 'leads', id))));
}

export async function deleteAllLeads(userId: string): Promise<void> {
  const snapshot = await getDocs(collection(db, 'users', userId, 'leads'));
  await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
}
