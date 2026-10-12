import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mic,
  RefreshCw,
  X,
  Sparkles,
  CheckCircle,
  Volume2,
  Trash2,
  Activity,
  UserCheck,
  Radio,
  Lock,
  Unlock,
  BarChart2,
  Fingerprint,
} from 'lucide-react';
import {
  VoiceIdentityProfile,
  getStoredVoiceIdentity,
  saveStoredVoiceIdentity,
  clearStoredVoiceIdentity,
  isVoiceIdentityEnforced,
  setVoiceIdentityEnforced,
  VoiceIdentityCalibrator,
  extractAcousticFeatures,
  verifyVoiceIdentity,
} from '../utils/voiceIdentity.ts';
import { voiceFingerprintEngine, VoiceFingerprintTelemetry } from '../utils/voiceFingerprint.ts';
import { soundEffects } from '../utils/audioChime.ts';
import {
  getAcousticMicrophoneConstraints,
  createVocalDSPFilterChain,
} from '../utils/noiseFilter.ts';

interface VoiceIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: VoiceIdentityProfile | null, enforced: boolean) => void;
}

export const VoiceIdentityModal: React.FC<VoiceIdentityModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<VoiceIdentityProfile | null>(getStoredVoiceIdentity);
  const [isEnforced, setIsEnforcedState] = useState<boolean>(isVoiceIdentityEnforced);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sampleCount, setSampleCount] = useState(0);
  const [testMatchConfidence, setTestMatchConfidence] = useState<number | null>(null);
  const [livePitch, setLivePitch] = useState<number>(0);
  const [liveEnergy, setLiveEnergy] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // 5-Second Voice Fingerprint Buffer state
  const [fingerprintTelemetry, setFingerprintTelemetry] = useState<VoiceFingerprintTelemetry>(() =>
    voiceFingerprintEngine.getTelemetry()
  );
  const [isSamplingFingerprint, setIsSamplingFingerprint] = useState(false);
  const [fingerprintCountdown, setFingerprintCountdown] = useState(5.0);
  const [fingerprintFillPercent, setFingerprintFillPercent] = useState(0);

  const calibratorRef = useRef(new VoiceIdentityCalibrator());
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredVoiceIdentity());
      setIsEnforcedState(isVoiceIdentityEnforced());
      setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
      startMicStream();
    } else {
      stopMicStream();
      setIsRecording(false);
      setIsSamplingFingerprint(false);
      setTestMatchConfidence(null);
    }
    return () => {
      stopMicStream();
    };
  }, [isOpen]);

  const startMicStream = async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia(getAcousticMicrophoneConstraints(true));
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const { analyserNode } = createVocalDSPFilterChain(ctx, source);
      analyserRef.current = analyserNode;

      const bufferLength = analyserNode.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqData);

        const features = extractAcousticFeatures(freqData, ctx.sampleRate);
        setLivePitch(features.pitchHz);
        setLiveEnergy(features.totalEnergy);

        // Process frame into the 5-Second Voice Fingerprint Buffer
        voiceFingerprintEngine.processAudioFrame(freqData, ctx.sampleRate);
        setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());

        // If currently in calibration recording phase
        calibratorRef.current.recordFrame(freqData, ctx.sampleRate);
        setSampleCount(calibratorRef.current.getSampleCount());

        // If profile is already enrolled, calculate live verification preview score
        const currentProfile = getStoredVoiceIdentity();
        if (currentProfile && features.totalEnergy > 10) {
          const verification = verifyVoiceIdentity(features, currentProfile, 15, true);
          setTestMatchConfidence(verification.confidence);
        } else if (features.totalEnergy <= 10) {
          setTestMatchConfidence(null);
        }

        animFrameRef.current = requestAnimationFrame(loop);
      };

      loop();
    } catch (err) {
      console.warn('Microphone error in Voice Identity modal:', err);
    }
  };

  const stopMicStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const handleStartCalibration = () => {
    setErrorMessage(null);
    setShowConfirmDelete(false);
    calibratorRef.current.start();
    setIsRecording(true);
    setCountdown(3);
    soundEffects.playWakeChime();

    let sec = 3;
    const interval = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      if (sec <= 0) {
        clearInterval(interval);
        handleFinishCalibration();
      }
    }, 1000);
  };

  const handleFinishCalibration = () => {
    setIsRecording(false);
    const newProfile = calibratorRef.current.finish('Executive');
    if (newProfile) {
      soundEffects.playSuccessChime();
      setProfile(newProfile);
      setIsEnforcedState(true);
      setErrorMessage(null);
      onProfileUpdated?.(newProfile, true);
    } else {
      setErrorMessage('Could not capture enough vocal data. Please speak louder into the microphone and try again.');
    }
  };

  const handleToggleEnforcement = () => {
    const nextVal = !isEnforced;
    setIsEnforcedState(nextVal);
    setVoiceIdentityEnforced(nextVal);
    onProfileUpdated?.(profile, nextVal);
  };

  const handleConfirmReset = () => {
    clearStoredVoiceIdentity();
    setVoiceIdentityEnforced(false);
    setProfile(null);
    setIsEnforcedState(false);
    setTestMatchConfidence(null);
    setShowConfirmDelete(false);
    onProfileUpdated?.(null, false);
  };

  const handleStartFingerprintSampling = () => {
    soundEffects.playWakeChime();
    setIsSamplingFingerprint(true);
    setFingerprintCountdown(5.0);
    setFingerprintFillPercent(0);

    voiceFingerprintEngine.startSampling(
      audioContextRef.current?.sampleRate || 48000,
      (seconds: number, percent: number) => {
        setFingerprintCountdown(Math.max(0, +(5.0 - seconds).toFixed(1)));
        setFingerprintFillPercent(percent);
        if (percent >= 100) {
          setIsSamplingFingerprint(false);
          soundEffects.playSuccessChime();
          setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
        }
      }
    );
  };

  const handleCancelFingerprintSampling = () => {
    voiceFingerprintEngine.cancelSampling();
    setIsSamplingFingerprint(false);
  };

  const handleClearFingerprint = () => {
    voiceFingerprintEngine.clear();
    setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
  };

  const handleToggleFingerprintSuppression = () => {
    const next = !voiceFingerprintEngine.isSuppressionEnabled();
    voiceFingerprintEngine.setSuppressionEnabled(next);
    setFingerprintTelemetry(voiceFingerprintEngine.getTelemetry());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md ${
              profile?.isEnrolled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {profile?.isEnrolled ? (
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              ) : (
                <Shield className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Voice Identity & Bio-Lock</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  profile?.isEnrolled && isEnforced
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : profile?.isEnrolled
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {profile?.isEnrolled && isEnforced
                    ? 'ENFORCED · LOCK ACTIVE'
                    : profile?.isEnrolled
                    ? 'ENROLLED · UNLOCKED'
                    : 'NOT ENROLLED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acoustic vocal biometric filtering: only authenticates YOUR voice and ignores room noise.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Status Banner */}
          {profile?.isEnrolled ? (
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Authorized Executive Profile</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-300 mt-2">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-mono">Pitch F0</span>
                      <span className="font-semibold text-cyan-300">{profile.fundamentalPitchHz} Hz</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-mono">Centroid</span>
                      <span className="font-semibold text-cyan-300">{profile.spectralCentroid} Hz</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-mono">Enrolled</span>
                      <span className="font-semibold text-slate-300">{profile.enrolledAt}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete voice profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-rose-500/40 p-1.5 rounded-xl">
                  <span className="text-[11px] text-rose-300 font-semibold px-1">Delete?</span>
                  <button
                    onClick={handleConfirmReset}
                    className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-3 text-xs text-slate-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Voice Identity Not Calibrated</span>
                Calibrate in 3 seconds to lock AURA exclusively to your voice timbre, ignoring crowd chatter and surrounding speakers.
              </div>
            </div>
          )}

          {/* Inline Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between gap-3">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Live Mic Activity & Verification Test Meter */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Microphone Telemetry
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">Pitch: <strong className="text-white">{livePitch} Hz</strong></span>
                <span className="text-slate-500">· Energy: <strong className="text-cyan-400">{liveEnergy}%</strong></span>
              </div>
            </div>

            {/* Audio energy micro-meter bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  liveEnergy > 20 ? 'bg-cyan-400' : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, liveEnergy * 1.5)}%` }}
              />
            </div>

            {/* Match Confidence Score */}
            {profile?.isEnrolled && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 text-xs">
                <span className="text-slate-400">Live Voice Match Confidence:</span>
                {testMatchConfidence !== null ? (
                  <span className={`font-mono font-bold flex items-center gap-1.5 ${
                    testMatchConfidence >= 60 ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {testMatchConfidence >= 60 ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    {testMatchConfidence}% {testMatchConfidence >= 60 ? '(Verified)' : '(Unverified)'}
                  </span>
                ) : (
                  <span className="text-slate-500 font-mono">Speak to test match...</span>
                )}
              </div>
            )}
          </div>

          {/* Interactive Calibration Section */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/20 border border-cyan-500/20 flex flex-col items-center text-center space-y-4">
            {isRecording ? (
              <div className="space-y-3">
                <div className="relative w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/50 flex items-center justify-center mx-auto animate-pulse">
                  <Mic className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white font-mono font-bold text-xs flex items-center justify-center">
                    {countdown}
                  </span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white animate-pulse">
                    Please speak now:
                  </h4>
                  <p className="text-xs font-mono text-cyan-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-cyan-800/60 max-w-sm mx-auto">
                    "Hey AURA, this is my authentic executive voice."
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Capturing acoustic harmonics ({sampleCount} frames collected)...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleStartCalibration}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 mx-auto"
                >
                  <Mic className="w-4 h-4" />
                  <span>{profile?.isEnrolled ? 'Re-Calibrate Voice Profile' : 'Start 3-Second Calibration'}</span>
                </button>
                <p className="text-xs text-slate-400 max-w-md">
                  Calibrating creates a 16-band vocal tract spectral signature and fundamental pitch map, stored securely in local browser storage.
                </p>
              </div>
            )}
          </div>

          {/* 5-Second Voice Fingerprint Buffer Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    5-Second Voice Fingerprint Buffer
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                      isSamplingFingerprint
                        ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                        : fingerprintTelemetry.isReady && voiceFingerprintEngine.isSuppressionEnabled()
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : fingerprintTelemetry.isReady
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}>
                      {isSamplingFingerprint
                        ? `RECORDING · ${fingerprintCountdown}s`
                        : fingerprintTelemetry.isReady && voiceFingerprintEngine.isSuppressionEnabled()
                        ? '5.0s BUFFER ACTIVE'
                        : fingerprintTelemetry.isReady
                        ? 'BUFFER LOADED'
                        : 'NOT SAMPLED'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Stores a continuous 5.0-second baseline sample of your primary voice to ignore non-matching speech patterns.
                  </p>
                </div>
              </div>

              {fingerprintTelemetry.isReady && !isSamplingFingerprint && (
                <button
                  onClick={handleClearFingerprint}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Delete 5s Voice Fingerprint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {isSamplingFingerprint ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-300 font-semibold animate-pulse">
                    Please speak continuously for 5 seconds...
                  </span>
                  <span className="font-mono text-cyan-300 font-bold">{fingerprintCountdown}s left</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 transition-all duration-100"
                    style={{ width: `${fingerprintFillPercent}%` }}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleCancelFingerprintSampling}
                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    Cancel Sampling
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                <div className="text-[11px] font-mono">
                  <span className="text-slate-400">Pattern Correlation: </span>
                  {fingerprintTelemetry.isReady ? (
                    <strong className={fingerprintTelemetry.liveMatchConfidence >= 55 ? 'text-emerald-400' : 'text-amber-400'}>
                      {fingerprintTelemetry.liveMatchConfidence}% {fingerprintTelemetry.isSuppressed ? '(Suppressed)' : '(Matched)'}
                    </strong>
                  ) : (
                    <span className="text-slate-500">No 5s sample recorded</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartFingerprintSampling}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all"
                  >
                    {fingerprintTelemetry.isReady ? 'Re-sample 5s' : 'Record 5s Fingerprint'}
                  </button>
                  {fingerprintTelemetry.isReady && (
                    <button
                      onClick={handleToggleFingerprintSuppression}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        voiceFingerprintEngine.isSuppressionEnabled()
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {voiceFingerprintEngine.isSuppressionEnabled() ? 'Filter: ON' : 'Filter: BYPASS'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enforcement Toggle Switch */}
          {profile?.isEnrolled && (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isEnforced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isEnforced ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Strict Bio-Lock Mode</h4>
                  <p className="text-[11px] text-slate-400">
                    When active, commands and ambient wake words are rejected unless the speaker matches your voice profile.
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleEnforcement}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnforced ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isEnforced ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Zero-Knowledge: Biometrics never leave your local device.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
