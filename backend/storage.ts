import { users, onboardingData, chatMessages, dailyMealPlans, dailyFeedback, progressTracking, type User, type InsertUser, type OnboardingData, type InsertOnboardingData, type ChatMessage, type InsertChatMessage, type DailyMealPlan, type InsertDailyMealPlan, type DailyFeedback, type InsertDailyFeedback, type ProgressTracking, type InsertProgressTracking } from "../shared/schema";
import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Onboarding
  getOnboardingData(userId: number): Promise<OnboardingData | undefined>;
  saveOnboardingData(data: InsertOnboardingData): Promise<OnboardingData>;

  // Chat messages
  getChatHistory(userId: number): Promise<ChatMessage[]>;
  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatHistory(userId: number): Promise<void>;

  // Daily meal plans
  getDailyMealPlan(userId: number, date: string): Promise<DailyMealPlan | undefined>;
  saveDailyMealPlan(plan: InsertDailyMealPlan): Promise<DailyMealPlan>;
  
  // Daily feedback
  getDailyFeedback(userId: number, date: string): Promise<DailyFeedback | undefined>;
  saveDailyFeedback(feedback: InsertDailyFeedback): Promise<DailyFeedback>;
  
  // Progress tracking
  getProgressTracking(userId: number, date: string): Promise<ProgressTracking | undefined>;
  saveProgressTracking(progress: InsertProgressTracking): Promise<ProgressTracking>;
  getUserProgressHistory(userId: number, days: number): Promise<ProgressTracking[]>;
}

if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const db = getFirestore();

export class FirestoreStorage implements IStorage {
  // User management (Firestore implementation)
  async getUser(id: number): Promise<User | undefined> {
    const doc = await db.collection("users").doc(String(id)).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    if (data && !data.id) data.id = id;
    return data as User;
  }
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const snapshot = await db.collection("users").where("firebaseUid", "==", firebaseUid).limit(1).get();
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const data = doc.data();
    if (data && !data.id) data.id = Number(doc.id);
    return data as User;
  }
  async createUser(user: InsertUser): Promise<User> {
    // Find the max numeric ID in users collection (simulate auto-increment)
    const snapshot = await db.collection("users").orderBy("id", "desc").limit(1).get();
    let newId = 1;
    if (!snapshot.empty) {
      const maxUser = snapshot.docs[0].data();
      newId = (maxUser.id || 0) + 1;
    }
    const userData = { ...user, id: newId, createdAt: new Date() };
    await db.collection("users").doc(String(newId)).set(userData);
    return userData as User;
  }
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const doc = await db.collection("users").doc(String(id)).get();
    if (!doc.exists) throw new Error("User not found");
    const data = doc.data() as User;
    const updatedData = { ...data, ...updates };
    await db.collection("users").doc(String(id)).set(updatedData);
    return updatedData as User;
  }

  // Onboarding
  async getOnboardingData(userId: number): Promise<OnboardingData | undefined> {
    const id = typeof userId === 'string' ? Number(userId) : userId;
    console.log('[FirestoreStorage] getOnboardingData for userId:', id);
    const doc = await db.collection("onboarding").doc(String(id)).get();
    if (!doc.exists) {
      console.warn('[FirestoreStorage] No onboarding data found for userId:', id);
      return undefined;
    }
    const data = doc.data();
    if (data && data.userId && !data.id) data.id = id;
    return data as OnboardingData;
  }
  async saveOnboardingData(data: InsertOnboardingData): Promise<OnboardingData> {
    const id = typeof data.userId === 'string' ? Number(data.userId) : data.userId;
    console.log('[FirestoreStorage] saveOnboardingData for userId:', id, 'Payload:', data);
    await db.collection("onboarding").doc(String(id)).set(data, { merge: true });
    const doc = await db.collection("onboarding").doc(String(id)).get();
    const result = doc.data() || {};
    if (!result.id) result.id = id;
    return result as OnboardingData;
  }

  // Chat messages
  async getChatHistory(userId: number): Promise<ChatMessage[]> {
    const id = typeof userId === 'string' ? Number(userId) : userId;
    console.log('[FirestoreStorage] getChatHistory for userId:', id);
    const snapshot = await db.collection("chatMessages")
      .where("userId", "==", id)
      .orderBy("createdAt", "asc")
      .get();
    return snapshot.docs.map((doc, idx) => {
      const data = doc.data();
      if (!data.id) data.id = idx + 1;
      return data as ChatMessage;
    });
  }
  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = typeof message.userId === 'string' ? Number(message.userId) : message.userId;
    console.log('[FirestoreStorage] saveChatMessage for userId:', id, 'Payload:', message);
    const docRef = await db.collection("chatMessages").add({
      ...message,
      userId: id,
      createdAt: new Date()
    });
    const doc = await docRef.get();
    const data = doc.data() || {};
    if (!data.id) data.id = doc.id;
    return data as ChatMessage;
  }
  async clearChatHistory(userId: number): Promise<void> {
    const snapshot = await db.collection("chatMessages").where("userId", "==", userId).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // Daily meal plans
  async getDailyMealPlan(userId: number, date: string): Promise<DailyMealPlan | undefined> {
    throw new Error('Not implemented');
  }
  async saveDailyMealPlan(plan: InsertDailyMealPlan): Promise<DailyMealPlan> {
    throw new Error('Not implemented');
  }
  
  // Daily feedback
  async getDailyFeedback(userId: number, date: string): Promise<DailyFeedback | undefined> {
    throw new Error('Not implemented');
  }
  async saveDailyFeedback(feedback: InsertDailyFeedback): Promise<DailyFeedback> {
    throw new Error('Not implemented');
  }
  
  // Progress tracking
  async getProgressTracking(userId: number, date: string): Promise<ProgressTracking | undefined> {
    throw new Error('Not implemented');
  }
  async saveProgressTracking(progress: InsertProgressTracking): Promise<ProgressTracking> {
    throw new Error('Not implemented');
  }
  async getUserProgressHistory(userId: number, days: number): Promise<ProgressTracking[]> {
    throw new Error('Not implemented');
  }
}

export const storage = new FirestoreStorage();
