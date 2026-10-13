import React, { useState, useEffect } from 'react';
import { UserSession, RegisteredUserProfile } from '../../engine/types/user';
import {
  createGuestUser,
  loginWithPassword,
  registerUser,
  loginAsAdmin,
  isAdminConfigured,
  setupInitialAdmin,
  adminListUsers,
  adminChangeUserPassword,
  adminChangeAdminPassword,
  logoutUser,
} from '../../engine/rules/userSession';
import {
  User,
  Shield,
  KeyRound,
  Sparkles,
  LogIn,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Lock,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

interface UserLoginModalProps {
  currentUser: UserSession;
  onUserChanged: (user: UserSession) => void;
  onClose: () => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  currentUser,
  onUserChanged,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'guest' | 'user' | 'admin'>(
    currentUser.role === 'admin'
      ? 'admin'
      : currentUser.role === 'user'
      ? 'user'
      : 'guest'
  );

  // Commander mode: 'login' | 'register'
  const [commanderMode, setCommanderMode] = useState<'login' | 'register'>('login');

  // Guest inputs
  const [guestName, setGuestName] = useState<string>(
    currentUser.role === 'guest' ? currentUser.username : `Guest-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Commander Login inputs
  const [userName, setUserName] = useState<string>(
    currentUser.role === 'user' ? currentUser.username : ''
  );
  const [userPassword, setUserPassword] = useState<string>('');

  // Commander Register inputs
  const [regUsername, setRegUsername] = useState<string>('');
  const [regDisplayName, setRegDisplayName] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // Admin Login inputs
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isAdminConfiguredState, setIsAdminConfiguredState] = useState<boolean | null>(null);
  const [setupAdminPassword, setSetupAdminPassword] = useState<string>('');
  const [setupAdminConfirmPassword, setSetupAdminConfirmPassword] = useState<string>('');

  // Admin Management state
  const [adminUsers, setAdminUsers] = useState<RegisteredUserProfile[]>([]);
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>('');
  const [newTargetPassword, setNewTargetPassword] = useState<string>('');
  const [currentAdminPass, setCurrentAdminPass] = useState<string>('');
  const [newAdminPass, setNewAdminPass] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleTabChange = (tab: 'guest' | 'user' | 'admin') => {
    setActiveTab(tab);
    clearFeedback();
  };

  const checkAdminConfig = async () => {
    const configured = await isAdminConfigured();
    setIsAdminConfiguredState(configured);
  };

  const loadAdminUsers = async () => {
    setIsLoadingUsers(true);
    const res = await adminListUsers();
    setIsLoadingUsers(false);
    if (res.success && res.users) {
      setAdminUsers(res.users);
      if (res.users.length > 0 && !selectedTargetUserId) {
        setSelectedTargetUserId(res.users[0].id);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      checkAdminConfig();
      if (currentUser.role === 'admin') {
        loadAdminUsers();
      }
    }
  }, [currentUser.role, activeTab]);

  // Guest submit handler
  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const clean = guestName.trim() || `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
    const guest = createGuestUser(clean);
    onUserChanged(guest);
    onClose();
  };

  // Commander Login submit handler
  const handleCommanderLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const cleanUser = userName.trim();
    if (!cleanUser) {
      setErrorMessage('Please enter your Commander username.');
      return;
    }
    if (!userPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithPassword(cleanUser, userPassword);
    setIsSubmitting(false);

    if (res.success && res.user) {
      onUserChanged(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Login failed. Please check your username and password.');
    }
  };

  // Commander Register submit handler
  const handleCommanderRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const cleanUser = regUsername.trim();
    const cleanName = regDisplayName.trim() || cleanUser;

    if (!cleanUser || cleanUser.length < 2) {
      setErrorMessage('Username must be at least 2 characters long.');
      return;
    }
    if (!regPassword || regPassword.length < 3) {
      setErrorMessage('Password must be at least 3 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await registerUser(cleanUser, regPassword, cleanName);
    setIsSubmitting(false);

    if (res.success && res.user) {
      onUserChanged(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  // Admin Authenticate submit handler
  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!adminPassword.trim()) {
      setErrorMessage('Please enter the administrator password.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginAsAdmin(adminPassword);
    setIsSubmitting(false);

    if (res.success && res.user) {
      setAdminPassword('');
      onUserChanged(res.user);
      loadAdminUsers();
      setSuccessMessage('Administrator session authenticated.');
    } else {
      setErrorMessage(res.error || 'Incorrect administrator password.');
    }
  };

  // Admin Setup submit handler (First-time setup when no admin password has been set yet)
  const handleAdminSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const cleanPass = setupAdminPassword.trim();
    if (!cleanPass || cleanPass.length < 3) {
      setErrorMessage('Administrator password must be at least 3 characters long.');
      return;
    }
    if (cleanPass !== setupAdminConfirmPassword.trim()) {
      setErrorMessage('Administrator passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await setupInitialAdmin(cleanPass);
    setIsSubmitting(false);

    if (res.success && res.user) {
      setSetupAdminPassword('');
      setSetupAdminConfirmPassword('');
      setIsAdminConfiguredState(true);
      onUserChanged(res.user);
      loadAdminUsers();
      setSuccessMessage('Administrator account initialized successfully.');
    } else {
      setErrorMessage(res.error || 'Failed to initialize administrator account.');
    }
  };

  // Admin Reset User Password handler
  const handleAdminResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!selectedTargetUserId) {
      setErrorMessage('Please select a commander to reset password.');
      return;
    }
    if (!newTargetPassword.trim() || newTargetPassword.trim().length < 3) {
      setErrorMessage('New password must be at least 3 characters long.');
      return;
    }

    const targetUser = adminUsers.find((u) => u.id === selectedTargetUserId);
    setIsSubmitting(true);
    const res = await adminChangeUserPassword(
      selectedTargetUserId,
      newTargetPassword.trim(),
      targetUser?.username
    );
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message || 'Password updated successfully.');
      setNewTargetPassword('');
      loadAdminUsers();
    } else {
      setErrorMessage(res.error || 'Failed to update user password.');
    }
  };

  // Admin Change Admin Password handler
  const handleAdminChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!currentAdminPass) {
      setErrorMessage('Please enter your current administrator password.');
      return;
    }
    if (!newAdminPass.trim() || newAdminPass.trim().length < 3) {
      setErrorMessage('New administrator password must be at least 3 characters long.');
      return;
    }

    setIsSubmitting(true);
    const res = await adminChangeAdminPassword(currentAdminPass, newAdminPass.trim());
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage(res.message || 'Administrator password updated successfully.');
      setCurrentAdminPass('');
      setNewAdminPass('');
    } else {
      setErrorMessage(res.error || 'Failed to update administrator password.');
    }
  };

  const handleLogout = () => {
    const newGuest = logoutUser();
    onUserChanged(newGuest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white font-display uppercase tracking-wider">
                User Identity & Access
              </h2>
              <p className="text-[11px] text-slate-400">
                Register, login, or manage commanders and galaxy tables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="px-5 py-3 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 text-[11px]">Current:</span>
            <span className="font-bold text-white truncate">{currentUser.username}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                currentUser.role === 'admin'
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-300'
                  : currentUser.role === 'user'
                  ? 'bg-cyan-950/80 border border-cyan-600 text-cyan-300'
                  : 'bg-amber-950/80 border border-amber-600 text-amber-300'
              }`}
            >
              {currentUser.role}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-rose-300 hover:bg-slate-800/60 transition cursor-pointer"
            title="Reset to a new guest session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch / Reset</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-3 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('guest')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'guest'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guest</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('user')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'user'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Commander</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-200 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* GUEST TAB */}
          {activeTab === 'guest' && (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300 mb-1.5">
                  Temporary Guest Nickname
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Guest-5821"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400 transition"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Play immediately without a password. Tables you join or create will be attached to your session.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Continue as Guest</span>
              </button>
            </form>
          )}

          {/* COMMANDER TAB (LOGIN / REGISTER) */}
          {activeTab === 'user' && (
            <div className="space-y-4">
              {/* Sub-mode Toggle (Login vs Register) */}
              <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCommanderMode('login');
                    clearFeedback();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    commanderMode === 'login'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCommanderMode('register');
                    clearFeedback();
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    commanderMode === 'register'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>

              {/* Login Form */}
              {commanderMode === 'login' && (
                <form onSubmit={handleCommanderLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Commander Username
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Commander Alice"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Enter your password..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition pr-9"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Log in with your encrypted credentials to rejoin your galaxy tables across sessions and devices.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isSubmitting ? 'Logging in...' : 'Login as Commander'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCommanderMode('register');
                        clearFeedback();
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer transition"
                    >
                      New Commander? Register here
                    </button>
                  </div>
                </form>
              )}

              {/* Register Form */}
              {commanderMode === 'register' && (
                <form onSubmit={handleCommanderRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Username (Login ID)
                    </label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="e.g. CommanderBob"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 transition"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      In-Game Display Name <span className="text-slate-500 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                      placeholder="e.g. Bob the Conqueror"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Password (min 3 chars)
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a password..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition pr-9"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm password..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition pr-9"
                        required
                      />
                      <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Your password will be encrypted using PBKDF2 with salted SHA-256 before storage. Plaintext passwords are never saved.
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Registering...' : 'Create Commander Account'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCommanderMode('login');
                        clearFeedback();
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer transition"
                    >
                      Already registered? Login here
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ADMIN TAB */}
          {activeTab === 'admin' && (
            <div className="space-y-5">
              {currentUser.role !== 'admin' ? (
                isAdminConfiguredState === false ? (
                  /* First-Time Administrator Setup */
                  <form onSubmit={handleAdminSetupSubmit} className="space-y-4">
                    <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                        <Shield className="w-4 h-4" />
                        <span>First-Time Administrator Setup</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80">
                        No administrator password has been set yet for this galaxy server. Set a master password to initialize administrative control.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
                        Set Master Administrator Password (min 3 chars)
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={setupAdminPassword}
                          onChange={(e) => setSetupAdminPassword(e.target.value)}
                          placeholder="Create administrator password..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-400 transition pr-9"
                          required
                          autoFocus
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
                        Confirm Administrator Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={setupAdminConfirmPassword}
                          onChange={(e) => setSetupAdminConfirmPassword(e.target.value)}
                          placeholder="Confirm administrator password..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-400 transition pr-9"
                          required
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      The password will be encrypted with PBKDF2 using salted SHA-256 before storage. Plaintext passwords are never saved.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isSubmitting ? 'Initializing...' : 'Initialize Administrator Account'}</span>
                    </button>
                  </form>
                ) : (
                  /* Standard Admin Login View */
                  <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
                        Administrator Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => {
                            setAdminPassword(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Enter administrator password..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-rose-200 focus:outline-none focus:border-rose-400 transition pr-9"
                          required
                          autoFocus
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Admins have full visibility over all active tables and can manage user credentials.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isSubmitting ? 'Verifying...' : 'Authenticate as Admin'}</span>
                    </button>
                  </form>
                )
              ) : (
                /* Admin Management Panel (Authenticated) */
                <div className="space-y-5">
                  {/* Status header */}
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-rose-200">
                        Administrator Access Active
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={loadAdminUsers}
                      disabled={isLoadingUsers}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 hover:text-white hover:border-slate-500 transition cursor-pointer"
                      title="Refresh registered commanders"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {/* Section 1: Reset Commander Password */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Change User Password</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {adminUsers.length} registered
                      </span>
                    </div>

                    {adminUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No commander accounts registered on the server yet.
                      </p>
                    ) : (
                      <form onSubmit={handleAdminResetUserPassword} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Select Commander
                          </label>
                          <select
                            value={selectedTargetUserId}
                            onChange={(e) => setSelectedTargetUserId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400 transition cursor-pointer"
                          >
                            {adminUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.username} {u.name && u.name !== u.username ? `(${u.name})` : ''} - ID: {u.id}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            New Password for Commander
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              value={newTargetPassword}
                              onChange={(e) => setNewTargetPassword(e.target.value)}
                              placeholder="Enter new password (min 3 chars)..."
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition pr-8"
                              required
                            />
                            <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !selectedTargetUserId}
                          className="w-full py-2 rounded-lg font-display font-bold text-xs uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white transition shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? 'Updating...' : 'Reset User Password'}</span>
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Section 2: Change Administrator Password */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Change Administrator Password</span>
                    </h3>

                    <form onSubmit={handleAdminChangeSelfPassword} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Current Administrator Password
                        </label>
                        <input
                          type="password"
                          value={currentAdminPass}
                          onChange={(e) => setCurrentAdminPass(e.target.value)}
                          placeholder="Current admin password..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          New Administrator Password
                        </label>
                        <input
                          type="password"
                          value={newAdminPass}
                          onChange={(e) => setNewAdminPass(e.target.value)}
                          placeholder="New admin password (min 3 chars)..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 transition"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 rounded-lg font-display font-bold text-xs uppercase tracking-wider bg-rose-700 hover:bg-rose-600 text-white transition shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isSubmitting ? 'Updating...' : 'Update Admin Password'}</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
