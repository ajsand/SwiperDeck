# SwiperDeck

A swipe-first taste profile app built with Expo (SDK 54) and React Native.

## Development

### Prerequisites

- Node.js (LTS)
- npm

### Setup

```bash
npm install
```

### Quality Gates

Run these before committing:

```bash
npm run typecheck       # TypeScript strict check (tsc --noEmit)
npm run lint            # ESLint via Expo (flat config, SDK 54+)
npm run format:check    # Prettier formatting check
```

CI expects all three to exit 0.

### Fixing Issues

```bash
npm run lint:fix        # Auto-fix lint errors
npm run format          # Auto-format all files with Prettier
```

### Running the App

```bash
npm start               # Expo dev server
npm run web             # Web
npm run ios             # iOS simulator
npm run android         # Android emulator
```

### Testing

```bash
npm test                # Jest test suite
```
