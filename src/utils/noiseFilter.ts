/**
 * Acoustic Noise Filter & Cocktail-Party Voice Isolation Engine
 *
 * Distinguishes the near-field user's voice from ambient crowd noise,
 * background chatter, room reverberation, and multi-speaker environments.
 */

import {
  VoiceFingerprintBuffer,
  VoiceFingerprintProfile,
  VoiceFingerprintMatch,
  VoiceFingerprintTelemetry,
  voiceFingerprintEngine,
} from './voiceFingerprint.ts';

export {
  VoiceFingerprintBuffer,
  voiceFingerprintEngine,
};
export type {
  VoiceFingerprintProfile,
  VoiceFingerprintMatch,
  VoiceFingerprintTelemetry,
};

export interface AcousticTelemetry {
  audioEnergy: number; // 0 - 100
  ambientNoiseFloor: number; // 0 - 100
  snrDb: number; // Signal-to-noise ratio in dB (-20dB to +40dB)
  isNearFieldVoice: boolean; // True when audio energy clearly exceeds crowd noise
  isCrowdNoiseDetected: boolean; // True when ambient noise floor exceeds 22%
  formantClarity: number; // 0 - 100 measure of vocal resonance in speech frequency range (300Hz-3400Hz)
}

export interface VocalSuppressionTelemetry {
  vocalPurityPercent: number; // 0 - 100% of audio energy located within human vocal spectrum (85Hz - 3400Hz)
  outOfBandNoisePercent: number; // 0 - 100% of audio energy filtered out (sub-bass rumble + high-freq fan hiss)
  isHumanVoiceActive: boolean; // True when spectral energy matches human vocal tract profile
  subBassRumbleEnergy: number; // Energy below 85Hz
  highFreqHissEnergy: number; // Energy above 3400Hz
  vocalBandEnergy: number; // Energy inside human vocal spectrum (85Hz - 3400Hz)
  attenuationDb: number; // Estimated noise reduction in dB
  fingerprintMatchPercent?: number; // 0 - 100% correlation with 5-second voice fingerprint buffer
  isFingerprintPatternMatch?: boolean; // True if matches user's 5s voice fingerprint pattern
  isFingerprintSuppressed?: boolean; // True if non-matching pattern is actively attenuated in Web Audio
  isFingerprintReady?: boolean; // True if 5s buffer has been sampled
}

/**
 * Modern MediaStream audio constraints with browser hardware DSP enabled
 */
export function getAcousticMicrophoneConstraints(aggressiveSuppression = true): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: aggressiveSuppression },
      autoGainControl: { ideal: true },
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48000 },
      // Advanced Google Chrome & modern webkit beamforming constraints
      ...((aggressiveSuppression
        ? {
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
          }
        : {}) as any),
    },
  };
}

/**
 * Creates a 3-stage vocal formant DSP filter chain:
 * 1. High-Pass Filter (120 Hz): cuts HVAC hum, room rumble, traffic vibration
 * 2. Peaking Band-Pass Filter (1800 Hz): boosts vocal formant presence
 * 3. Low-Pass Filter (3800 Hz): cuts ambient high-frequency crowd hiss and sibilance
 */
export function createVocalDSPFilterChain(
  ctx: AudioContext,
  sourceNode: MediaStreamAudioSourceNode
): { outputNode: AudioNode; analyserNode: AnalyserNode } {
  // 1. High-Pass filter
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 120;
  highpass.Q.value = 0.707;

  // 2. Peaking Vocal Formant Band-Pass filter
  const vocalFormant = ctx.createBiquadFilter();
  vocalFormant.type = 'peaking';
  vocalFormant.frequency.value = 1800; // Human vocal intelligibility center
  vocalFormant.Q.value = 1.2;
  vocalFormant.gain.value = 5.0; // Boost vocal clarity +5dB

  // 3. Low-Pass filter
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3800;
  lowpass.Q.value = 0.707;

  // 4. Analyser
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 64;
  analyser.smoothingTimeConstant = 0.65;

  // Connect chain
  sourceNode.connect(highpass);
  highpass.connect(vocalFormant);
  vocalFormant.connect(lowpass);
  lowpass.connect(analyser);

  return { outputNode: lowpass, analyserNode: analyser };
}

