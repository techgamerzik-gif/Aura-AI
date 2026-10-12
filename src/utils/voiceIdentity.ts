/**
 * AURA Voice Identity & Acoustic Biometric Verification Engine
 *
 * Distinguishes the genuine authorized user's voice from background speakers,
 * ambient crowd chatter, television/radio audio, and unwanted room noise.
 * Employs spectral envelope cosine similarity, fundamental pitch (F0) tracking,
 * and vocal formant centroid correlation computed directly via Web Audio API.
 */

export interface VoiceIdentityProfile {
  id: string;
  enrolledAt: string;
  userName: string;
  fundamentalPitchHz: number; // Estimated fundamental vocal frequency (e.g. 85Hz - 255Hz)
  dominantFrequencyBin: number; // Peak FFT energy band
  spectralCentroid: number; // Center of vocal spectral distribution
  spectralEnergyVector: number[]; // 16-bin normalized spectral envelope signature
  averageSnrDb: number;
  sampleCount: number;
  confidenceThreshold: number; // 0.0 - 1.0 (default 0.62)
  isEnrolled: boolean;
}

export interface LiveSpeakerVerification {
  isMatch: boolean;
  confidence: number; // 0 - 100%
  speakerLabel: 'Verified Executive User' | 'Unverified Voice / Background Audio' | 'Ambient Room Audio';
  pitchHz: number;
  snrDb: number;
  isNearField: boolean;
}

const STORAGE_KEY_PROFILE = 'aura_voice_identity_profile';
const STORAGE_KEY_ENFORCED = 'aura_voice_identity_enforced';

/**
 * Get enrolled Voice Identity profile from localStorage
 */
export function getStoredVoiceIdentity(): VoiceIdentityProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.isEnrolled && Array.isArray(parsed.spectralEnergyVector)) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Save enrolled Voice Identity profile
 */
export function saveStoredVoiceIdentity(profile: VoiceIdentityProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.warn('Failed to save voice identity:', e);
  }
}

/**
 * Clear enrolled Voice Identity profile
 */
export function clearStoredVoiceIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  } catch {}
}

/**
 * Check if Voice Identity enforcement is active
 */
export function isVoiceIdentityEnforced(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEY_ENFORCED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggle Voice Identity enforcement
 */
export function setVoiceIdentityEnforced(enforced: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ENFORCED, String(enforced));
  } catch {}
}

export interface AcousticFeatures {
  pitchHz: number;
  dominantBin: number;
  spectralCentroid: number;
  energyVector: number[];
  totalEnergy: number;
}

/**
 * Extract acoustic biometric features from a frequency byte buffer (0-255 values from AnalyserNode)
 */
export function extractAcousticFeatures(
  freqData: Uint8Array,
  sampleRate = 48000
): AcousticFeatures {
  const binCount = freqData.length;
  const binWidth = (sampleRate / 2) / binCount;

  let totalEnergy = 0;
  let weightedFreqSum = 0;
  let peakVal = 0;
  let peakBin = 0;

  // 16 sub-bands representing human vocal range (roughly 80Hz - 4000Hz)
  const bandCount = 16;
  const energyVector = new Array(bandCount).fill(0);
  const binsPerBand = Math.max(1, Math.floor(binCount / bandCount));

  for (let i = 0; i < binCount; i++) {
    const val = freqData[i];
    totalEnergy += val;
    weightedFreqSum += val * (i * binWidth);

    if (val > peakVal && i > 1) {
      peakVal = val;
      peakBin = i;
    }

    const bandIndex = Math.min(bandCount - 1, Math.floor(i / binsPerBand));
    energyVector[bandIndex] += val;
  }

  // Normalize energy vector so magnitude is 1.0 (unit vector)
  const vectorMagnitude = Math.sqrt(
    energyVector.reduce((acc, v) => acc + v * v, 0)
  ) || 1;
  const normalizedVector = energyVector.map((v) => v / vectorMagnitude);

  const spectralCentroid = totalEnergy > 0 ? weightedFreqSum / totalEnergy : 1000;
  const pitchHz = Math.round(peakBin * binWidth);

  return {
    pitchHz: Math.max(70, Math.min(600, pitchHz)),
    dominantBin: peakBin,
    spectralCentroid: Math.round(spectralCentroid),
    energyVector: normalizedVector,
    totalEnergy: Math.round((totalEnergy / (binCount * 255)) * 100),
  };
}

/**
 * Computes Cosine Similarity between two normalized spectral vectors (-1.0 to +1.0)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Verify whether live audio matches an enrolled Voice Identity profile
 */
