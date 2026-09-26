# Where this stands

Branch: `claude/eager-ritchie-lab6wf` · file: `index.html` (root)

## Done

- Full site built to `docs/brief.md`. Content audited: positioning line verbatim,
  address, phone, fax, Janie White, all 4 services, all 9 conditions, every
  anchor resolves, 10 phone CTAs, 7 "Book a Consultation", 5 "Make a Referral".
- Silk pass: expo-out easing, blur-in scroll reveals, soft shadow stack, frosted
  glass, SVG grain overlay, button sheen. Collapses under prefers-reduced-motion.
- Photography system: 9 `.ph` frames wired. Each paints a navy duotone plate that
  stays visible until its `<img>` decodes, so missing photos read as design.
- Verified: HTML nesting clean, no horizontal overflow 320–1920px, no JS errors,
  no nav wrapping — in both the photo and no-photo states.

## Open

1. **Photos.** Nine files, see `assets/README.md` for names, crops, sizes. The
   session that built this had no network access to hyox.com or any image host,
   so none were sourced. Site ships fine without them.
2. **Social URLs** in the footer are guessed handles — marked with a TODO comment.
3. **Contact form** builds a `mailto:` to janiew@hyox.com. No backend. If real
   submissions are wanted, that needs an endpoint (and PHI-appropriate handling).
4. **Footer disclosure** — "Photography on this site is illustrative and does not
   depict actual patients." Remove only when every pictured person is a real
   patient with a signed release.
