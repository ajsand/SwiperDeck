# SwiperDeck

## Navigation route conventions

- Keep tab routes under `app/(tabs)/`; Deck remains `app/(tabs)/index.tsx` as the default tab entry route.
- Register top-level route groups in `app/_layout.tsx`: `(tabs)` for shell tabs, `details` for pushed detail screens, and `(modals)` for modal presentation.
- Use `app/details/_layout.tsx` to define detail stack options and keep detail screens grouped under `app/details/`.
- Use `app/(modals)/_layout.tsx` for modal stack options and place modal routes there (for example `/filter`).
- Keep dynamic route params in filename form (for example `app/details/[id].tsx`).
