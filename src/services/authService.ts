import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export const authService = {
  async login(email: string, password: string) {
    return await signInWithEmailAndPassword(auth, email, password);
  },
  async register(email: string, password: string) {
    return await createUserWithEmailAndPassword(auth, email, password);
  },
  async logout() {
    return await signOut(auth);
  }
};
