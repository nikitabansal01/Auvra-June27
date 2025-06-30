import bcrypt from 'bcrypt';

export class AdminAuthService {
  async createAdminUser(username: string, password: string, email: string) {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }

  async validateAdmin(username: string, password: string) {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }

  async getSystemMetrics() {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }

  async saveMetrics() {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }

  async getMetricsHistory(days: number = 30) {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }

  async getAllUsers() {
    throw new Error('Admin features are not available in Firestore-only mode.');
  }
}

export const adminAuthService = new AdminAuthService();