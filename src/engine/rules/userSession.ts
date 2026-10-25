import { UserSession, UserRole, RegisteredUserProfile, StoredUserAccount } from '../types/user';
import { generateSalt, hashPassword } from './passwordUtils';

const USER_SESSION_KEY = 'eclipse_user_session';
const REGISTERED_USERS_KEY = 'eclipse_registered_users';
const ADMIN_STORAGE_KEY = 'eclipse_admin_credentials';

let memoryUserSession: UserSession | null = null;
const memoryRegisteredUsers: Record<string, StoredUserAccount> = {};
let memoryAdminCredentials: { salt: string; passwordHash: string } | null = null;
const sessionListeners: Array<(user: UserSession) => void> = [];

export function getStoredUserSession(): UserSession | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(USER_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && (parsed.username || parsed.name) && parsed.role) {
          if (!parsed.name) parsed.name = parsed.username;
          if (!parsed.username) parsed.username = parsed.name;
          return parsed as UserSession;
        }
      }
    }
  } catch {}
  return memoryUserSession;
}

export function createGuestUser(customName?: string): UserSession {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const username = customName?.trim() || `Guest-${randomSuffix}`;
  const id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const session: UserSession = {
    id,
    username,
    name: username,
    role: 'guest',
    createdAt: now,
    lastActiveAt: now,
  };
  saveUserSession(session);
  return session;
}

export function getCurrentUser(): UserSession {
  const existing = getStoredUserSession();
  if (existing) {
    return existing;
  }
  return createGuestUser();
}

export function saveUserSession(session: UserSession): void {
  try {
    memoryUserSession = session;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
      window.dispatchEvent(
        new CustomEvent('eclipse_user_changed', { detail: session })
      );
    }
    sessionListeners.forEach((fn) => {
      try {
        fn(session);
      } catch {}
    });
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
}

// Client-side helper to get registered users from localStorage / memory fallback
function getLocalRegisteredUsers(): Record<string, StoredUserAccount> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return memoryRegisteredUsers;
}

function saveLocalRegisteredUsers(users: Record<string, StoredUserAccount>): void {
  try {
    for (const [k, v] of Object.entries(users)) {
      memoryRegisteredUsers[k] = v;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    }
  } catch {}
}

/**
 * Register a new commander account with an encrypted password.
 * Raw password is NEVER stored; only PBKDF2 salt + passwordHash are stored.
 */
