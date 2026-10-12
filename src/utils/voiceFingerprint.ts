/**
 * AURA 5-Second Voice Fingerprint Buffer & Pattern Matching Engine
 *
 * Captures, stores, and evaluates a 5.0-second baseline audio and spectral sample
 * of the user's primary voice. Employs multi-frame spectral envelope correlation,
 * vocal tract harmonic distribution, and pitch dynamic range variance to distinguish
 * the primary user's speech patterns from background talkers, television, and room noise.
 */

export interface VoiceFingerprintProfile {
  id: string;
  durationSeconds: number; // 5.0
  recordedAt: string;
  sampleRate: number;
  meanPitchHz: number;
  pitchStdDev: number;
  meanCentroidHz: number;
  harmonicTemplate: number[]; // 16-band normalized vocal timbre signature
  formantRatios: [number, number, number]; // Formant peaks [F1, F2, F3]
  frameSampleCount: number;
  isReady: boolean;
}

export interface VoiceFingerprintMatch {
  isMatch: boolean;
  confidence: number; // 0 - 100%
  spectralSimilarity: number; // 0 - 100%
  pitchSimilarity: number; // 0 - 100%
  attenuationFactor: number; // 0.0 - 1.0 (gain multiplier for non-matching speech)
  isSuppressed: boolean;
  statusText: string;
}

export interface VoiceFingerprintTelemetry {
  isReady: boolean;
  isRecording: boolean;
  recordedSeconds: number;
  fillPercent: number; // 0 - 100%
  liveMatchConfidence: number;
  isSuppressed: boolean;
  attenuationDb: number;
}

const STORAGE_KEY_5S_FINGERPRINT = 'aura_voice_fingerprint_5s';
const STORAGE_KEY_FINGERPRINT_ACTIVE = 'aura_voice_fingerprint_active';

/**
 * 16-band vocal feature extractor
 */
