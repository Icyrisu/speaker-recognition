# Voice Identify (Speaker Recognition)

An Android-first mobile application built with **React Native Community CLI** and **TypeScript** designed to identify *who* is speaking (speaker recognition).

---

## Current Status: Phase 1 (UI & Mock Flow)

This repository currently implements **Phase 1** of the Voice Identify roadmap:
- **Clean UI & Navigation**: Bottom tab navigation featuring Home (Dashboard), Identification, Speakers, and Session History screens, plus an About/Settings view.
- **Simulated Inference**: A mock recognition engine with realistic states: Recognized speaker, Unknown speaker, and Error handling with retry logic.
- **Decoupled Architecture**: All UI components consume a typed `SpeakerRecognitionService` contract, ensuring future on-device ML models (e.g. MobileNet / CNN with MFCC feature extraction) can be plugged in seamlessly without UI refactoring.
- **Transparent Demo Mode**: Every simulation result is explicitly marked with `DEMO MODE` and `SIMULATED RESULT — NOT REAL AI`.
- **Vector Icons**: Built using `lucide-react-native` and `react-native-svg` (no emoji icons).
- **English Standard**: English is used across all UI screens, error messages, and documentation.

> **Note on Scope**: Phase 1 deliberately does not request microphone permissions or process live audio. On-device machine learning models, audio preprocessing (MFCC), and model binaries will be introduced in subsequent phases.

---

## Tech Stack

- **Framework**: React Native Community CLI (0.88+)
- **Language**: TypeScript (Strict typing)
- **Runtime**: React 19
- **Navigation**: React Navigation (Bottom Tabs & Native Stack)
- **Icons**: Lucide Icons (`lucide-react-native` + `react-native-svg`)
- **Bundler**: Metro
- **Target Platform**: Android (Tested on physical device via ADB Wireless Debugging)

---

## Getting Started

### Prerequisites

- **Node.js**: >= 22 LTS
- **Package Manager**: npm or yarn
- **Java Development Kit**: JDK 17
- **Android SDK & Platform Tools**: Android Studio with `adb` added to system PATH
- **Android Device**: Developer Options and Wireless Debugging enabled

### 1. Connect Android Device via Wireless Debugging

1. Ensure your PC and Android phone are on the same local Wi-Fi network.
2. On your phone, go to **Settings** → **Developer Options** → **Wireless Debugging**.
3. Tap **Pair device with pairing code**.
4. In your terminal, pair the device:
   ```bash
   adb pair <PHONE_IP>:<PAIRING_PORT>
   # Enter the 6-digit pairing code shown on screen
   ```
5. Connect to the device using the main connection port:
   ```bash
   adb connect <PHONE_IP>:<CONNECT_PORT>
   ```
6. Verify the device is connected:
   ```bash
   adb devices
   # Output should show: <PHONE_IP>:<CONNECT_PORT>   device
   ```

### 2. Start Metro Bundler

Open a terminal and start the Metro development server:

```bash
npm start
```

### 3. Build and Run on Android

In a separate terminal, build and deploy the app to your connected Android phone:

```bash
npm run android
```

---

## Project Structure

```text
src/
├── app/
│   ├── navigation/         # React Navigation stacks & bottom tabs
│   └── context/            # App-level session history context
├── components/             # Reusable UI primitives (Button, Card, Badge, EmptyState)
├── features/
│   ├── dashboard/          # Home / Overview screen
│   ├── identification/     # Recognition simulation screen
│   ├── speakers/           # Sample speaker directory & detail view
│   ├── history/            # Session recognition history
│   └── settings/           # About & Demo information
├── services/
│   └── speakerRecognition/ # Typed recognition service & mock implementation
├── data/                   # Fictional speaker fixtures
├── domain/                 # Core TypeScript domain entities & types
└── theme/                  # Design tokens (colors, typography, spacing)
```

---

## Roadmap

- [x] **Milestone 0**: Toolchain inspection & wireless ADB verification
- [ ] **Milestone 1**: App shell baseline running on physical Android device
- [ ] **Milestone 2**: Navigation and design system with Lucide vector icons
- [ ] **Milestone 3**: Screen implementations (Home, Identify, Speakers, History, Settings)
- [ ] **Milestone 4**: Mock recognition service integration and session history
- [ ] **Milestone 5**: Verification on device, lint, and typecheck
- [ ] **Future Phases (Requires Approval)**: Audio capture, MFCC extraction, MobileNet / CNN model training, and on-device TFLite inference.

---

## License

Private / Evaluator use.
