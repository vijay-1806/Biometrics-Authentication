/**
 * Universal Behavioral Biometrics Client SDK Service Wrapper
 * Facilitates direct client-side integration of the BioAuth SDK in LMS.
 */

const DEFAULT_API_URL = import.meta.env.VITE_BIO_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/bio-api` : 'http://127.0.0.1:8000');
const DEFAULT_API_KEY = import.meta.env.VITE_BIO_API_KEY || 'bio_live_default_lms_key';

let activeBioInstance = null;

/**
 * Ensure the SDK is loaded on the window object
 */
export const ensureSdkLoaded = async () => {
  if (typeof window !== 'undefined' && window.BioAuth) {
    return window.BioAuth;
  }

  return new Promise((resolve, reject) => {
    // Check if already injected
    if (document.getElementById('bioauth-sdk-script')) {
      const interval = setInterval(() => {
        if (window.BioAuth) {
          clearInterval(interval);
          resolve(window.BioAuth);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(interval);
        if (window.BioAuth) resolve(window.BioAuth);
        else reject(new Error('BioAuth SDK load timeout'));
      }, 3000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'bioauth-sdk-script';
    script.src = '/sdk.js';
    script.onload = () => resolve(window.BioAuth);
    script.onerror = () => reject(new Error('Failed to load BioAuth SDK'));
    document.head.appendChild(script);
  });
};

/**
 * Get or create a BioAuth SDK instance for a user
 */
export const getBioAuthInstance = async (userId) => {
  await ensureSdkLoaded();
  const uid = userId || 'anonymous_student';

  if (!activeBioInstance || activeBioInstance.userId !== uid) {
    activeBioInstance = new window.BioAuth({
      apiKey: DEFAULT_API_KEY,
      userId: uid,
      apiUrl: DEFAULT_API_URL
    });
  }

  return activeBioInstance;
};

/**
 * Fetch the user's current biometric enrollment status directly from the ML API
 */
export const fetchBiometricStatus = async (userId) => {
  try {
    const bio = await getBioAuthInstance(userId);
    return await bio.getStatus();
  } catch (err) {
    console.warn('[BioAuth Service] Failed to fetch status:', err);
    return { state: 'collecting', samples_collected: 0, model_ready: false, error: err.message };
  }
};

/**
 * Open the Universal SDK Drop-in Calibration Modal
 */
export const openBiometricCalibrationModal = async (userId, options = {}) => {
  const bio = await getBioAuthInstance(userId);
  return bio.openEnrollmentModal({
    targetSamples: 20,
    ...options
  });
};

/**
 * Start continuous biometric session tracking for an exam/quiz
 */
export const startBiometricExamSession = async (userId, options = {}) => {
  const bio = await getBioAuthInstance(userId);
  bio.startSession(options);
  return bio;
};

/**
 * Stop active biometric session
 */
export const stopBiometricExamSession = () => {
  if (activeBioInstance) {
    activeBioInstance.endSession();
  }
};
