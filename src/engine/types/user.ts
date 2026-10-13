export type UserRole = 'user' | 'guest' | 'admin';

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: number;
  lastActiveAt: number;
}

export interface TableMember {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  seat?: number | 'all' | 'spectator';
  joinedAt: number;
  isCreator?: boolean;
}

export interface RegisteredUserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: number;
  updatedAt?: number;
}

export interface StoredUserAccount extends RegisteredUserProfile {
  salt: string;
  passwordHash: string;
}
