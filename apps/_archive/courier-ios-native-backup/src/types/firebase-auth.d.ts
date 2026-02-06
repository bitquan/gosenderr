declare module 'firebase/auth' {
  export type Auth = any;
  export function getAuth(app?: any): any;
  export function initializeAuth(app: any, deps?: any): any;
  export function getReactNativePersistence(storage: any): any;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function signOut(auth: any): Promise<void>;
}
