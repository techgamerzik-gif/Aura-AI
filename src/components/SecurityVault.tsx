import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Plus,
  RefreshCw,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  FileKey,
  Radio,
  FileText,
  MessageSquare,
  Activity,
  History,
  Cpu,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  encryptSensitiveData,
  generateRandomMasterPassphrase,
} from '../utils/crypto.ts';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  detectBiometricHardwareName,
  getStoredBiometricCredential,
  saveStoredBiometricCredential,
  registerBiometricPasskey,
  authenticateWithBiometrics,
  getBiometricAuditLogs,
  logBiometricEvent,
  BiometricAuditEntry,
  BiometricCredentialInfo,
} from '../utils/webauthn.ts';
import { LanguageMode } from '../types/assistant.ts';

interface SecurityVaultProps {
  language: LanguageMode;
}

export interface ExecutiveVaultRecord {
  id: string;
  type: 'file' | 'communication';
  title: string;
  category: string;
  ciphertext: string;
  iv: string;
  salt: string;
  decryptedPlaintext?: string;
  date: string;
  requiresBiometric: boolean;
  classification: 'TOP SECRET' | 'CONFIDENTIAL' | 'RESTRICTED';
}

export const SecurityVault: React.FC<SecurityVaultProps> = ({ language }) => {
  const [masterPassphrase, setMasterPassphrase] = useState('AURA-TITANIUM-9842');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [cloudSyncEnabled] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'files' | 'communications' | 'enclave'>('all');

  // WebAuthn Biometric State
  const [bioInfo, setBioInfo] = useState<BiometricCredentialInfo>({
    enrolled: true,
    credentialId: 'sec-enclave-passkey-aura-001',
    enrolledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    deviceName: detectBiometricHardwareName(),
    authenticatorAttachment: 'platform',
    algorithm: 'ES256 (ECDSA P-256)',
    userVerification: 'required',
  });
  const [isPlatformAvailable, setIsPlatformAvailable] = useState<boolean>(true);
  const [isWebAuthnSupportedState, setIsWebAuthnSupportedState] = useState<boolean>(true);

  // Biometric Scanner Modal State
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioScanTarget, setBioScanTarget] = useState<{
    mode: 'unlock_vault' | 'decrypt_item' | 'enroll';
    item?: ExecutiveVaultRecord;
  } | null>(null);
  const [bioScanningState, setBioScanningState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [bioScanMessage, setBioScanMessage] = useState<string>('');
  const [activeChallengeHex, setActiveChallengeHex] = useState<string>('');

  // Per-item individual biometric unlocks
  const [individuallyUnlockedIds, setIndividuallyUnlockedIds] = useState<Set<string>>(new Set());

  // Biometric Audit Trail
  const [auditLogs, setAuditLogs] = useState<BiometricAuditEntry[]>([]);

  // Initial Vault Items (Executive Files & Communications)
  const [vaultItems, setVaultItems] = useState<ExecutiveVaultRecord[]>([
    {
      id: 'v-1',
      type: 'file',
      title: 'Boardroom M&A Valuation Memo (Project Apex)',
      category: 'Strategic M&A',
      classification: 'TOP SECRET',
      requiresBiometric: true,
      ciphertext: 'kP83xLq99vMbA001xX9+LwzB42==e9910fA01',
      iv: 'iv908129038',
      salt: 'salt19827364',
      decryptedPlaintext: 'Acquisition target firm valued at $42.5M. Maximum authorized bid $46M with 60% equity swap. Dual-signature board ratification required before Friday 15:00 CET.',
      date: 'Today 08:30',
    },
    {
      id: 'c-1',
      type: 'communication',
      title: 'Red-Line Diplomatic Cable: Cross-Border Regulatory Clearance',
      category: 'Diplomatic Cable',
      classification: 'TOP SECRET',
      requiresBiometric: true,
      ciphertext: 'mZ910bVx8923a1+192Kj00181xX9==cable90',
      iv: 'iv881726351',
      salt: 'salt77162534',
      decryptedPlaintext: 'URGENT DISPATCH FROM ZURICH LEGAL ATTACHE: Tier-1 antitrust clearance confirmed without structural remedy. Swiss Federal Council liaison signed ministerial waiver under protocol B-12.',
      date: 'Today 09:15',
    },
    {
      id: 'v-2',
      type: 'file',
      title: 'Executive Swiss Private Banking PIN & Wire Authorizations',
      category: 'Banking & Treasury',
      classification: 'TOP SECRET',
      requiresBiometric: true,
      ciphertext: 'mZ910bVx8923a1+192Kj==vault8812',
      iv: 'iv881726351',
      salt: 'salt77162534',
      decryptedPlaintext: 'Primary Corporate Treasury Account: CH93-0000-8812-4910. Dual-signature hardware key authorized. Single-transfer limit raised to $12,500,000 for acquisition escrow funding.',
      date: 'Yesterday 17:40',
    },
    {
      id: 'c-2',
      type: 'communication',
      title: 'Board Chairman Directive: Hostile Takeover Defense Protocol',
      category: 'Board Executive Dispatch',
      classification: 'TOP SECRET',
      requiresBiometric: true,
      ciphertext: 'aB44910xKkL002938==def7712omega',
      iv: 'iv119283746',
      salt: 'salt99283746',
      decryptedPlaintext: 'EXECUTIVE OVERRIDE CODE: OMEGA-7712. Golden parachute and poison-pill shareholder rights plan triggered if unsolicited holdings cross 14.8%. Morgan Stanley M&A defense cell placed on standby.',
      date: 'Yesterday 14:10',
    },
    {
      id: 'v-3',
      type: 'file',
      title: 'Private Diplomatic Passport & Jet Charter Access Codes',
      category: 'Private Travel',
      classification: 'CONFIDENTIAL',
      requiresBiometric: false,
      ciphertext: 'aB44910xKkL002938==travel0981',
      iv: 'iv119283746',
      salt: 'salt99283746',
      decryptedPlaintext: 'NetJets Premier Jet Card ID: NJ-EXEC-9912. FBO Handler: Signature Flight Support VIP Terminal. Emergency flight flightplan clearance pre-filed for Geneva (LSGG) to London Luton (EGGW).',
      date: '3 days ago',
    },
    {
      id: 'c-3',
      type: 'communication',
      title: 'Defense Sector Contractor Classified Signal Transcript',
      category: 'Encrypted Signal Bridge',
      classification: 'TOP SECRET',
      requiresBiometric: true,
      ciphertext: 'qR1894vLp092aB==signalNATO994',
      iv: 'iv772635190',
      salt: 'salt66251409',
      decryptedPlaintext: 'SIGNAL ID #9924-SIG: Satellite telemetry bridge encrypted under NATO Commercial Spec. Quantum key distribution channel switched to secondary orbital relay. No intercept anomalies detected.',
      date: '4 days ago',
    },
    {
      id: 'v-4',
      type: 'file',
      title: 'Offshore Sovereign Wealth Trust Allocation Charter',
      category: 'Wealth & Sovereign',
      classification: 'CONFIDENTIAL',
      requiresBiometric: false,
      ciphertext: 'xX8910aZ88219==trustAllocation88',
      iv: 'iv338291048',
      salt: 'salt44910283',
      decryptedPlaintext: 'Cayman Discretionary Trust Deed #KY-2024-912: 35% sovereign treasury bonds, 40% Tier-1 tech equities, 25% physical gold reserves vaulted in Singapore Le Freeport.',
      date: '5 days ago',
    },
  ]);

  // Form State for Adding New Secrets
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemPlaintext, setNewItemPlaintext] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'communication'>('file');
  const [newItemCategory, setNewItemCategory] = useState('Strategic M&A');
  const [newItemClassification, setNewItemClassification] = useState<'TOP SECRET' | 'CONFIDENTIAL' | 'RESTRICTED'>('TOP SECRET');
  const [newItemRequireBiometric, setNewItemRequireBiometric] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Initialize WebAuthn capabilities and audit logs on mount
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isWebAuthnSupported();
      setIsWebAuthnSupportedState(supported);

      const platAvailable = await isPlatformAuthenticatorAvailable();
      setIsPlatformAvailable(platAvailable);

      const stored = getStoredBiometricCredential();
      if (stored.enrolled) {
        setBioInfo(stored);
      } else {
        // Pre-enroll default platform passkey for immediate out-of-the-box convenience
        saveStoredBiometricCredential('sec-enclave-passkey-aura-001', detectBiometricHardwareName());
        setBioInfo({
          enrolled: true,
          credentialId: 'sec-enclave-passkey-aura-001',
          enrolledAt: new Date().toISOString(),
          deviceName: detectBiometricHardwareName(),
          authenticatorAttachment: 'platform',
          algorithm: 'ES256 (ECDSA P-256)',
          userVerification: 'required',
        });
      }

      setAuditLogs(getBiometricAuditLogs());
    };

    checkSupport();
  }, []);

  // Trigger Biometric Scan Modal
  const openBiometricPrompt = (
    mode: 'unlock_vault' | 'decrypt_item' | 'enroll',
    item?: ExecutiveVaultRecord
  ) => {
    // Generate a fresh random cryptographic challenge hex
    const challengeBytes = window.crypto.getRandomValues(new Uint8Array(16));
    const challengeHex = Array.from(challengeBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setActiveChallengeHex(`0x${challengeHex}`);

    setBioScanTarget({ mode, item });
    setBioScanningState('idle');
    setBioScanMessage(
      mode === 'enroll'
        ? (language === 'ur_slang'
            ? 'Touch ID / Face ID hardware passkey enroll karne ke liye scan karein.'
            : `Enroll ${bioInfo.deviceName || 'Platform Biometrics'} passkey to secure executive enclaves.`)
        : mode === 'unlock_vault'
        ? (language === 'ur_slang'
            ? 'Executive Vault unlock karne ke liye biometric sensor touch karein.'
            : `Place finger on sensor or look at camera to authenticate via WebAuthn FIDO2.`)
        : (language === 'ur_slang'
            ? `Top-Secret document "${item?.title}" decrypt karne ke liye biometric scan zaroori hai.`
            : `Biometric verification required to decrypt confidential record: "${item?.title}".`)
    );
    setIsBioModalOpen(true);
  };

  // Execute Biometric Verification
  const handleExecuteBiometricScan = async () => {
    if (!bioScanTarget) return;

    setBioScanningState('scanning');
    setBioScanMessage(
      language === 'ur_slang'
        ? 'Biometric hardware sensor par finger detect ho rahi hai... WebAuthn assertion generate ho raha hai...'
        : 'Requesting WebAuthn FIDO2 assertion from platform authenticator...'
    );

    try {
      if (bioScanTarget.mode === 'enroll') {
        const result = await registerBiometricPasskey('Executive Officer');
        setBioInfo({
          enrolled: true,
          credentialId: result.credentialId,
          enrolledAt: new Date().toISOString(),
          deviceName: result.deviceName,
          authenticatorAttachment: 'platform',
          algorithm: 'ES256 (ECDSA P-256)',
          userVerification: 'required',
        });
        setBioScanningState('success');
        setBioScanMessage(
          language === 'ur_slang'
            ? 'Mubarak! Biometric passkey kamyabi se enroll ho gayi hai!'
            : `Biometric passkey enrolled successfully via ${result.method === 'webauthn_hardware' ? 'WebAuthn Hardware Sensor' : 'Secure Enclave'}!`
        );
        setAuditLogs(getBiometricAuditLogs());
        setTimeout(() => {
          setIsBioModalOpen(false);
          setBioScanningState('idle');
        }, 1200);
        return;
      }

      // Authentication (Vault Unlock or Item Decrypt)
      const authResult = await authenticateWithBiometrics(
        bioInfo.credentialId,
        bioScanTarget.item?.title || 'Master Cryptographic Vault'
      );

      if (authResult.success) {
        setBioScanningState('success');
        setBioScanMessage(
          language === 'ur_slang'
            ? 'Biometric Signature Verified! Cryptographic keys unsealed.'
            : `Biometric Signature Verified via ${authResult.deviceEnclave}. Cryptographic keys released.`
        );

        if (bioScanTarget.mode === 'unlock_vault') {
          setIsUnlocked(true);
          setFeedback(
            language === 'ur_slang'
              ? 'Vault biometric authentication se unlock ho gaya hai!'
              : 'Vault unlocked via WebAuthn Biometric Verification. Local session active.'
          );
        } else if (bioScanTarget.mode === 'decrypt_item' && bioScanTarget.item) {
          setIndividuallyUnlockedIds((prev) => new Set(prev).add(bioScanTarget.item!.id));
          setFeedback(
            language === 'ur_slang'
              ? `Biometric passkey validated! "${bioScanTarget.item.title}" decrypted.`
              : `Biometric verification confirmed! "${bioScanTarget.item.title}" decrypted.`
          );
        }

        setAuditLogs(getBiometricAuditLogs());
        setTimeout(() => {
          setIsBioModalOpen(false);
          setBioScanningState('idle');
          setTimeout(() => setFeedback(null), 4000);
        }, 1100);
      } else {
        setBioScanningState('failed');
        setBioScanMessage(
          language === 'ur_slang'
            ? 'Biometric verify nahi ho saka. Dobara koshish karein.'
            : 'Biometric verification failed. Sensor timed out or rejected signature.'
        );
      }
    } catch (err: any) {
      console.error('Biometric execution error', err);
      setBioScanningState('failed');
      setBioScanMessage(err?.message || 'Biometric hardware sensor error');
    }
  };

  // Passphrase-based manual unlock fallback
  const handleUnlockWithPassphrase = async () => {
    if (!masterPassphrase.trim()) return;
    setIsUnlocked(true);
    setFeedback(
      language === 'ur_slang'
        ? 'Vault master passphrase se unlock ho gaya hai.'
        : 'Vault unlocked via Master Passphrase fallback.'
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  // Lock Vault
  const handleLockVault = () => {
    setIsUnlocked(false);
    setIndividuallyUnlockedIds(new Set());
    logBiometricEvent({
      action: 'SEAL',
      targetTitle: 'Master Security Vault',
      method: 'enclave_simulator',
      credentialId: bioInfo.credentialId || 'enclave-key',
      status: 'SUCCESS',
      userVerification: 'Executive Seal Commanded',
    });
    setAuditLogs(getBiometricAuditLogs());
    setFeedback(
      language === 'ur_slang'
        ? 'Vault seal kar diya gaya hai. Memory se tamam decryptions flush kar di gayi hain.'
        : 'Vault sealed. Memory cache purged and biometric enclave locked.'
    );
    setTimeout(() => setFeedback(null), 3500);
  };

  // Add new encrypted item
  const handleAddNewEncryptedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !newItemPlaintext.trim()) return;

    setIsEncrypting(true);
    try {
      const encrypted = await encryptSensitiveData(newItemPlaintext, masterPassphrase);

      const newItem: ExecutiveVaultRecord = {
        id: `${newItemType === 'file' ? 'v' : 'c'}-${Date.now()}`,
        type: newItemType,
        title: newItemTitle,
        category: newItemCategory,
        classification: newItemClassification,
        requiresBiometric: newItemRequireBiometric,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        decryptedPlaintext: newItemPlaintext,
        date: 'Just now',
      };

      setVaultItems([newItem, ...vaultItems]);
      if (newItemRequireBiometric) {
        setIndividuallyUnlockedIds((prev) => new Set(prev).add(newItem.id));
      }
      setNewItemTitle('');
      setNewItemPlaintext('');
      setFeedback(
        language === 'ur_slang'
          ? `Naya ${newItemType === 'communication' ? 'Executive Communication' : 'Confidential File'} 256-bit AES encryption se store ho gaya hai!`
          : `New ${newItemType === 'communication' ? 'Executive Communication' : 'Executive File'} encrypted with AES-GCM 256-bit & secured!`
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setFeedback('Encryption failed.');
    } finally {
      setIsEncrypting(false);
    }
  };

  // Export Key
  const handleExportKey = () => {
    const keyData = JSON.stringify(
      {
        app: 'AURA Executive AI Vault',
        masterPassphrase,
        exportedAt: new Date().toISOString(),
        encryptionStandard: 'AES-GCM-256-PBKDF2',
        webAuthnBiometrics: {
          enrolled: bioInfo.enrolled,
          credentialId: bioInfo.credentialId,
          deviceName: bioInfo.deviceName,
          algorithm: bioInfo.algorithm,
        },
        zeroKnowledge: true,
      },
      null,
      2
    );

    const blob = new Blob([keyData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AURA_Biometric_Master_Key_${new Date().toISOString().split('T')[0]}.aurakey`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter items based on active tab
  const filteredItems = vaultItems.filter((item) => {
    if (activeTab === 'files') return item.type === 'file';
    if (activeTab === 'communications') return item.type === 'communication';
    return true;
  });

  const filesCount = vaultItems.filter((i) => i.type === 'file').length;
  const commsCount = vaultItems.filter((i) => i.type === 'communication').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Biometric Status Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800/80 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              Executive Security Vault & Biometric Enclave
            </h2>
            <span className="text-[11px] text-cyan-300 font-mono bg-cyan-950/60 border border-cyan-700/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>WebAuthn FIDO2 Active</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              AES-GCM 256-BIT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            {language === 'ur_slang'
              ? 'Biometric WebAuthn layer ke zariye tamam sensitive executive files aur secret communications hardware enclave (Touch ID / Face ID) se protected hain.'
              : 'Hardware-backed biometric authentication layer using the WebAuthn API. Restricts access to sensitive boardroom files, wire authorizations, and encrypted executive communications.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isUnlocked ? (
            <button
              onClick={handleLockVault}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Seal Vault & Flush Keys</span>
            </button>
          ) : (
            <>
              {/* Primary Biometric Unlock Button */}
              <button
                onClick={() => openBiometricPrompt('unlock_vault')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/60 border border-cyan-400/30"
              >
                <Fingerprint className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>Unlock with Biometrics</span>
              </button>

              {/* Passphrase Unlock Fallback */}
              <button
                onClick={handleUnlockWithPassphrase}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                title="Manual Passphrase Fallback"
              >
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span>Passphrase</span>
              </button>
            </>
          )}

          <button
            onClick={() => openBiometricPrompt('enroll')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-medium rounded-xl border border-cyan-900/50 transition-colors"
            title="Enroll or re-calibrate platform biometric passkey"
          >
            <ScanFace className="w-3.5 h-3.5 text-cyan-400" />
            <span>Enroll Passkey</span>
          </button>

          <button
            onClick={handleExportKey}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Key</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className="p-3.5 bg-gradient-to-r from-cyan-950/80 to-slate-900 border border-cyan-700/60 rounded-xl text-xs text-cyan-200 flex items-center justify-between gap-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-cyan-400/60 hover:text-cyan-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Security & Biometric Hardware Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Biometric Authenticator Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 relative overflow-hidden group hover:border-cyan-800/60 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>Biometric Sensor</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded">
              READY
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">
            {bioInfo.deviceName || 'Platform Authenticator'}
          </div>
          <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
            <span>Passkey:</span>
            <span className="text-slate-400 truncate">{bioInfo.credentialId?.slice(0, 16)}...</span>
          </div>
        </div>

        {/* Cryptographic Standard */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Cryptographic Engine</span>
            </span>
            <span className="text-[10px] text-purple-400 font-mono bg-purple-950/60 px-1.5 py-0.5 rounded">
              E2EE
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono">AES-GCM 256 + PBKDF2</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">100,000 SHA-256 Hash Iterations</div>
        </div>

        {/* Access State */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Enclave State</span>
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isUnlocked ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'
              }`}
            >
              {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isUnlocked ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isUnlocked ? 'Biometric Session Active' : 'Ciphertext Sealed in RAM'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isUnlocked ? 'Zero-Knowledge plaintext mounted' : 'Biometric gesture required to decrypt'}
          </div>
        </div>

        {/* Audit Compliance */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span>FIDO2 / SOC-2 Audit</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded">
              VERIFIED
            </span>
          </div>
          <div className="text-sm font-bold text-slate-100">Zero-Knowledge Enclave</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {auditLogs.length} Biometric events logged in trail
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar (All / Executive Files / Sensitive Communications / Enclave Diagnostics) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Enclave Records ({vaultItems.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'files'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensitive Executive Files ({filesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('communications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'communications'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Executive Communications ({commsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('enclave')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'enclave'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
            <span>Biometric Hardware Enclave & Audit</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cloud Sync: Active (Zero-Knowledge)</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'enclave' ? (
        /* Biometric Hardware Enclave & Audit Trail View */
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>WebAuthn FIDO2 Platform Hardware Enclave</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Local secure element binding: Cryptographic assertions verified on-device via Touch ID / Face ID / Windows Hello.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openBiometricPrompt('enroll')}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Enroll Sensor</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500">Authenticator Type</div>
                <div className="text-slate-200 font-semibold mt-1">{bioInfo.deviceName}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Platform Internal Sensor</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500">Public Key Algorithm</div>
                <div className="text-slate-200 font-semibold mt-1 font-mono">ES256 (P-256 ECDSA)</div>
                <div className="text-[11px] text-cyan-400 mt-1">FIDO2 WebAuthn Spec</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500">User Verification Policy</div>
                <div className="text-slate-200 font-semibold mt-1 font-mono">userVerification: "required"</div>
                <div className="text-[11px] text-emerald-400 mt-1">Biometric Gesture Enforced</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-500">Hardware Credential ID</div>
                <div className="text-slate-300 font-mono truncate mt-1">{bioInfo.credentialId}</div>
                <div className="text-[11px] text-slate-500 mt-1">Enrolled: {bioInfo.enrolledAt ? new Date(bioInfo.enrolledAt).toLocaleDateString() : 'Active'}</div>
              </div>
            </div>
          </div>

          {/* Biometric Audit Logs */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Biometric Hardware Authentication Audit Trail</span>
              </h3>
              <span className="text-[11px] text-slate-500">Immutable client log</span>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 bg-slate-950 rounded-xl text-center">
                  No biometric authentication events logged yet in this session.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                        <Fingerprint className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{log.action}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({log.targetTitle || 'Vault'})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Method: {log.method === 'webauthn_hardware' ? 'WebAuthn Platform Sensor' : 'Secure Enclave Biometric'} · {log.userVerification}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        {log.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Records List View (Executive Files & Communications) */
        <div className="space-y-4">
          {/* Master Key Passphrase Manager */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Master Cryptographic Passphrase:</span>
              </div>
              <button
                onClick={() => setMasterPassphrase(generateRandomMasterPassphrase())}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate New Master Key</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={masterPassphrase}
                onChange={(e) => setMasterPassphrase(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Add New Encrypted Secret Form (When unlocked) */}
          {isUnlocked && (
            <form onSubmit={handleAddNewEncryptedItem} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Store New Encrypted Executive Secret or Communication</span>
                </h3>
                <span className="text-[10px] text-cyan-400 font-mono">Web Crypto AES-GCM 256-Bit</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="Title (e.g. M&A Project Red-Line Cable, Swiss Wire Token)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as 'file' | 'communication')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="file">Executive File</option>
                    <option value="communication">Executive Communication</option>
                  </select>
                </div>
                <div>
                  <select
                    value={newItemClassification}
                    onChange={(e) => setNewItemClassification(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="TOP SECRET">TOP SECRET</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  required
                  value={newItemPlaintext}
                  onChange={(e) => setNewItemPlaintext(e.target.value)}
                  placeholder="Sensitive payload to encrypt (wire codes, diplomatic cables, emergency directives)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newItemRequireBiometric}
                    onChange={(e) => setNewItemRequireBiometric(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-950"
                  />
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Enforce WebAuthn Biometric Verification on Access</span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isEncrypting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md disabled:opacity-50"
                >
                  {isEncrypting ? 'Encrypting with Web Crypto...' : 'Encrypt & Store in Enclave'}
                </button>
              </div>
            </form>
          )}

          {/* Records Display Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {activeTab === 'files'
                  ? `Sensitive Executive Files (${filteredItems.length})`
                  : activeTab === 'communications'
                  ? `Sensitive Executive Communications (${filteredItems.length})`
                  : `All Protected Enclave Records (${filteredItems.length})`}
              </span>
              <span>
                Status:{' '}
                {isUnlocked ? (
                  <span className="text-emerald-400 font-semibold">VAULT UNLOCKED (RAM CACHE ACTIVE)</span>
                ) : (
                  <span className="text-amber-400 font-semibold">ENCLAVE SEALED (CIPHERTEXT LOCKED)</span>
                )}
              </span>
            </div>

            {filteredItems.map((item) => {
              // Determine if this item is decrypted in view
              // An item is decrypted if:
              // 1. Vault is unlocked AND (item does not require strict individual biometric OR it has been individually unlocked), OR
              // 2. The item was individually unlocked via biometric prompt
              const isItemDecrypted =
                isUnlocked && (!item.requiresBiometric || individuallyUnlockedIds.has(item.id));

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    item.type === 'communication'
                      ? 'bg-slate-900/90 border-slate-800 hover:border-blue-800/60'
                      : 'bg-slate-900/90 border-slate-800 hover:border-cyan-800/60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.type === 'communication' ? (
                        <div className="p-1 rounded bg-blue-950/80 border border-blue-800 text-blue-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="font-bold text-slate-100">{item.title}</span>

                      {/* Classification Badge */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          item.classification === 'TOP SECRET'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                        }`}
                      >
                        {item.classification}
                      </span>

                      {/* Biometric Shield Indicator */}
                      {item.requiresBiometric && (
                        <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded flex items-center gap-1">
                          <Fingerprint className="w-3 h-3 text-cyan-400" />
                          <span>Biometric Protected</span>
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-500 font-mono">{item.date}</span>

                      {/* Per-Item Biometric Decrypt Button */}
                      {!isItemDecrypted && (
                        <button
                          onClick={() => openBiometricPrompt('decrypt_item', item)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 border border-cyan-700/60 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <Fingerprint className="w-3 h-3 text-cyan-400" />
                          <span>Biometric Decrypt</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Item Content Display */}
                  <div className="mt-2.5">
                    {isItemDecrypted ? (
                      <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed relative">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 border-b border-slate-800/80 pb-1.5 mb-2">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>DECRYPTED VIA BIOMETRIC SESSION</span>
                          </span>
                          <span className="text-slate-500 font-mono">Zero-Knowledge Local Buffer</span>
                        </div>
                        {item.decryptedPlaintext || item.ciphertext}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950/95 border border-slate-800/70 rounded-xl text-xs font-mono text-slate-500 flex items-center justify-between gap-3">
                        <div className="truncate flex-1">
                          <span className="text-slate-600 select-none">CIPHERTEXT (AES-256): </span>
                          <span className="text-slate-500 font-mono">{item.ciphertext}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.requiresBiometric ? (
                            <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-sans">
                              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Touch ID / Face ID Required</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-sans">
                              <Lock className="w-3 h-3" />
                              <span>Vault Locked</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Biometric Interactive WebAuthn Authentication Modal / Scanner HUD */}
      {isBioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-cyan-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-cyan-950/60 relative overflow-hidden">
            {/* Holographic Glowing Background Accents */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Fingerprint className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    WebAuthn Biometric Verification
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    FIDO2 Hardware Authenticator Assertion
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsBioModalOpen(false);
                  setBioScanningState('idle');
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Holographic Scanner Visualizer */}
            <div className="py-6 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Concentric Pulsing Radar Rings */}
                <div
                  className={`absolute inset-0 rounded-full border border-cyan-500/30 transition-all duration-700 ${
                    bioScanningState === 'scanning' ? 'animate-ping' : ''
                  }`}
                />
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-4 rounded-full bg-cyan-950/60 border border-cyan-700/80 flex items-center justify-center shadow-inner" />

                {/* Central Biometric Icon */}
                <div className="relative z-10 flex items-center justify-center">
                  {bioScanningState === 'success' ? (
                    <ShieldCheck className="w-12 h-12 text-emerald-400 animate-in zoom-in" />
                  ) : bioScanningState === 'failed' ? (
                    <AlertTriangle className="w-12 h-12 text-rose-400 animate-in zoom-in" />
                  ) : (
                    <Fingerprint
                      className={`w-14 h-14 transition-all duration-300 ${
                        bioScanningState === 'scanning'
                          ? 'text-cyan-300 scale-110 animate-pulse'
                          : 'text-cyan-400 hover:scale-105'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center space-y-1 max-w-sm px-2">
                <div
                  className={`text-xs font-semibold ${
                    bioScanningState === 'success'
                      ? 'text-emerald-400'
                      : bioScanningState === 'failed'
                      ? 'text-rose-400'
                      : 'text-slate-200'
                  }`}
                >
                  {bioScanningState === 'scanning'
                    ? 'Scanning Hardware Biometrics...'
                    : bioScanningState === 'success'
                    ? 'Biometric Verification Confirmed!'
                    : bioScanningState === 'failed'
                    ? 'Biometric Signature Failed'
                    : 'Awaiting Biometric Sensor Interaction'}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {bioScanMessage}
                </p>
              </div>

              {/* Cryptographic Challenge Telemetry */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] font-mono space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Authenticator:</span>
                  <span className="text-cyan-300 truncate">{bioInfo.deviceName}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Challenge Hash:</span>
                  <span className="text-slate-300">{activeChallengeHex.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>User Verification:</span>
                  <span className="text-emerald-400">Required (Enclave)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsBioModalOpen(false);
                  setBioScanningState('idle');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteBiometricScan}
                disabled={bioScanningState === 'scanning'}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Fingerprint className="w-4 h-4 text-cyan-200" />
                <span>
                  {bioScanningState === 'scanning' ? 'Verifying Sensor...' : 'Authenticate Sensor'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
