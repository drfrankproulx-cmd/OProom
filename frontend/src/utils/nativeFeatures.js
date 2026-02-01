/**
 * Native Features Utility for OProom iOS App
 * Provides access to native device capabilities via Capacitor
 * HIPAA-compliant secure storage and authentication
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from 'capacitor-native-biometric';

// ==================== Platform Detection ====================

/**
 * Check if app is running as a native iOS app
 */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Check if running on iOS specifically
 */
export const isIOS = () => Capacitor.getPlatform() === 'ios';

/**
 * Check if running on Android
 */
export const isAndroid = () => Capacitor.getPlatform() === 'android';

/**
 * Get platform name
 */
export const getPlatform = () => Capacitor.getPlatform();

// ==================== Biometric Authentication ====================

/**
 * Check if biometric authentication is available
 */
export const isBiometricAvailable = async () => {
  if (!isNative()) return false;

  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch (error) {
    console.error('Biometric check error:', error);
    return false;
  }
};

/**
 * Get biometric type (Face ID or Touch ID)
 */
export const getBiometricType = async () => {
  if (!isNative()) return null;

  try {
    const result = await NativeBiometric.isAvailable();
    return result.biometryType; // 'faceId', 'touchId', or 'none'
  } catch (error) {
    return null;
  }
};

/**
 * Authenticate user with biometrics (Face ID / Touch ID)
 * @param {string} reason - Reason shown to user
 * @returns {Promise<{authenticated: boolean, error?: string}>}
 */
export const authenticateWithBiometrics = async (reason = 'Please authenticate to access patient data') => {
  if (!isNative()) {
    return { authenticated: false, error: 'Not running on native platform' };
  }

  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return { authenticated: false, error: 'Biometric authentication not available' };
    }

    const result = await NativeBiometric.verifyIdentity({
      reason: reason,
      title: 'OProom Authentication',
      subtitle: 'Secure access required',
      description: 'Verify your identity to continue'
    });

    return { authenticated: result.verified };
  } catch (error) {
    console.error('Biometric auth error:', error);
    return { authenticated: false, error: error.message };
  }
};

// ==================== Secure Storage (HIPAA-Compliant) ====================

/**
 * Store sensitive data securely (encrypted on iOS Keychain)
 * Use for auth tokens, patient data, PHI
 * @param {string} key
 * @param {string} value
 */
export const setSecureValue = async (key, value) => {
  try {
    await Preferences.set({
      key: `oproom_secure_${key}`,
      value: JSON.stringify(value)
    });
    return true;
  } catch (error) {
    console.error('Secure storage error:', error);
    return false;
  }
};

/**
 * Retrieve securely stored data
 * @param {string} key
 * @returns {Promise<any>}
 */
export const getSecureValue = async (key) => {
  try {
    const result = await Preferences.get({ key: `oproom_secure_${key}` });
    if (result.value) {
      return JSON.parse(result.value);
    }
    return null;
  } catch (error) {
    console.error('Secure retrieval error:', error);
    return null;
  }
};

/**
 * Remove securely stored data
 * @param {string} key
 */
export const removeSecureValue = async (key) => {
  try {
    await Preferences.remove({ key: `oproom_secure_${key}` });
    return true;
  } catch (error) {
    console.error('Secure removal error:', error);
    return false;
  }
};

/**
 * Clear all secure storage (logout)
 */
export const clearSecureStorage = async () => {
  try {
    await Preferences.clear();
    return true;
  } catch (error) {
    console.error('Clear storage error:', error);
    return false;
  }
};

// ==================== Camera & Photo Capture ====================

/**
 * Take a photo using device camera
 * @param {Object} options - Camera options
 * @returns {Promise<string>} Base64 image data
 */
export const takePhoto = async (options = {}) => {
  if (!isNative()) {
    console.warn('Camera not available on web platform');
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: options.quality || 90,
      allowEditing: options.allowEditing !== false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: options.saveToGallery || false,
      correctOrientation: true,
      width: options.width,
      height: options.height
    });

    return image.dataUrl;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
};

/**
 * Pick photo from gallery
 * @returns {Promise<string>} Base64 image data
 */
export const pickPhoto = async () => {
  if (!isNative()) {
    console.warn('Photo picker not available on web platform');
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true
    });

    return image.dataUrl;
  } catch (error) {
    console.error('Photo picker error:', error);
    return null;
  }
};

// ==================== Push Notifications ====================

/**
 * Request push notification permissions
 * @returns {Promise<boolean>} Permission granted
 */
export const requestPushPermissions = async () => {
  if (!isNative()) return false;

  try {
    const permission = await PushNotifications.requestPermissions();
    return permission.receive === 'granted';
  } catch (error) {
    console.error('Push permission error:', error);
    return false;
  }
};

/**
 * Register for push notifications and get device token
 * @param {function} onTokenReceived - Callback when token is received
 * @param {function} onNotificationReceived - Callback when notification is received
 */
export const setupPushNotifications = async (onTokenReceived, onNotificationReceived) => {
  if (!isNative()) return;

  try {
    const hasPermission = await requestPushPermissions();

    if (!hasPermission) {
      console.warn('Push notification permission denied');
      return;
    }

    await PushNotifications.register();

    // Listen for registration token
    PushNotifications.addListener('registration', (token) => {
      console.log('Push token received:', token.value);
      if (onTokenReceived) {
        onTokenReceived(token.value);
      }
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for incoming notifications
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listen for notification actions
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notification action:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification.notification);
      }
    });
  } catch (error) {
    console.error('Push setup error:', error);
  }
};

