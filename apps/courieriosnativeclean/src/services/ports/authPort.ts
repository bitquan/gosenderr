import type {AuthSession} from '../../types/auth';

export type AuthStateListener = (session: AuthSession | null) => void;
export type AuthStateUnsubscribe = () => void;

export interface AuthServicePort {
  restoreSession: () => Promise<AuthSession | null>;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signOut: () => Promise<void>;
  onAuthStateChanged: (listener: AuthStateListener) => AuthStateUnsubscribe | null;
}
