# 📱 BingoBolla — Build móvil (iOS + Android)

Guía paso a paso para empaquetar BingoBolla como app nativa en **iOS** y **Android** usando **Capacitor 8**, sin reescribir el código Next.js.

> **Arquitectura:** la app nativa es un WebView que carga `https://www.bingobolla.com` (Vercel). Un solo deploy ⇒ web + iOS + Android.

---

## ✅ Requisitos previos (en tu Mac)

| Herramienta | Versión mínima | Cómo instalar |
|-------------|----------------|---------------|
| **Node.js** | 22 LTS o superior | https://nodejs.org/en/download o `brew install node@22` |
| **Xcode**   | 15.4+ | Mac App Store |
| **Xcode Command Line Tools** | última | `xcode-select --install` |
| **CocoaPods** | 1.15+ | `sudo gem install cocoapods` |
| **Android Studio** | Hedgehog 2023.1+ | https://developer.android.com/studio |
| **Java JDK** | 17 | Lo incluye Android Studio |
| **Cuentas Developer** | iOS Developer ($99/año) + Google Play Console ($25 una vez) | ✅ Ya las tienes |

Comprueba la versión de Node:
```bash
node --version   # debe imprimir v22.x.x o superior
```

---

## 🚀 1) Setup inicial (solo la primera vez)

Clona el repo en tu Mac y entra a la carpeta:
```bash
git clone <repo-url> bingobolla
cd bingobolla
npm install
```

Genera las dos plataformas nativas (esto crea `/ios` y `/android`):
```bash
npm run cap:add:ios
npm run cap:add:android
```

Sincroniza la configuración (`capacitor.config.ts`) con ambas plataformas:
```bash
npm run cap:sync
```

> 💡 Si modificas `capacitor.config.ts` en el futuro, vuelve a ejecutar `npm run cap:sync`.

---

## 🍎 2) Build iOS (TestFlight + App Store)

### 2.1 Abrir el proyecto en Xcode
```bash
npm run cap:open:ios
```

### 2.2 Configurar firma
1. En el navegador izquierdo de Xcode, selecciona el target **App**.
2. Pestaña **Signing & Capabilities** → marca **Automatically manage signing**.
3. Elige tu **Team** (cuenta Apple Developer).
4. **Bundle Identifier**: `com.bingobolla.app` (ya configurado).
5. Cambia el **Version** y **Build** number antes de cada release.

### 2.3 Iconos & Splash
Reemplaza los assets en:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- `ios/App/App/Assets.xcassets/Splash.imageset/`

Usa los PNG que ya tienes en `/public/icons/` como base. Recomendado: usa https://www.appicon.co para generar todos los tamaños.

### 2.4 Probar en simulador
```bash
npm run cap:run:ios
```
O desde Xcode: ▶️ **Run** (⌘+R).

### 2.5 Build para TestFlight
1. En Xcode: **Product → Archive**.
2. Espera a que termine el archive (5-10 min).
3. En la ventana **Organizer** que aparece: **Distribute App → App Store Connect → Upload**.
4. Sigue el wizard. La build aparecerá en https://appstoreconnect.apple.com → TestFlight tras 10-30 min de procesamiento.