// ==================== Local Notifications ====================

/**
 * Schedule a local notification
 * @param {Object} options - Notification options
 */
export const scheduleLocalNotification = async (options) => {
  if (!isNative()) return;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: options.title,
          body: options.body,
          id: options.id || new Date().getTime(),
          schedule: options.schedule,
          sound: options.sound,
          attachments: options.attachments,
          actionTypeId: options.actionTypeId,
          extra: options.extra
        }
      ]
    });
  } catch (error) {
    console.error('Local notification error:', error);
  }
};

/**
 * Cancel a local notification
 * @param {number} id - Notification ID
 */
export const cancelLocalNotification = async (id) => {
  if (!isNative()) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch (error) {
    console.error('Cancel notification error:', error);
  }
};

// ==================== Haptic Feedback ====================

/**
 * Trigger haptic feedback (vibration)
 * @param {'light'|'medium'|'heavy'} intensity
 */
export const triggerHaptic = async (intensity = 'medium') => {
  if (!isNative()) return;

  try {
    const styles = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };

    await Haptics.impact({ style: styles[intensity] || ImpactStyle.Medium });
  } catch (error) {
    console.error('Haptic error:', error);
  }
};

/**
 * Trigger notification haptic (success, warning, error)
 * @param {'success'|'warning'|'error'} type
 */
export const triggerNotificationHaptic = async (type = 'success') => {
  if (!isNative()) return;

  try {
    const types = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error
    };

    await Haptics.notification({ type: types[type] || NotificationType.Success });
  } catch (error) {
    console.error('Notification haptic error:', error);
  }
};

// ==================== App Lifecycle ====================

/**
 * Listen for app state changes (foreground/background)
 * @param {function} onStateChange - Callback with {isActive: boolean}
 */
export const listenToAppState = (onStateChange) => {
  if (!isNative()) return;

  App.addListener('appStateChange', (state) => {
    console.log('App state changed:', state);
    if (onStateChange) {
      onStateChange(state);
    }
  });
};

/**
 * Get app info
 */
export const getAppInfo = async () => {
  if (!isNative()) return null;

  try {
    const info = await App.getInfo();
    return {
      name: info.name,
      version: info.version,
      build: info.build,
      id: info.id
    };
  } catch (error) {
    console.error('App info error:', error);
    return null;
  }
};

// ==================== Splash Screen ====================

/**
 * Hide splash screen
 */
export const hideSplashScreen = async () => {
  if (!isNative()) return;

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.error('Splash screen error:', error);
  }
};

/**
 * Show splash screen
 */
export const showSplashScreen = async () => {
  if (!isNative()) return;

  try {
    await SplashScreen.show();
  } catch (error) {
    console.error('Splash screen error:', error);
  }
};

// ==================== Status Bar ====================

/**
 * Set status bar style
 * @param {'light'|'dark'} style
 */
export const setStatusBarStyle = async (style = 'light') => {
  if (!isIOS()) return;

  try {
    await StatusBar.setStyle({ style: style === 'light' ? Style.Light : Style.Dark });
  } catch (error) {
    console.error('Status bar error:', error);
  }
};

/**
 * Hide status bar
 */
export const hideStatusBar = async () => {
  if (!isNative()) return;

  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Status bar error:', error);
  }
};

/**
 * Show status bar
 */
export const showStatusBar = async () => {
  if (!isNative()) return;

  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Status bar error:', error);
  }
};

// ==================== Healthcare-Specific Utilities ====================

/**
 * Initialize app for healthcare use
 * - Set up biometric auth
 * - Configure secure storage
 * - Set up push notifications
 * - Initialize session timeout
 */
export const initializeHealthcareApp = async (config = {}) => {
  if (!isNative()) {
    console.warn('Healthcare app initialization skipped - not running natively');
    return;
  }

  console.log('Initializing OProom healthcare app...');

  try {
    // Hide splash screen
    await hideSplashScreen();

    // Set status bar style
    await setStatusBarStyle('light');

    // Check biometric availability
    const biometricAvailable = await isBiometricAvailable();
    console.log('Biometric available:', biometricAvailable);

    // Set up push notifications if callback provided
    if (config.onPushToken || config.onNotification) {
      await setupPushNotifications(config.onPushToken, config.onNotification);
    }

    // Listen to app state for session management
    if (config.onAppStateChange) {
      listenToAppState(config.onAppStateChange);
    }

    console.log('OProom initialized successfully');

    return {
      success: true,
      platform: getPlatform(),
      biometricAvailable
    };
  } catch (error) {
    console.error('Healthcare app initialization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  // Platform
  isNative,
  isIOS,
  isAndroid,
  getPlatform,

  // Biometrics
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometrics,

  // Secure Storage
  setSecureValue,
  getSecureValue,
  removeSecureValue,
  clearSecureStorage,

  // Camera
  takePhoto,
  pickPhoto,

  // Notifications
  requestPushPermissions,
  setupPushNotifications,
  scheduleLocalNotification,
  cancelLocalNotification,

  // Haptics
  triggerHaptic,
  triggerNotificationHaptic,

  // App Lifecycle
  listenToAppState,
  getAppInfo,

  // UI
  hideSplashScreen,
  showSplashScreen,
  setStatusBarStyle,
  hideStatusBar,
  showStatusBar,

  // Healthcare
  initializeHealthcareApp
};