/**
 * Creates an advanced 6-stage Human Vocal Profile DSP Noise Suppression Filter in Web Audio API:
 * Stage 1: Steep Butterworth High-Pass Sub-Bass Cut (95 Hz, Q=0.707) - rejects HVAC hum, structural vibration, desk bumps
 * Stage 2: Electrical Mains AC Hum Notch Filter (60 Hz / 50 Hz, Q=6.0) - sharply cuts power line electromagnetic hum
 * Stage 3: Vocal Chest & Fundamental Resonance Peaking Filter (280 Hz, +2.5dB, Q=1.0)
 * Stage 4: Vocal Intelligibility & Formant Peaking Filter (1900 Hz, +4.5dB, Q=1.3)
 * Stage 5: Steep Low-Pass Anti-Hiss Filter (3400 Hz, Q=0.707) - eliminates computer fan noise, crowd sibilance, air hiss
 * Stage 6: Dynamic Speech Expander / Noise Gate (DynamicsCompressorNode) - attenuates ambient floor during pauses
 */
export function createHumanVoiceNoiseSuppressionPipeline(
  ctx: AudioContext,
  sourceNode: MediaStreamAudioSourceNode
): {
  outputNode: AudioNode;
  analyserNode: AnalyserNode;
  rawAnalyserNode: AnalyserNode;
  fingerprintBuffer: VoiceFingerprintBuffer;
  setFilterEnabled: (enabled: boolean) => void;
  getTelemetry: (filteredData: Uint8Array, rawData: Uint8Array, sampleRate?: number) => VocalSuppressionTelemetry;
  getFingerprintTelemetry: () => VoiceFingerprintTelemetry;
  startFingerprintSampling: (onProgress?: (seconds: number, percent: number) => void) => void;
  cancelFingerprintSampling: () => void;
  clearFingerprint: () => void;
  setFingerprintSuppression: (enabled: boolean) => void;
} {
  // Raw input analyzer (before filtering) for comparison
  const rawAnalyser = ctx.createAnalyser();
  rawAnalyser.fftSize = 128;
  rawAnalyser.smoothingTimeConstant = 0.6;
  sourceNode.connect(rawAnalyser);

  // Stage 1: High-Pass (95 Hz) - cuts structural rumble, footsteps, air conditioner thrum
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 95;
  highpass.Q.value = 0.707;

  // Stage 2: Notch Filter (60 Hz) - cuts electrical mains hum
  const notch60 = ctx.createBiquadFilter();
  notch60.type = 'notch';
  notch60.frequency.value = 60;
  notch60.Q.value = 6.0;

  // Stage 3: Low Vocal Resonance (280 Hz) - emphasizes speech core fundamentals
  const lowVocalPeaking = ctx.createBiquadFilter();
  lowVocalPeaking.type = 'peaking';
  lowVocalPeaking.frequency.value = 280;
  lowVocalPeaking.gain.value = 2.5;
  lowVocalPeaking.Q.value = 1.0;

  // Stage 4: Formant Intelligibility (1900 Hz) - accents speech consonant clarity
  const formantPeaking = ctx.createBiquadFilter();
  formantPeaking.type = 'peaking';
  formantPeaking.frequency.value = 1900;
  formantPeaking.gain.value = 4.5;
  formantPeaking.Q.value = 1.3;

  // Stage 5: Low-Pass (3400 Hz) - sharply cuts high-frequency fan hiss, ultrasonic mouse clicks, room noise
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 3400;
  lowpass.Q.value = 0.707;

  // Stage 6: Dynamic Speech Expander / Noise Gate
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -38;
  compressor.knee.value = 8;
  compressor.ratio.value = 4.5;
  compressor.attack.value = 0.003; // fast 3ms attack so vowels are never clipped
  compressor.release.value = 0.14; // smooth 140ms release

  // Stage 7: Voice Fingerprint Pattern Match Attenuation Gate
  // Dynamically suppresses non-matching speech patterns by -20dB to -24dB
  const fingerprintGateGain = ctx.createGain();
  fingerprintGateGain.gain.value = 1.0;

  // Master Gain Node for smooth enable/bypass blending
  const filterGain = ctx.createGain();
  filterGain.gain.value = 1.0;

  const bypassGain = ctx.createGain();
  bypassGain.gain.value = 0.0;

  const masterOutput = ctx.createGain();

  // Connect filtered path with Voice Fingerprint pattern gate
  sourceNode.connect(highpass);
  highpass.connect(notch60);
  notch60.connect(lowVocalPeaking);
  lowVocalPeaking.connect(formantPeaking);
  formantPeaking.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(fingerprintGateGain);
  fingerprintGateGain.connect(filterGain);
  filterGain.connect(masterOutput);

  // Connect bypass path
  sourceNode.connect(bypassGain);
  bypassGain.connect(masterOutput);

  // Output analyzer for filtered audio
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.65;
  masterOutput.connect(analyser);

  // Instance of the 5-second Voice Fingerprint Buffer
  const fingerprintBuffer = voiceFingerprintEngine;

  const setFilterEnabled = (enabled: boolean) => {
    const t = ctx.currentTime;
    if (enabled) {
      filterGain.gain.setValueAtTime(0, t);
      filterGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
      bypassGain.gain.setValueAtTime(1.0, t);
      bypassGain.gain.linearRampToValueAtTime(0, t + 0.05);
    } else {
      filterGain.gain.setValueAtTime(1.0, t);
      filterGain.gain.linearRampToValueAtTime(0, t + 0.05);
      bypassGain.gain.setValueAtTime(0, t);
      bypassGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
    }
  };

  const getTelemetry = (
    filteredData: Uint8Array,
    rawData: Uint8Array,
    sampleRate = 48000
  ): VocalSuppressionTelemetry => {
    const binCount = filteredData.length;
    const binWidth = (sampleRate / 2) / binCount;

    let subBassEnergy = 0;
    let vocalBandEnergy = 0;
    let highFreqEnergy = 0;
    let rawTotalEnergy = 0;
    let filteredTotalEnergy = 0;

    for (let i = 0; i < binCount; i++) {
      const freq = i * binWidth;
      const rawVal = rawData[i];
      const filteredVal = filteredData[i];

      rawTotalEnergy += rawVal;
      filteredTotalEnergy += filteredVal;

      if (freq < 85) {
        subBassEnergy += rawVal;
      } else if (freq >= 85 && freq <= 3400) {
        vocalBandEnergy += rawVal;
      } else {
        highFreqEnergy += rawVal;
      }
    }

    const totalRaw = Math.max(1, rawTotalEnergy);
    const outOfBandEnergy = subBassEnergy + highFreqEnergy;
    const vocalPurityPercent = Math.min(100, Math.round((vocalBandEnergy / totalRaw) * 100));
    const outOfBandNoisePercent = Math.min(100, Math.round((outOfBandEnergy / totalRaw) * 100));

    const attenuationDb = rawTotalEnergy > 0 && filteredTotalEnergy > 0
      ? Math.max(0, Math.round(20 * Math.log10(rawTotalEnergy / filteredTotalEnergy)))
      : 0;

    const isHumanVoiceActive = vocalBandEnergy > 15 && vocalPurityPercent >= 60;

    // Process frame into the 5-Second Voice Fingerprint Buffer
    fingerprintBuffer.processAudioFrame(filteredData, sampleRate);
    const fpMatch = fingerprintBuffer.getLatestMatch();

    // Dynamically adjust Web Audio API gain based on Voice Fingerprint pattern match
    if (fingerprintBuffer.isReady() && fingerprintBuffer.isSuppressionEnabled()) {
      const t = ctx.currentTime;
      const targetGain = fpMatch.attenuationFactor;
      fingerprintGateGain.gain.setValueAtTime(fingerprintGateGain.gain.value, t);
      fingerprintGateGain.gain.linearRampToValueAtTime(targetGain, t + 0.04);
    } else {
      fingerprintGateGain.gain.setValueAtTime(1.0, ctx.currentTime);
    }

    return {
      vocalPurityPercent,
      outOfBandNoisePercent,
      isHumanVoiceActive,
      subBassRumbleEnergy: Math.round((subBassEnergy / totalRaw) * 100),
      highFreqHissEnergy: Math.round((highFreqEnergy / totalRaw) * 100),
      vocalBandEnergy: Math.round((vocalBandEnergy / (binCount * 255)) * 100),
      attenuationDb,
      fingerprintMatchPercent: fpMatch.confidence,
      isFingerprintPatternMatch: fpMatch.isMatch,
      isFingerprintSuppressed: fpMatch.isSuppressed,
      isFingerprintReady: fingerprintBuffer.isReady(),
    };
  };

  return {
    outputNode: masterOutput,
    analyserNode: analyser,
    rawAnalyserNode: rawAnalyser,
    fingerprintBuffer,
    setFilterEnabled,
    getTelemetry,
    getFingerprintTelemetry: () => fingerprintBuffer.getTelemetry(),
    startFingerprintSampling: (onProgress?: (seconds: number, percent: number) => void) =>
      fingerprintBuffer.startSampling(ctx.sampleRate, onProgress),
    cancelFingerprintSampling: () => fingerprintBuffer.cancelSampling(),
    clearFingerprint: () => {
      fingerprintBuffer.clear();
      fingerprintGateGain.gain.setValueAtTime(1.0, ctx.currentTime);
    },
    setFingerprintSuppression: (enabled: boolean) =>
      fingerprintBuffer.setSuppressionEnabled(enabled),
  };
}