### 2.6 Publicar en App Store
1. En App Store Connect, crea un nuevo App Record (si es la primera vez).
2. Llena descripción, capturas (6.7" iPhone Pro + iPad Pro), categoría "Games".
3. Selecciona la build subida por TestFlight.
4. **Submit for Review**.

⚠️ **App Store Review**: dado que es bingo/sweepstakes, prepárate para responder preguntas sobre cumplimiento legal (estado de los premios reales, geo-fencing, edad mínima). Categoría: *Games → Casino*.

---

## 🤖 3) Build Android (Play Console)

### 3.1 Abrir Android Studio
```bash
npm run cap:open:android
```

### 3.2 Configurar firma (keystore de release)
La primera vez crea un **keystore** (guárdalo seguro, sin él no podrás publicar updates):

```bash
keytool -genkey -v -keystore ~/bingobolla-release.keystore \
  -alias bingobolla -keyalg RSA -keysize 2048 -validity 10000
```

Te pedirá una contraseña y datos básicos. **Guarda el archivo `.keystore` y la contraseña en 1Password / un lugar seguro**.

Crea el archivo `android/keystore.properties` (NO lo subas a git):
```properties
storeFile=/Users/TU_USUARIO/bingobolla-release.keystore
storePassword=TU_PASSWORD
keyAlias=bingobolla
keyPassword=TU_PASSWORD
```

Edita `android/app/build.gradle` y añade arriba del bloque `android { ... }`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Dentro de `android { ... }` añade:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### 3.3 Iconos
Genera los iconos con **Android Studio → New → Image Asset** apuntando al PNG `/public/icons/icon-512.png`. Esto creará todos los `mipmap-*` y el adaptive icon.

### 3.4 Probar en emulador
```bash
npm run cap:run:android
```

### 3.5 Build de release (AAB para Play Store)
En Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**, elige tu keystore.

O por terminal:
```bash
cd android
./gradlew bundleRelease
```
El AAB sale en `android/app/build/outputs/bundle/release/app-release.aab`.

### 3.6 Subir a Play Console
1. https://play.google.com/console → tu app → **Production → Create new release**.
2. Sube el `.aab`.
3. Versiones: si es la primera vez, primero pasa por **Internal testing → Closed testing** antes de Production.
4. Rellena la ficha de tienda, política de privacidad (necesaria), clasificación de contenido.

⚠️ **Play Store**: bingo/sweepstakes está permitido si los premios son reales y se cumple la política de "Real-Money Gambling". Tendrás que solicitar el formulario de autorización por país. Categoría: *Games → Casino*.

---

## 🔄 4) Workflow día a día

Como la app es un WebView remoto, **cualquier cambio que despliegues a Vercel se reflejará automáticamente en las apps publicadas** sin necesidad de subir builds nuevas.

Solo necesitas un **nuevo build móvil** cuando:
- Cambias `capacitor.config.ts` (URL, plugins, scheme).
- Añades/actualizas un plugin nativo (`@capacitor/push-notifications`, etc.).
- Tocas íconos / splash / nombre.
- Tienes que cumplir un requisito nuevo de Apple/Google.

Comando rápido tras modificar config:
```bash
npm run cap:sync
npm run cap:open:ios     # o cap:open:android
```

---

## 🔔 5) Push notifications (opcional, plugin ya incluido)

El plugin `@capacitor/push-notifications` está instalado. Para activarlo necesitas:

**iOS**: Habilita la capability *Push Notifications* en Xcode → Signing & Capabilities → +Capability. Configura APNs en https://developer.apple.com/account → Keys.

**Android**: Crea un proyecto en Firebase https://console.firebase.google.com, descarga `google-services.json` y colócalo en `android/app/`.

Una vez configurado, llama desde el frontend:
```ts
import { PushNotifications } from '@capacitor/push-notifications';
await PushNotifications.requestPermissions();
await PushNotifications.register();
```

---

## 🆘 6) Troubleshooting

| Problema | Solución |
|----------|----------|
| `Node version too old` | `brew install node@22 && brew link --overwrite node@22` |
| Xcode pide firmar y no tienes Team | Apple ID → Xcode → Settings → Accounts → Add (gratis con cuenta personal para test) |
| `pod install` falla | `cd ios/App && pod repo update && pod install` |
| Gradle "SDK not found" | Android Studio → Settings → Languages & Frameworks → Android SDK → instala API 34 |
| WebView muestra "página no segura" | Asegúrate de que `www.bingobolla.com` responde 200 con HTTPS válido |
| Login Supabase falla en la app | Configura Supabase → Auth → URL Configuration → añade `capacitor://localhost` y `https://www.bingobolla.com` como Site URL / Redirect URLs |

---

## 📞 Soporte

Cualquier paso falla → guarda el log completo y vuelve a esta sesión con el error.

**Status actual:**
- ✅ `capacitor.config.ts` listo apuntando a `https://www.bingobolla.com`
- ✅ Dependencias Capacitor 8 instaladas
- ✅ Plataformas `/ios` y `/android` generadas
- ✅ `npm run cap:sync` ejecutado correctamente
- ✅ `public/index.html` añadido como fallback requerido por Capacitor/Android
- ✅ `npx cap doctor` pasa en iOS y Android
- ⏳ Firma + iconos + subida a tiendas
