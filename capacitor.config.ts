import type { CapacitorConfig } from '@capacitor/cli';

/**
 * BingoBolla — Capacitor configuration
 *
 * Estrategia: WebView remoto.
 * La app nativa (iOS / Android) carga la web de producción desplegada en Vercel.
 * Esto permite mantener un único codebase Next.js (App Router + Server Components
 * + Supabase SSR) y publicar simultáneamente en App Store, Google Play y la web,
 * sin necesidad de exportación estática.
 *
 * Para builds offline / dev local, comenta el bloque `server` y usa un build
 * estático en `webDir` (no recomendado mientras se usen Server Components).
 */
const config: CapacitorConfig = {
  appId: 'com.bingobolla.app',
  appName: 'BingoBolla',
  webDir: 'public',
  server: {
    url: 'https://www.bingobolla.com',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
    // Solo aceptamos navegación dentro de nuestros dominios; cualquier otro link
    // (Stripe Checkout, soporte, redes sociales) se abrirá fuera de la app.
    allowNavigation: [
      'www.bingobolla.com',
      'bingobolla.com',
      '*.bingobolla.com',
      '*.supabase.co',
      '*.supabase.in',
    ],
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: '#08080c',
  },
  android: {
    backgroundColor: '#08080c',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#08080c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#08080c',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