/**
 * Real-time Adaptive Noise Gate & SNR Estimator
 */
export class AdaptiveAcousticTracker {
  private noiseFloorRms = 12; // Initial estimated noise floor
  private alphaFloor = 0.04; // Slow adaptation rate for background noise floor
  private alphaEnergy = 0.35; // Fast adaptation rate for current speech bursts

  /**
   * Process frequency data buffer and calculate acoustic telemetry
   */
  public analyze(dataArray: Uint8Array): AcousticTelemetry {
    let sum = 0;
    let speechBandSum = 0; // 300Hz - 3400Hz bins
    const length = dataArray.length;

    for (let i = 0; i < length; i++) {
      const val = dataArray[i];
      sum += val;
      // Frequency bin estimation: bins 3 to 18 correspond roughly to speech formants
      if (i >= 2 && i <= 20) {
        speechBandSum += val;
      }
    }

    const currentRawEnergy = Math.min(100, Math.round((sum / length / 128) * 100));
    const formantRatio = sum > 0 ? (speechBandSum / (sum + 1)) * 100 : 0;

    // Adapt noise floor: tracks low sustained levels, ignoring brief speech spikes
    if (currentRawEnergy < this.noiseFloorRms) {
      this.noiseFloorRms = this.noiseFloorRms * 0.92 + currentRawEnergy * 0.08;
    } else {
      this.noiseFloorRms = this.noiseFloorRms * (1 - this.alphaFloor) + currentRawEnergy * this.alphaFloor;
    }
    this.noiseFloorRms = Math.max(5, Math.min(65, this.noiseFloorRms));

    // Dynamic SNR estimation in decibels
    const safeNoise = Math.max(1, this.noiseFloorRms);
    const snrDb = Math.round(20 * Math.log10(Math.max(1, currentRawEnergy) / safeNoise));

    // Near-field speaker voice requires at least +6dB SNR above ambient crowd babble
    const isNearFieldVoice = currentRawEnergy > this.noiseFloorRms + 8 && snrDb >= 5;
    const isCrowdNoiseDetected = this.noiseFloorRms > 24;

    return {
      audioEnergy: currentRawEnergy,
      ambientNoiseFloor: Math.round(this.noiseFloorRms),
      snrDb,
      isNearFieldVoice,
      isCrowdNoiseDetected,
      formantClarity: Math.min(100, Math.round(formantRatio * 1.5)),
    };
  }

