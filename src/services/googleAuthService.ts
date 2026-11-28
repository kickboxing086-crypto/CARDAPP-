import {
  GoogleAuthProvider,
  signInWithPopup,
  User,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';

const firebaseGoogleProvider = new GoogleAuthProvider();
firebaseGoogleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Login Firebase Auth padrão apenas para sincronização opcional do Administrador Geral
export const googleFirebaseSignIn = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, firebaseGoogleProvider);
    return result.user;
  } catch (error: any) {
    console.error('[Firebase Auth] Erro de autenticação:', error);
    throw error;
  }
};

export const googleLogout = async () => {
  await signOut(auth);
};
