# Original build brief — HyOx Medical Treatment Center

Verbatim, as given at the start of the project.

---

Build a premium, single-page marketing website for a real, established hyperbaric medicine clinic. Output a single self-contained `index.html` (inline CSS + vanilla JS, no build step, no external frameworks). It must NOT look AI-generated — no generic centered hero with one flat button, no Bootstrap-ish cards, no lorem ipsum, no stock corporate-blue gradient. Treat this like a $15k custom medical-brand site.

## The business (use this REAL info exactly — sourced from hyox.com)

* Name: HyOx Medical Treatment Center
* What they do: Hyperbaric Oxygen Therapy (HBOT / HBO2) — board-certified hyperbaric medicine physicians prescribe 100% oxygen under pressure to help the body heal.
* Positioning statement (use as a real line on the site): "Delivering Hyperbaric Oxygen Therapy and Rehabilitation Services to Advance Wound Healing, Optimize Outcomes, and Improve Quality of Life."
* Signature credibility hooks (feature these prominently — they are the differentiators):
   * Georgia's largest hyperbaric chamber
   * Board-certified hyperbaric medicine physicians
   * Official dive-physical facility for the Georgia Aquarium
   * Accredited facility
* Location: 2550 Windy Hill Road SE, Suite 110, Marietta, Georgia 30067
* Phone: 678.303.3200 · Fax: 678.303.3205
* Contact: Janie White, Integration Manager — janiew@hyox.com
* Domain: hyox.com
* Audience: patients, referring physicians, and workers'-comp/case managers — plus divers and athletes.

## Real services (name these)

* Hyperbaric Oxygen Therapy (HBOT)
* Wound healing & rehabilitation services
* Dive physicals (Georgia Aquarium's official facility)
* Marx Protocol for head-and-neck / dental procedures (pre- and post-op HBOT)

## Real conditions treated (build the "What We Treat" section from these)

* Complications from cancer (including radiation injury / osteoradionecrosis (ORN))
* Complications from infection
* Complications from trauma
* Complications from wounds (chronic / non-healing wounds)
* Tooth-extraction complications in previously irradiated patients (Marx Protocol)
* Dive-related conditions
* Sports-related injuries and recovery
* Off-label / uncovered conditions (physician-evaluated)
* Workers' compensation cases

Keep medical claims responsible and physician-supervised; do NOT invent success-rate percentages.

## Navigation (match their real IA, streamlined)

Sticky slim nav: HYOX wordmark left; anchor links About · What We Treat · How It Works · Patients & Referrals · Contact; two right-side actions — a subtle "Make a Referral" link (for physicians) and a solid "Book a Consultation" button.

## Design direction (the important part)

* Style: clean, modern, flat with depth — generous white space, confident type, restrained medical palette. High-end health-tech brand, not a hospital brochure.
* Palette (from their logo): deep navy `#1B3A5B`, mid ocean blue `#3E7CB1`, bright accent cyan `#4FB0D9`, soft off-white `#F7FAFC`, near-black text `#0E1B2A`. Use the blue "wave" motif from their logo as a recurring animated SVG element (hero background + section dividers).
* Typography: geometric sans for headings (Space Grotesk or Sora via Google Fonts), clean sans for body (Inter). Big, tight headlines.
* Layout: asymmetric/editorial — off-center hero, alternating left/right rows, at least one floating/overlapping card that breaks the grid. Nothing all-centered.

## Animations (smooth and tasteful, not gimmicky)

* Scroll-reveal on sections/cards via IntersectionObserver, staggered ~80ms.
* Animated SVG wave (CSS keyframes) undulating in the hero and as section dividers.
* Subtle parallax / float on the hero chamber visual.
* Count-up stat counters when scrolled into view — use REAL, honest stats: "Georgia's LARGEST hyperbaric chamber," "100% oxygen," "60–120 min sessions," "Georgia Aquarium's official dive-physical facility."
* Buttons/cards micro-interactions: soft lift, shadow bloom, smooth color transitions on hover.
* Respect `prefers-reduced-motion`.

## Sections (in order)

1. Sticky nav (above).
2. Hero: headline like "Hyperbaric medicine that heals." + subhead using their positioning line; CTAs — primary "Book a Consultation," secondary "Call 678.303.3200" (tel: link). Animated wave + chamber visual.
3. Credibility strip: animated stats + the Georgia Aquarium partnership and "Georgia's largest chamber" called out as badges.
4. What We Treat: interactive card grid built from the real conditions above, each with an inline SVG icon and hover reveal.
5. How HBOT Works: animated horizontal timeline — Consult / Referral → Treatment Plan → Chamber Sessions (100% O₂ under pressure) → Wound Healing & Recovery.
6. Why HyOx: floating card highlighting Georgia's largest chamber, board-certified physicians, accreditation, Georgia Aquarium.
7. Patients & Referrals: two-column — "For Patients" (what to expect, book a consult) and "For Physicians" ("Make a Referral" CTA). Speaks to workers'-comp/case managers too.
8. CTA band: full-width navy close — "Ready to start healing?" + Book / Call buttons.
9. Contact: address, phone 678.303.3200, fax 678.303.3205, email janiew@hyox.com, embedded Google Map for 2550 Windy Hill Road SE Suite 110 Marietta GA 30067, and a simple contact form (name / phone / email / message → mailto or placeholder POST).
10. Footer: logo, nav, links to Facebook/Instagram/YouTube, a short responsible medical disclaimer, hyox.com.

## CTA rules

Action-first, specific: "Book a Consultation," "Call 678.303.3200," "Make a Referral," "See if HBOT is right for you." Primary buttons = accent cyan, impossible to miss. 4+ conversion points down the page. Serve BOTH patients and referring physicians.

## Technical

* One file, mobile-first, flawless at 375px and 1440px.
* Semantic, accessible HTML (alt text, aria labels, focus states, keyboard nav).
* Fast: no heavy libraries; inline SVG icons; Google Fonts only.
* Phrase every medical statement responsibly; invent no statistics.

Deliver the complete `index.html`, ready to open in a browser.

---

## Follow-up direction given later

* References: nexus.com and atlantacultureweek.com "both look better."
* Add patient pictures with good smiles.
* Make the site "more silk."
* Verify all information has been transported, is accounted for, and is correct.