export async function registerUser(
  username: string,
  password: string,
  name?: string,
  email?: string,
  emailNotifications?: boolean
): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const cleanUsername = username.trim();
  const cleanName = name?.trim() || cleanUsername;
  const cleanPassword = password;
  const cleanEmail = email?.trim() || undefined;
  const notificationsEnabled = emailNotifications !== false;

  if (!cleanUsername || cleanUsername.length < 2) {
    return { success: false, error: 'Username must be at least 2 characters.' };
  }
  if (!cleanPassword || cleanPassword.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters.' };
  }

  // 1. Try server endpoint
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          name: cleanName,
          password: cleanPassword,
          email: cleanEmail,
          emailNotifications: notificationsEnabled,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.user) {
        saveUserSession(data.user);
        return { success: true, user: data.user };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  // 2. Client fallback / offline mode
  const localUsers = getLocalRegisteredUsers();
  const lowerKey = cleanUsername.toLowerCase();
  if (localUsers[lowerKey]) {
    return { success: false, error: `Commander username "${cleanUsername}" is already registered.` };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(cleanPassword, salt);
  const now = Date.now();
  const userId = `usr_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const account: StoredUserAccount = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: 'user',
    email: cleanEmail,
    emailNotifications: notificationsEnabled,
    salt,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  localUsers[lowerKey] = account;
  saveLocalRegisteredUsers(localUsers);

  const session: UserSession = {
    id: userId,
    username: cleanUsername,
    name: cleanName,
    role: 'user',
    email: cleanEmail,
    emailNotifications: notificationsEnabled,
    createdAt: now,
    lastActiveAt: now,
  };
  saveUserSession(session);
  return { success: true, user: session };
}

/**
 * Login with username and password.
 * Checks password against stored encrypted salt + hash.
 */
export async function loginWithPassword(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const cleanUsername = username.trim();
  const cleanPassword = password;

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Please enter both username and password.' };
  }

  // 1. Try server endpoint
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.user) {
        saveUserSession(data.user);
        return { success: true, user: data.user };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  // 2. Client fallback / offline mode
  const localUsers = getLocalRegisteredUsers();
  const lowerKey = cleanUsername.toLowerCase();
  const account = localUsers[lowerKey];
  if (!account) {
    return { success: false, error: `No commander found with username "${cleanUsername}". Please register first.` };
  }

  const computedHash = await hashPassword(cleanPassword, account.salt);
  if (computedHash !== account.passwordHash) {
    return { success: false, error: 'Incorrect password.' };
  }

  const now = Date.now();
  account.updatedAt = now;
  saveLocalRegisteredUsers(localUsers);

  const session: UserSession = {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    email: account.email,
    emailNotifications: account.emailNotifications !== false,
    createdAt: account.createdAt,
    lastActiveAt: now,
  };
  saveUserSession(session);
  return { success: true, user: session };
}

/**
 * Updates an existing user's profile (email, notification preference, or display name).
 */
export async function updateUserProfile(
  userId: string,
  updates: { email?: string; emailNotifications?: boolean; name?: string }
): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  // 1. Try server endpoint
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.user) {
        saveUserSession(data.user);
        return { success: true, user: data.user };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  // 2. Client fallback / offline mode
  const localUsers = getLocalRegisteredUsers();
  const account = Object.values(localUsers).find((u) => u.id === userId);
  if (!account) {
    return { success: false, error: 'User account not found' };
  }

  if (typeof updates.name === 'string') account.name = updates.name.trim() || account.username;
  if (typeof updates.email === 'string') account.email = updates.email.trim();
  if (typeof updates.emailNotifications === 'boolean') account.emailNotifications = updates.emailNotifications;
  account.updatedAt = Date.now();
  saveLocalRegisteredUsers(localUsers);

  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    const updated: UserSession = {
      ...cur,
      name: account.name,
      email: account.email,
      emailNotifications: account.emailNotifications,
      lastActiveAt: Date.now(),
    };
    saveUserSession(updated);
    return { success: true, user: updated };
  }

  return { success: true };
}

/**
 * Legacy / quick login helper (backward compatibility for existing automated tests).
 */
export function loginAsUser(username: string): UserSession {
  const cleanName = username.trim() || 'Commander';
  const existing = getStoredUserSession();
  const now = Date.now();
  const session: UserSession = {
    id: existing?.role === 'user' && (existing.username.toLowerCase() === cleanName.toLowerCase() || existing.name.toLowerCase() === cleanName.toLowerCase())
      ? existing.id
      : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: cleanName,
    name: cleanName,
    role: 'user',
    createdAt: existing?.createdAt || now,
    lastActiveAt: now,
  };
  saveUserSession(session);
  return session;
}

export async function loginAsAdmin(password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const cleanPassword = password.trim();
  if (!cleanPassword) {
    return { success: false, error: 'Please enter the administrator password.' };
  }

  // 1. Try server verification if available
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const now = Date.now();
          const adminSession: UserSession = {
            id: 'admin_root',
            username: 'Administrator',
            name: 'Administrator',
            role: 'admin',
            createdAt: now,
            lastActiveAt: now,
          };
          saveUserSession(adminSession);
          return { success: true, user: adminSession };
        } else {
          return { success: false, error: data.error || 'Invalid administrator password.' };
        }
      }
    }
  } catch {}

  // 2. Client fallback verification using encrypted hash
  let adminCreds: { salt: string; passwordHash: string } | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) adminCreds = JSON.parse(raw);
    }
  } catch {}
  if (!adminCreds) adminCreds = memoryAdminCredentials;

  if (adminCreds) {
    const inputHash = await hashPassword(cleanPassword, adminCreds.salt);
    if (inputHash === adminCreds.passwordHash) {
      const now = Date.now();
      const adminSession: UserSession = {
        id: 'admin_root',
        username: 'Administrator',
        name: 'Administrator',
        role: 'admin',
        createdAt: now,
        lastActiveAt: now,
      };
      saveUserSession(adminSession);
      return { success: true, user: adminSession };
    }
  } else {
    return {
      success: false,
      error: 'Administrator has not been initialized yet. Please configure the administrator password first.',
    };
  }

  return { success: false, error: 'Invalid administrator password.' };
}

/**
 * Check whether an administrator account has already been set up.
 */
export async function isAdminConfigured(): Promise<boolean> {
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/admin/status');
      if (res.ok) {
        const data = await res.json();
        return !!data.isConfigured;
      }
    }
  } catch {}

  let adminCreds: { salt: string; passwordHash: string } | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) adminCreds = JSON.parse(raw);
    }
  } catch {}
  if (!adminCreds) adminCreds = memoryAdminCredentials;
  return adminCreds !== null;
}

/**
 * Setup the initial administrator account.
 * Only allowed when no administrator password has been configured yet.
 * Encrypts with a unique salt and PBKDF2 hash before saving.
 */
export async function setupInitialAdmin(
  password: string
): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  const cleanPass = password.trim();
  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'Administrator password must be at least 3 characters.' };
  }

  // 1. Try server endpoint
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: cleanPass }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const now = Date.now();
        const adminSession: UserSession = {
          id: 'admin_root',
          username: 'Administrator',
          name: 'Administrator',
          role: 'admin',
          createdAt: now,
          lastActiveAt: now,
        };
        saveUserSession(adminSession);
        return { success: true, user: adminSession };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  // 2. Client fallback
  let adminCreds: { salt: string; passwordHash: string } | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) adminCreds = JSON.parse(raw);
    }
  } catch {}
  if (!adminCreds) adminCreds = memoryAdminCredentials;

  if (adminCreds) {
    return { success: false, error: 'Administrator account has already been initialized.' };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(cleanPass, salt);
  const newCreds = { salt, passwordHash };
  memoryAdminCredentials = newCreds;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newCreds));
    }
  } catch {}

  const now = Date.now();
  const adminSession: UserSession = {
    id: 'admin_root',
    username: 'Administrator',
    name: 'Administrator',
    role: 'admin',
    createdAt: now,
    lastActiveAt: now,
  };
  saveUserSession(adminSession);
  return { success: true, user: adminSession };
}

/**
 * Fetch list of registered users for Admin view (passwords and hashes are excluded).
 */
export async function adminListUsers(): Promise<{ success: boolean; users?: RegisteredUserProfile[]; error?: string }> {
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          return { success: true, users: data.users };
        }
      }
    }
  } catch {}

  // Fallback
  const localUsers = getLocalRegisteredUsers();
  const list: RegisteredUserProfile[] = Object.values(localUsers).map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return { success: true, users: list };
}

/**
 * Admin change password for any user account.
 * Calculates new salt and new PBKDF2 hash; raw password is never stored.
 */
export async function adminChangeUserPassword(
  targetUserId: string,
  newPassword: string,
  targetUsername?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'New password must be at least 3 characters.' };
  }

  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          targetUsername,
          newPassword: cleanPass,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        return { success: true, message: data.message };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  // Fallback
  const localUsers = getLocalRegisteredUsers();
  let foundKey = '';
  for (const [k, u] of Object.entries(localUsers)) {
    if (u.id === targetUserId || (targetUsername && u.username.toLowerCase() === targetUsername.toLowerCase())) {
      foundKey = k;
      break;
    }
  }

  if (!foundKey || !localUsers[foundKey]) {
    return { success: false, error: 'Target user not found.' };
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(cleanPass, newSalt);
  localUsers[foundKey].salt = newSalt;
  localUsers[foundKey].passwordHash = newHash;
  localUsers[foundKey].updatedAt = Date.now();
  saveLocalRegisteredUsers(localUsers);

  return {
    success: true,
    message: `Password for commander "${localUsers[foundKey].username}" has been successfully updated.`,
  };
}

/**
 * Admin change administrator password.
 */
export async function adminChangeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 3) {
    return { success: false, error: 'New administrator password must be at least 3 characters.' };
  }

  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/auth/admin/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword: cleanPass,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        return { success: true, message: data.message };
      }
      if (data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {}

  let adminCreds: { salt: string; passwordHash: string } | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
      if (raw) adminCreds = JSON.parse(raw);
    }
  } catch {}
  if (!adminCreds) adminCreds = memoryAdminCredentials;

  if (adminCreds) {
    const curHash = await hashPassword(currentPassword, adminCreds.salt);
    if (curHash !== adminCreds.passwordHash) {
      return { success: false, error: 'Current administrator password is incorrect.' };
    }
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(cleanPass, salt);
  const newCreds = { salt, passwordHash };
  memoryAdminCredentials = newCreds;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newCreds));
    }
  } catch {}

  return { success: true, message: 'Administrator password updated successfully.' };
}

export function logoutUser(): UserSession {
  const newGuest = createGuestUser();
  return newGuest;
}

export function subscribeToUserSession(callback: (user: UserSession) => void): () => void {
  sessionListeners.push(callback);

  const handler = (e: Event) => {
    const custom = e as CustomEvent<UserSession>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getCurrentUser());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === USER_SESSION_KEY) {
      callback(getCurrentUser());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('eclipse_user_changed', handler);
    window.addEventListener('storage', storageHandler);
  }

  return () => {
    const idx = sessionListeners.indexOf(callback);
    if (idx >= 0) sessionListeners.splice(idx, 1);
    if (typeof window !== 'undefined') {
      window.removeEventListener('eclipse_user_changed', handler);
      window.removeEventListener('storage', storageHandler);
    }
  };
}
