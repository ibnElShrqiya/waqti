# WAQTI — Architecture & Phase 1 Guide

> **"Organize Your Time. Take Control of Your Life."**

This document describes the frontend foundation built in **Phase 1**, how mock data is isolated from production contracts, and how upcoming phases plug in without rewriting UI components.

---

## 1. Directory Structure

```
src/
├── app/                   # App bootstrap, router, DocumentSync (theme + RTL/LTR)
├── components/
│   ├── layout/            # AppShell, Sidebar, Topbar, MobileNav, Logo
│   ├── ui/                # Reusable design-system primitives (Button, Card, Dialog, …)
│   └── ErrorBoundary.tsx
├── config/
│   └── navigation.ts      # Single source of truth for all 13 routes + nav groups
├── data/
│   ├── repositories/      # Repository interfaces (UI depends ONLY on these)
│   ├── mock/              # ⚠️ Phase 1 isolated demo data & in-memory repositories
│   ├── index.ts           # Composition point (selects mock vs. future supabase)
│   └── queryKeys.ts       # Centralized TanStack Query keys
├── domain/                # Pure TypeScript domain types & business logic (no React)
├── features/
│   ├── dashboard/         # Dashboard queries, mutations, and dashboard cards
│   ├── profile/           # Current profile hook
│   └── tasks/             # QuickAddTaskDialog
├── hooks/                 # useMediaQuery, useOnlineStatus, useHotkey, useNow
├── i18n/                  # EN (LTR) + AR (RTL) dictionaries, Intl plural/date formatters
├── lib/                   # cn(), pure date helpers
├── pages/                 # Route-level pages (Dashboard, Settings, ModulePlaceholder, 404)
├── stores/                # Zustand stores (preferences, ephemeral UI, toasts)
├── styles/                # tokens.css (RGB CSS variables) & globals.css
└── test/                  # Vitest setup
```

---

## 2. Design System & Theming

- **Brand palette**: Primary Emerald `#102B26`, Secondary Emerald `#176B56`, Accent Gold `#D1AD70`, Warm Cream `#F5F2EA`, Night `#111816`.
- **Semantic tokens (`src/styles/tokens.css`)**: All colors are defined as RGB channels (`--canvas`, `--surface`, `--ink`, `--primary`, `--accent`, `--hero`, etc.) and mapped into Tailwind (`tailwind.config.ts`). Light and dark themes are tuned independently—dark mode uses layered night-emerald surfaces rather than inverted light colors.
- **No flash on load**: An inline script in `index.html` applies persisted `theme` (`light | dark | system`) and `locale` (`en | ar`) before first paint, and `DocumentSync` keeps `<html>` synchronized at runtime.
- **Typography**: `Inter Variable` for English (`ltr`); `Alexandria Variable` (display) + `IBM Plex Sans Arabic` (body) for Arabic (`rtl`).

---

## 3. Localization & RTL/LTR

- Every UI string lives in `src/i18n/locales/en.ts` and `src/i18n/locales/ar.ts`. TypeScript enforces that `ar` matches the exact structural shape of `en`.
- Plurals use `Intl.PluralRules` (`tp()`), handling all 6 Arabic CLDR categories (`zero`, `one`, `two`, `few`, `many`, `other`).
- Layouts use CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`) so RTL mirrors automatically without duplicate styles.

---

## 4. Data Isolation (Mock vs. Production)

- UI components and TanStack Query hooks never import from `src/data/mock/*`.
- They only call `repositories` from `src/data/index.ts`, which implements `src/data/repositories/types.ts`.
- All mock data is explicitly labeled in the UI with a **Demo data** badge (`source === 'mock'`) and clearly documented as session-only sample data.
- In **Phase 2**, Supabase repositories will implement the same interfaces and be selected via `VITE_DATA_SOURCE=supabase`.

---

## 5. Phased Roadmap

1. **Phase 1 (Complete)**: Project foundation, design tokens, light/dark themes, EN/AR + RTL/LTR, responsive shell, reusable UI primitives, Dashboard UI, Settings, isolated mock data.
2. **Phase 2**: Supabase setup, SQL migrations + RLS, Authentication, Profile & Preferences sync, full Task Management (`/tasks`).
3. **Phase 3**: Calendar & Time Blocking (daily/weekly/monthly, drag & drop, conflict detection), Habits & Goals.
4. **Phase 4**: Focus Mode (accurate background Pomodoro/custom timers), Optional Spiritual Life module, Notifications.
5. **Phase 5**: AI Assistant (**Rafiq** — provider abstraction for OpenAI & Gemini via Supabase Edge Functions, usage limits, approval flow) & Reports/Analytics.
6. **Phase 6**: Offline PWA (Service Worker, IndexedDB/Dexie sync queue), Freemium Subscription architecture, Admin Dashboard.
