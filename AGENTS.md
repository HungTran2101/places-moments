# Places Moments — Agent Guidelines

Places Moments is a calm, map-based reflection app built with Next.js, TypeScript,
PostgreSQL, Prisma, MapLibre, Zustand, and Framer Motion.

The experience should feel like discovering quiet messages left around the world,
not browsing a social network. Emphasize place, atmosphere, and reflection over
activity or popularity.

## Always-on product rules

- Preserve the anonymous identity model. Identity is only a UUID stored in browser
  LocalStorage; do not introduce accounts, NextAuth, JWT sessions, or similar
  authentication systems.
- Do not introduce social mechanics such as likes, comments, followers, feeds,
  rankings, popularity metrics, or intrusive notifications.
- Never expose author identities or exact timestamps in public responses. Exact
  timestamps are only for the author's private history.
- Keep the primary flow minimal: open map → click to place a pin → write a
  description → submit.
- The 2D map is the primary interface. The planned 3D globe is secondary and
  atmospheric.
- Prefer calm, fluid transitions and subtle motion that support the emotional
  experience. Avoid aggressive or distracting effects.
- Favor readable, maintainable code over clever abstractions. Keep dependencies
  minimal and avoid unnecessarily heavy libraries.
- Keep realtime behavior subtle; new markers may animate quietly without sounds or
  pop-up notifications.

## Code comments

- Write comments explaining important logic in Vietnamese, especially data loading,
  map rendering, clustering, and lifecycle cleanup. Explain the reason or behavior
  rather than restating obvious code.

## Detailed context

Read only the documents relevant to the task:

- Product behavior and philosophy: `contexts/project.md`
- System structure and technical boundaries: `contexts/architecture.md`
- Planned phases and feature priority: `contexts/roadmap.md`
- General repository overview and setup: `README.md`

When documentation and implementation differ, do not silently choose one. Verify
whether the difference is an intentional product decision before changing behavior.
