export type AuthProvider = 'firebase' | 'mock';

export type AuthSession = {
  uid: string;
  email: string;
  displayName: string;
  token: string;
  provider: AuthProvider;
};
