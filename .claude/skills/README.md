# Installed skills

Third-party design skills, vendored so the whole team gets the same guidance.

## From github.com/emilkowalski/skills (MIT)

Pure markdown — no scripts, no API keys, no network calls.

- **apple-design** — fluid motion, springs, interruptibility, translucent
  materials, size-specific typography. This is about *how things move and
  feel*, not about being white and airy; it applies to a dark UI unchanged.
- **animate**, **improve-animations**, **find-animation-opportunities**,
  **review-animations**, **animation-vocabulary**
- **emil-design-eng**, **pick-ui-library**

## From github.com/nextlevelbuilder/ui-ux-pro-max-skill

- **ui-ux-pro-max** — searchable local data: 192 colour palettes, 192 product
  profiles, 1,934 Google fonts, 105 icons, 25 chart types, 17 motion presets.
- **ui-styling** — shadcn / Radix / Tailwind patterns, which matches this stack.

**Deliberately not installed** from that repo: `design`, `design-system`,
`banner-design`, `brand`, `slides`. They are logo and image generators that
require paid third-party keys (`MUAPI_API_KEY`, `ATLASCLOUD_API_KEY`,
`GEMINI_API_KEY`) and call out to api.muapi.ai and api.atlascloud.ai. Nothing
installed here needs a key or makes an outbound request.

## Not installed: Relume

`@relume_io/relume-ui` exists, but this project already runs Radix + shadcn on
its own design tokens. A second component library means two styling systems
competing over the same elements. Relume's layout patterns can be borrowed
without taking the dependency.