  public reset() {
    this.noiseFloorRms = 12;
  }
}

/**
 * Filter out third-party background crowd chatter when in high-noise/crowd isolation mode.
 * In a crowded environment (café, boardroom, conference), people talk in the background.
 * If Crowd Isolation Mode is ON, passive ambient conversation is ignored unless:
 * 1. It explicitly contains an AURA wake word, OR
 * 2. It matches a recognized autonomous executive directive.
 */
export function isPassiveCrowdChatter(
  transcript: string,
  isCrowdModeActive: boolean,
  isNearFieldSpeech: boolean
): boolean {
  if (!isCrowdModeActive) return false;

  const normalized = transcript.toLowerCase().trim();
  if (!normalized || normalized.length < 2) return true;

  // 1. Never discard if explicit wake word is present
  const hasWake = /aura|ora|اورا|عورا/i.test(normalized);
  if (hasWake) {
    return false;
  }

  // 2. Never discard if an actionable assistant directive or executive verb is present
  const hasDirective =
    /(?:lights?|lamp|batti|ac|thermostat|temperature|temp|cool|music|song|jazz|play|pause|resume|task|todo|kaam|schedule|meeting|call|dial|email|mail|whatsapp|car|tesla|presentation|deck|slides|research|search|clean\s+slate|wipe)/i.test(
      normalized
    );
  if (hasDirective) {
    return false;
  }

  // 3. Discard explicit bystander chatter patterns in crowded environments
  const bystanderChatterPatterns = [
    /^(?:yeah|yes|no|okay|sure|right|exactly|cool|wow|oh)\s+(?:man|bro|dude|really|too)?$/i,
    /^(?:did you see|have you seen|what about|so i was|he said|she said)/i,
    /^(?:pass the|can i have|where is the|excuse me|thank you|thanks)\s+(?:coffee|water|bill|menu|chair)?$/i,
    /^(?:haha+|lol|bye|see you|goodbye)$/i,
  ];

  for (const pat of bystanderChatterPatterns) {
    if (pat.test(normalized)) {
      return true;
    }
  }

  // 4. In crowd mode, if near-field acoustic confidence is completely absent AND input is under 2 words with no action:
  if (!isNearFieldSpeech && normalized.split(/\s+/).length < 2) {
    return true; // Discard isolated ambient grunt or whisper
  }

  return false;
}
