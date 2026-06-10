---
name: "ui-ux-pro-max"
description: "Provides advanced UI/UX design-system guidance (banking/fintech patterns, motion, accessibility). Invoke when improving UI, landing pages, dashboards, or visual polish."
---

# UI UX Pro Max (Trae Skill)

Use this skill when the user asks to modernize UI/UX, redesign a landing page, add advanced sections/animations, or improve visual hierarchy for a banking/fintech web app.

## Core Rules (Fintech / Banking)

1. Trust-first visuals: readable typography, restrained gradients, clear CTAs, consistent spacing.
2. Motion: subtle, purposeful, and respects `prefers-reduced-motion`.
3. Accessibility: contrast, keyboard focus, tap targets, avoid overly thin text.
4. Data UI: show deltas (up/down), timestamps, clear labels, and consistent number formatting.
5. Security UI: sensitive fields default to masked with explicit reveal controls.

## Recommended Layout Pattern (Landing)

- Hero (primary CTA + secondary CTA) with one clear promise
- Social proof (testimonials, trust metrics)
- Product highlights (features)
- Analytics/markets preview (charts + leaderboards)
- Security section
- Contact/CTA footer

## Style System Defaults

- Typography: modern sans for body + stronger display font for headings.
- Components: cards with subtle borders, soft shadows, consistent radii (14–22px).
- Colors: navy primary, blue accent, gold highlight; dark mode uses deep neutrals.
- Micro-interactions: 150–300ms transitions; hover lifts; animated numeric deltas.

## Implementation Checklist

- Buttons: primary + secondary, with consistent sizes and spacing.
- Navigation: hover previews ok on desktop, fallback on mobile.
- Charts: animate on entry; use tooltips; keep gridlines subtle.
- Tables/leaderboards: fixed columns, blinking highlight on value changes, show price + %.
- Mobile: avoid clipped hero visuals; constrain widths; center key cards; test 375px.

## Output Expectations

When applying this skill, update existing files (avoid new files unless necessary), keep code consistent with the repo style, and validate with diagnostics and a browser preview.
