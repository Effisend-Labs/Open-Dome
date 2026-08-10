# Altaga Expo Template

An ultra-minimalist, high-end Expo starting block designed for rapid cross-platform development (Web, iOS, Android). 

This template strips away the bloat of standard boilerplates while providing robust, hidden infrastructure. It comes pre-configured with reactive styling math, cross-platform secure storage fail-safes, universal state management, and a highly opinionated "Luxury Dark" minimalist aesthetic out of the box.

---

## 🌟 Philosophy: The "Aesthetic Provocateur"
Most modern apps suffer from the "AI Look"—soft glows, rounded generic cards, and diffused drop shadows. This template purposefully rejects that. 
- **Brutal & Editorial**: Zero drop shadows. Sharp interfaces relying on pure whitespace and aggressive layout grids.
- **Typographic Hierarchy**: Massive, high-contrast display titles paired with tiny, wide-tracked monospace metadata.
- **Deep Palette**: Built on a foundation of Rich Black (`#0A0A0A`) with reserved, high-impact Metallic Gold (`#D4AF37`) accents.

---

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the Development Server**
   ```bash
   npm run start
   ```
   *Note: Web, iOS, and Android builds are pre-configured. Use `npm run web` to start the web compiler specifically.*

---

## 📂 Project Architecture

```text
src/
├── app/                  # Expo Router (File-based navigation)
│   ├── _layout.js        # Wraps the app in Context & Providers
│   ├── index.js          # Entry Router / Splash Logic
│   └── (screens)/        # Your core application screens go here
├── assets/               # Template imagery and icons
├── core/                 # The aesthetic engine
│   └── styles.js         # Reactive GlobalStyles and design tokens
├── hocs/                 
│   └── useHOCS.js        # High-Order Components for legacy Class compatibility
├── providers/            # Infrastructure
│   ├── contextModule.js  # Global State (React Context API)
│   ├── contextLoader.js  # Loader logic tied to Global State
│   └── smartProvider.js  # Responsive math calculation logic
├── utilsAPI/             # Backend / Middlewares
│   ├── corsHelper.js     # Configures Cross-Origin Resource Sharing
│   └── withSecurity.js   # Middleware wrapper for protected API routes
└── utilsApp/             
    └── utils.js          # Cross-platform secure storage and mathematical utilities
```

---

## 🛠 Usage & Implementation Guide

### 1. The Global Styling Engine (`smartSize`)
Unlike generic templates that use static pixel counts, this template uses a mathematical multiplier to ensure your app looks identical on a 4K Web screen, an iPad, and an iPhone Mini.

**How to use it in a new screen:**
Whenever you build a new screen, always wrap your styles in the `smartSize` context.

```javascript
import { View, Text } from "react-native";
import { createGlobalStyles } from "../../core/styles";
import { useSmartSize } from "../../providers/smartProvider";

export default function DashboardScreen() {
  // 1. Hook into the layout math
  const smartSize = useSmartSize();
  const { normalize } = smartSize; 
  
  // 2. Hydrate the global styles with current screen dimensions
  const GlobalStyles = createGlobalStyles(smartSize);

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        {/* Uses the pre-defined Luxury Dark header typography */}
        <Text style={GlobalStyles.heroTitle}>Dashboard</Text> 
      </View>
      
      {/* Use normalize() for custom, on-the-fly padding that scales */}
      <View style={{ padding: normalize(20) }}>
        <Text style={GlobalStyles.bodyText}>System Operational.</Text>
      </View>
    </View>
  );
}
```

### 2. Changing the Aesthetic (Theming)
All design tokens live in `src/core/styles.js`. 
To re-theme the template away from "Luxury Dark", simply change the hex codes at the top of the file:
```javascript
export const backgroundColor = "#080808"; // Change to #F9F9F6 for a white mode
export const cardColor = "#1C1C1E";       // Elevated surface
export const accentColor = "#D4AF37";     // Change to your brand color
```

### 3. Bulletproof Cross-Platform Storage
Standard implementations of `expo-secure-store` immediately crash when compiled for the Web. This template includes a wrapper in `utilsApp/utils.js` that catches this crash automatically.

**Storing Encrypted Session Data (Works on Web & Native!):**
```javascript
import { setEncryptedStorageValue, getEncryptedStorageValue } from "../../utilsApp/utils";

async function loginUser(token) {
  // On iOS/Android: This saves to the Keychain/Keystore.
  // On Web: This cleanly catches the error and saves to AsyncStorage.
  await setEncryptedStorageValue({ authToken: token }, "UserSession");
}

async function checkAuth() {
  const token = await getEncryptedStorageValue("authToken", "UserSession");
  if (token) console.log("User is logged in!");
}
```

### 4. Global State (Context API)
Don't reach for Redux immediately. This template comes with `ContextProvider` pre-installed inside `_layout.js`.

**Accessing State:**
```javascript
import { Context } from "../../providers/contextModule";
import { useContext } from "react";

export default function Profile() {
  // Access global variables seamlessly across the entire app
  const { value } = useContext(Context);
  const user = value.userConfig;

  // You can also use the built-in setState: value.setUserConfig(newUser)
}
```

### 5. Writing Secure API Routes (Expo Web)
If you utilize Expo Router API logic (the `+api.js` files), you must manage CORS and Security for Web builds. This template provides a pre-built wrapper.

```javascript
// src/app/api/secureData+api.js
import { withSecurity } from "../../utilsAPI/withSecurity";

async function handler(request) {
  return Response.json({ internalData: "Top Secret" });
}

// Wrapping the handler automatically injects CORS headers and Error catching
export const GET = withSecurity(handler);
```

### 6. Legacy Support (HOCs)
For teams migrating older React Class Components, the `useHOCS` middleware is provided. Wrap any old class component in `useHOCS` to instantly give it access to Expo Router's `useNavigation` and `useGlobalSearchParams` hooks.

---

## ⚖️ Final Notes
- **React Compiler Enabled:** This project opts into React 19's Compiler in `app.json` for massive performance gains. Write your logic naturally; you generally do not need `useMemo` or `useCallback`.
- **Typing:** Typed Routes are enabled by default, ensuring navigation integrity across large routing stacks.