function extractSpectralVector(freqData: Uint8Array, binWidth: number): {
  energyVector: number[];
  pitchHz: number;
  centroid: number;
  totalEnergy: number;
  formants: [number, number, number];
} {
  const binCount = freqData.length;
  const bandCount = 16;
  const energyVector = new Array(bandCount).fill(0);
  const binsPerBand = Math.max(1, Math.floor(binCount / bandCount));

  let totalEnergy = 0;
  let weightedFreqSum = 0;
  let peakVal = 0;
  let peakBin = 2;

  // Track 3 dominant formant peaks across human vocal spectrum
  let f1 = 500;
  let f2 = 1500;
  let f3 = 2500;
  let p1Val = 0, p2Val = 0, p3Val = 0;

  for (let i = 0; i < binCount; i++) {
    const val = freqData[i];
    totalEnergy += val;
    const freq = i * binWidth;
    weightedFreqSum += val * freq;

    if (val > peakVal && i > 1) {
      peakVal = val;
      peakBin = i;
    }

    // Formant peak detectors: F1 (200-900Hz), F2 (900-2400Hz), F3 (2400-3800Hz)
    if (freq >= 200 && freq < 900 && val > p1Val) {
      p1Val = val;
      f1 = freq;
    } else if (freq >= 900 && freq < 2400 && val > p2Val) {
      p2Val = val;
      f2 = freq;
    } else if (freq >= 2400 && freq < 3800 && val > p3Val) {
      p3Val = val;
      f3 = freq;
    }

    const bandIndex = Math.min(bandCount - 1, Math.floor(i / binsPerBand));
    energyVector[bandIndex] += val;
  }

  // Normalize energy vector
  const mag = Math.sqrt(energyVector.reduce((acc, v) => acc + v * v, 0)) || 1;
  const normalizedVector = energyVector.map((v) => v / mag);

  const centroid = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 1200;
  const pitchHz = Math.round(peakBin * binWidth);

  return {
    energyVector: normalizedVector,
    pitchHz: Math.max(70, Math.min(500, pitchHz)),
    centroid: Math.round(centroid),
    totalEnergy: Math.round((totalEnergy / (binCount * 255)) * 100),
    formants: [Math.round(f1), Math.round(f2), Math.round(f3)],
  };
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * High-performance 5-Second Voice Fingerprint Buffer
 */
export class VoiceFingerprintBuffer {
  private readonly targetDurationSeconds = 5.0;
  private sampleRate = 48000;
  private isRecording = false;
  private recordedFrameCount = 0;
  private readonly targetVoicedFrames = 150; // ~5 seconds of voiced speech at 30fps

  // Temporary storage during 5-second sampling
  private capturedPitches: number[] = [];
  private capturedCentroids: number[] = [];
  private capturedFormants: [number, number, number][] = [];
  private accumulatedVector: number[] = new Array(16).fill(0);

  // Rolling short-term match window to prevent transient dropouts
  private rollingMatchScores: number[] = [];
  private lastMatchResult: VoiceFingerprintMatch = {
    isMatch: true,
    confidence: 100,
    spectralSimilarity: 100,
    pitchSimilarity: 100,
    attenuationFactor: 1.0,
    isSuppressed: false,
    statusText: 'No fingerprint loaded - bypass active',
  };

  private profile: VoiceFingerprintProfile | null = null;
  private isSuppressionActive = true;
  private progressCallback: ((seconds: number, percent: number) => void) | null = null;

  constructor() {
    this.loadFromStorage();
  }

  public getProfile(): VoiceFingerprintProfile | null {
    return this.profile;
  }

  public isReady(): boolean {
    return !!(this.profile && this.profile.isReady);
  }

  public isRecordingActive(): boolean {
    return this.isRecording;
  }

  public isSuppressionEnabled(): boolean {
    return this.isSuppressionActive;
  }

  public setSuppressionEnabled(enabled: boolean): void {
    this.isSuppressionActive = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_FINGERPRINT_ACTIVE, String(enabled));
      } catch {}
    }
  }

  /**
   * Start sampling a 5-second voice sample
   */
  public startSampling(
    sampleRate = 48000,
    onProgress?: (seconds: number, percent: number) => void
  ): void {
    this.sampleRate = sampleRate;
    this.isRecording = true;
    this.recordedFrameCount = 0;
    this.capturedPitches = [];
    this.capturedCentroids = [];
    this.capturedFormants = [];
    this.accumulatedVector = new Array(16).fill(0);
    this.progressCallback = onProgress || null;
  }

  public cancelSampling(): void {
    this.isRecording = false;
    this.progressCallback = null;
  }

  /**
   * Ingest real-time frequency data from Web Audio AnalyserNode
   */
  public processAudioFrame(freqData: Uint8Array, sampleRate = 48000): void {
    const binCount = freqData.length;
    const binWidth = (sampleRate / 2) / binCount;
    const features = extractSpectralVector(freqData, binWidth);

    // If currently recording the 5-second fingerprint sample
    if (this.isRecording) {
      // Only capture voiced frames where vocal energy is sufficiently high
      if (features.totalEnergy >= 10) {
        this.recordedFrameCount++;
        this.capturedPitches.push(features.pitchHz);
        this.capturedCentroids.push(features.centroid);
        this.capturedFormants.push(features.formants);

        for (let i = 0; i < 16; i++) {
          this.accumulatedVector[i] += features.energyVector[i];
        }

        const progressPercent = Math.min(
          100,
          Math.round((this.recordedFrameCount / this.targetVoicedFrames) * 100)
        );
        const recordedSeconds = Math.min(
          5.0,
          +( (this.recordedFrameCount / this.targetVoicedFrames) * 5.0 ).toFixed(1)
        );

        if (this.progressCallback) {
          this.progressCallback(recordedSeconds, progressPercent);
        }

        if (this.recordedFrameCount >= this.targetVoicedFrames) {
          this.finalizeFingerprint(sampleRate);
        }
      }
      return;
    }

    // Normal operation: evaluate pattern match if profile is ready
    if (this.profile && this.profile.isReady && features.totalEnergy >= 8) {
      this.lastMatchResult = this.matchLivePattern(features);
    } else if (features.totalEnergy < 8) {
      // Near silence / background room tone
      this.lastMatchResult = {
        isMatch: true,
        confidence: 90,
        spectralSimilarity: 90,
        pitchSimilarity: 90,
        attenuationFactor: 1.0,
        isSuppressed: false,
        statusText: 'Room tone (below vocal threshold)',
      };
    }
  }

  /**
   * Finalizes the 5-second Voice Fingerprint profile
   */
  private finalizeFingerprint(sampleRate: number): void {
    this.isRecording = false;
    const count = this.capturedPitches.length;
    if (count < 20) return;

    // Pitch mean & standard deviation
    const meanPitch = this.capturedPitches.reduce((a, b) => a + b, 0) / count;
    const variance =
      this.capturedPitches.reduce((acc, p) => acc + Math.pow(p - meanPitch, 2), 0) / count;
    const pitchStdDev = Math.sqrt(variance);

    // Centroid mean
    const meanCentroid = this.capturedCentroids.reduce((a, b) => a + b, 0) / count;

    // Average formant peaks
    const f1Avg = this.capturedFormants.reduce((acc, f) => acc + f[0], 0) / count;
    const f2Avg = this.capturedFormants.reduce((acc, f) => acc + f[1], 0) / count;
    const f3Avg = this.capturedFormants.reduce((acc, f) => acc + f[2], 0) / count;

    // Normalized averaged spectral vector
    const avgVector = this.accumulatedVector.map((v) => v / count);
    const mag = Math.sqrt(avgVector.reduce((a, b) => a + b * b, 0)) || 1;
    const harmonicTemplate = avgVector.map((v) => v / mag);

    const profile: VoiceFingerprintProfile = {
      id: `fp-5s-${Date.now()}`,
      durationSeconds: 5.0,
      recordedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sampleRate,
      meanPitchHz: Math.round(meanPitch),
      pitchStdDev: Math.round(pitchStdDev),
      meanCentroidHz: Math.round(meanCentroid),
      harmonicTemplate,
      formantRatios: [Math.round(f1Avg), Math.round(f2Avg), Math.round(f3Avg)],
      frameSampleCount: count,
      isReady: true,
    };

    this.profile = profile;
    this.saveToStorage(profile);
    this.setSuppressionEnabled(true);

    if (this.progressCallback) {
      this.progressCallback(5.0, 100);
      this.progressCallback = null;
    }
  }

  /**
   * Compares incoming audio pattern against the stored 5-second voice fingerprint
   */
  private matchLivePattern(features: ReturnType<typeof extractSpectralVector>): VoiceFingerprintMatch {
    if (!this.profile) return this.lastMatchResult;

    // 1. Spectral Envelope Correlation (50% weight)
    const spectralSim = cosineSimilarity(features.energyVector, this.profile.harmonicTemplate);

    // 2. Pitch Standard Deviation Corridor (30% weight)
    // Checks how many standard deviations the pitch is from the 5-second sample
    const pitchDiff = Math.abs(features.pitchHz - this.profile.meanPitchHz);
    const pitchCorridor = Math.max(25, this.profile.pitchStdDev * 2.2);
    const pitchSim = Math.max(0, 1 - Math.min(1, pitchDiff / pitchCorridor));

    // 3. Spectral Centroid Proximity (20% weight)
    const centroidDiff = Math.abs(features.centroid - this.profile.meanCentroidHz);
    const centroidSim = Math.max(0, 1 - Math.min(1, centroidDiff / 800));

    // Blended score (0.0 to 1.0)
    const rawScore = spectralSim * 0.5 + pitchSim * 0.3 + centroidSim * 0.2;
    const confidence = Math.round(rawScore * 100);

    // Smooth over rolling window of 6 frames (~120ms) to avoid transient vowel dips
    this.rollingMatchScores.push(confidence);
    if (this.rollingMatchScores.length > 6) {
      this.rollingMatchScores.shift();
    }
    const smoothConfidence = Math.round(
      this.rollingMatchScores.reduce((a, b) => a + b, 0) / this.rollingMatchScores.length
    );

    const isMatch = smoothConfidence >= 55;

    // If non-matching speech pattern and suppression is active, compute attenuation factor
    let attenuationFactor = 1.0;
    let isSuppressed = false;

    if (this.isSuppressionActive && !isMatch) {
      // Attenuate non-matching speech by up to -20dB to -24dB (gain down to 0.08)
      attenuationFactor = Math.max(0.08, (smoothConfidence / 100) * 0.5);
      isSuppressed = true;
    }

    return {
      isMatch,
      confidence: smoothConfidence,
      spectralSimilarity: Math.round(spectralSim * 100),
      pitchSimilarity: Math.round(pitchSim * 100),
      attenuationFactor,
      isSuppressed,
      statusText: isMatch
        ? `Primary Voice Matched (${smoothConfidence}%)`
        : `Non-Matching Speech Suppressed (${smoothConfidence}% correlation, -${Math.round(20 * Math.log10(1 / Math.max(0.01, attenuationFactor)))}dB)`,
    };
  }

  public getLatestMatch(): VoiceFingerprintMatch {
    return this.lastMatchResult;
  }

  public getTelemetry(): VoiceFingerprintTelemetry {
    const isReady = this.isReady();
    const isRecording = this.isRecording;
    const fillPercent = isRecording
      ? Math.min(100, Math.round((this.recordedFrameCount / this.targetVoicedFrames) * 100))
      : isReady
      ? 100
      : 0;
    const recordedSeconds = isRecording
      ? Math.min(5.0, +( (this.recordedFrameCount / this.targetVoicedFrames) * 5.0 ).toFixed(1))
      : isReady
      ? 5.0
      : 0;

    const attFactor = this.lastMatchResult.attenuationFactor;
    const attenuationDb = attFactor < 0.99
      ? Math.round(20 * Math.log10(1 / Math.max(0.01, attFactor)))
      : 0;

    return {
      isReady,
      isRecording,
      recordedSeconds,
      fillPercent,
      liveMatchConfidence: this.lastMatchResult.confidence,
      isSuppressed: this.lastMatchResult.isSuppressed,
      attenuationDb,
    };
  }

  public clear(): void {
    this.profile = null;
    this.isRecording = false;
    this.recordedFrameCount = 0;
    this.rollingMatchScores = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_5S_FINGERPRINT);
      } catch {}
    }
  }

  private saveToStorage(profile: VoiceFingerprintProfile): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_5S_FINGERPRINT, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save 5s voice fingerprint:', e);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const activeRaw = localStorage.getItem(STORAGE_KEY_FINGERPRINT_ACTIVE);
      if (activeRaw !== null) {
        this.isSuppressionActive = activeRaw === 'true';
      }

      const raw = localStorage.getItem(STORAGE_KEY_5S_FINGERPRINT);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.isReady && Array.isArray(parsed.harmonicTemplate)) {
        this.profile = parsed;
      }
    } catch {}
  }
}

// Global shared singleton for cross-component access
export const voiceFingerprintEngine = new VoiceFingerprintBuffer();