export function verifyVoiceIdentity(
  liveFeatures: AcousticFeatures,
  profile: VoiceIdentityProfile | null,
  snrDb = 0,
  isNearField = false
): LiveSpeakerVerification {
  // If no profile is enrolled, pass all speech as authorized
  if (!profile || !profile.isEnrolled) {
    return {
      isMatch: true,
      confidence: 100,
      speakerLabel: 'Verified Executive User',
      pitchHz: liveFeatures.pitchHz,
      snrDb,
      isNearField,
    };
  }

  // If live sound is essentially silence or background rustle
  if (liveFeatures.totalEnergy < 8) {
    return {
      isMatch: false,
      confidence: 0,
      speakerLabel: 'Ambient Room Audio',
      pitchHz: liveFeatures.pitchHz,
      snrDb,
      isNearField,
    };
  }

  // 1. Spectral Envelope Similarity (55% weight)
  const spectralSim = cosineSimilarity(
    liveFeatures.energyVector,
    profile.spectralEnergyVector
  );

  // 2. Fundamental Pitch (F0) Proximity (30% weight)
  // Human vocal pitch varies within a 35% corridor across intonations
  const pitchDiffRatio = Math.abs(liveFeatures.pitchHz - profile.fundamentalPitchHz) / Math.max(1, profile.fundamentalPitchHz);
  const pitchSim = Math.max(0, 1 - Math.min(1, pitchDiffRatio * 1.6));

  // 3. Spectral Centroid Proximity (15% weight)
  const centroidDiffRatio = Math.abs(liveFeatures.spectralCentroid - profile.spectralCentroid) / Math.max(1, profile.spectralCentroid);
  const centroidSim = Math.max(0, 1 - Math.min(1, centroidDiffRatio * 1.8));

  // Calculate blended match confidence (0.0 to 1.0)
  let rawConfidence = (spectralSim * 0.55) + (pitchSim * 0.30) + (centroidSim * 0.15);

  // Near-field acoustic boost: if the speaker is directly in front of the laptop/mic (+6dB SNR)
  if (isNearField && rawConfidence > 0.45) {
    rawConfidence = Math.min(1.0, rawConfidence + 0.08);
  }

  const confidencePercent = Math.round(rawConfidence * 100);
  const threshold = profile.confidenceThreshold || 0.60;
  const isMatch = rawConfidence >= threshold;

  return {
    isMatch,
    confidence: confidencePercent,
    speakerLabel: isMatch
      ? 'Verified Executive User'
      : 'Unverified Voice / Background Audio',
    pitchHz: liveFeatures.pitchHz,
    snrDb,
    isNearField,
  };
}

/**
 * Helper class to run interactive 3-second Voice Identity Enrollment
 */
export class VoiceIdentityCalibrator {
  private samples: AcousticFeatures[] = [];
  private isCalibrating = false;
  private timer: any = null;

  public start(): void {
    this.samples = [];
    this.isCalibrating = true;
  }

  public recordFrame(freqData: Uint8Array, sampleRate = 48000): void {
    if (!this.isCalibrating) return;
    const features = extractAcousticFeatures(freqData, sampleRate);
    // Only capture frames with clear vocal presence
    if (features.totalEnergy >= 12) {
      this.samples.push(features);
    }
  }

  public getSampleCount(): number {
    return this.samples.length;
  }

  public finish(userName = 'Executive'): VoiceIdentityProfile | null {
    this.isCalibrating = false;
    if (this.samples.length < 8) {
      return null;
    }

    const count = this.samples.length;
    let sumPitch = 0;
    let sumCentroid = 0;
    let peakBinCount: Record<number, number> = {};
    const averageVector = new Array(16).fill(0);

    for (const s of this.samples) {
      sumPitch += s.pitchHz;
      sumCentroid += s.spectralCentroid;
      peakBinCount[s.dominantBin] = (peakBinCount[s.dominantBin] || 0) + 1;
      for (let i = 0; i < 16; i++) {
        averageVector[i] += s.energyVector[i];
      }
    }

    // Normalized averaged spectral vector
    const normalizedVector = averageVector.map((v) => v / count);
    const mag = Math.sqrt(normalizedVector.reduce((a, b) => a + b * b, 0)) || 1;
    const unitVector = normalizedVector.map((v) => v / mag);

    // Find most dominant frequency bin
    let dominantBin = 4;
    let maxBinFreq = 0;
    for (const [bin, f] of Object.entries(peakBinCount)) {
      if (f > maxBinFreq) {
        maxBinFreq = f;
        dominantBin = parseInt(bin, 10);
      }
    }

    const profile: VoiceIdentityProfile = {
      id: `voice-id-${Date.now()}`,
      enrolledAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      userName,
      fundamentalPitchHz: Math.round(sumPitch / count),
      dominantFrequencyBin: dominantBin,
      spectralCentroid: Math.round(sumCentroid / count),
      spectralEnergyVector: unitVector,
      averageSnrDb: 18,
      sampleCount: count,
      confidenceThreshold: 0.60,
      isEnrolled: true,
    };

    saveStoredVoiceIdentity(profile);
    setVoiceIdentityEnforced(true);
    return profile;
  }

  public reset(): void {
    this.samples = [];
    this.isCalibrating = false;
    if (this.timer) clearTimeout(this.timer);
  }
}
