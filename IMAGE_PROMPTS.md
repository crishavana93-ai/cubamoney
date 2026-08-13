# CubaRemesa — minimalist scroll-journey prompts

A single, clean visual motif that **transforms as the user scrolls**: one continuous
**thread of warm golden light** (carrying a folded banknote, NOT coins) leaves the
sender at the top, draws a minimal arc to Cuba in the middle, and arrives with the
family at the bottom. Minimalist = lots of empty warm-dark space, one focal element
per frame, no clutter. Each frame's light-thread exits where the next one enters, so
a scroll-crossfade between them reads as one continuous shot.

Generate the set with the same model + seed family for consistency. Save into
**`public/img/`** with the exact filenames.

## Global style (paste into every prompt)
> minimalist cinematic fintech still, premium and clean, vast negative space, one
> focal subject, matte near-black warm background (#0e0a08) with a soft golden glow,
> a single elegant thread of warm light (#f3b14e) with a faint teal edge (#2bb3a3) as
> the through-line, soft volumetric studio lighting, 85mm lens, shallow depth of field,
> fine film grain, photorealistic 3D-render quality, calm and high-end

## STRICT negative prompt (paste into the negative field)
> bitcoin, cryptocurrency, crypto, BTC symbol, blockchain, gold coins, coin piles,
> stock charts, graphs, busy particles, clutter, neon, rainbow colors, text, numbers,
> logos, watermark, UI text, lens dirt, low quality

---

### FRAME 1 · `hero.jpg` — "The send" (16:9, top of page)
> A single sleek matte smartphone held in one hand, lower-left third of the frame, screen emitting one slim ribbon of warm golden light that lifts a single folded banknote and curves gracefully toward the upper-right, then trails off the right edge. The rest of the frame is calm empty warm-dark space with a faint Havana skyline barely visible in deep golden bokeh. Centered focus on the light, generous breathing room.
> **Edge match:** light-thread exits at the RIGHT edge, mid-height.

### FRAME 2 · `malecon.jpg` — "The journey" (21:9 ultra-wide band)
> Almost empty ultra-wide dark frame. The same single golden light-thread ENTERS from the LEFT edge at mid-height, draws one clean minimal arc across the composition, and resolves into a small soft glowing point on the right — a faint, simple outline of the island of Cuba, no detailed map. Vast negative space, a few subtle drifting light specks only.
> **Edge match:** enters LEFT mid-height (from Frame 1), ends at the glowing Cuba point on the right.

### FRAME 3 · `family.jpg` — "The arrival" (3:2)
> Minimal, tender shot: a smiling elderly Cuban grandmother in soft golden light, placed to one side with clean empty space beside her, looking at a smartphone. The same warm light-thread descends gently from the top into her phone, a soft "received" glow on her face. Muted warm tones, shallow depth of field, nothing cluttered.
> **Edge match:** light-thread enters from the TOP, lands into her phone.

### FRAME 4 · `cta.jpg` — "Delivered" (16:9, closing)
> Extremely minimal: the warm light-thread resolves into a single soft glowing dot or gentle ring of light centered in a calm near-black warm frame, a faint banknote dissolving softly into light. Pure, premium, resolved. Maximum negative space.

### (optional) `havana-street.jpg` — secondary accent (3:2)
> Minimal: a hand holding a phone with the faint golden light-thread trailing from it, a heavily blurred warm Old Havana street far behind, lots of soft empty space.

---

## ⭐ RECOMMENDED — one continuous "scroll-scrubbed" film (`journey.mp4`)
For a true cinematic-video-that-plays-as-you-scroll (Apple-style), make **ONE
continuous 12–15s clip**, not several. I'll pin the hero and bind the video's
timeline to scroll position, so the whole film plays through as the user scrolls.

**Single prompt (16:9, 12–15s, one unbroken shot, slow deliberate camera):**
> One continuous minimalist cinematic shot on a matte near-black warm background (#0e0a08). A single elegant thread of warm golden light (#f3b14e, faint teal #2bb3a3 edge) rises out of a sleek smartphone held in a hand (lower-left), lifting one folded banknote; the camera glides right as the thread arcs across vast empty space, crossing a soft faint outline of the island of Cuba glowing warm on the right, then the thread descends gently into a second phone held by a smiling elderly Cuban grandmother in a golden-lit home, resolving into a soft "received" glow. Slow, elegant, seamless, lots of negative space, soft volumetric light, fine film grain, premium 3D-render-meets-photography.
> **Negative:** bitcoin, cryptocurrency, crypto, BTC symbol, coins, coin piles, stock charts, busy particles, clutter, neon, text, numbers, logos, watermark.

Export tips for smooth scrubbing: 1080p, ~24–30fps, H.264, and a short keyframe
interval (e.g. `ffmpeg -i in.mp4 -c:v libx264 -g 12 -pix_fmt yuv420p journey.mp4`).
Save as `public/img/journey.mp4`. Tell me when it's in and I'll wire the scroll player.

### Alternative — `hero.mp4` (short ~8s seamless loop, if you don't scrub)
> One continuous minimalist shot: a single thread of warm golden light lifts a folded banknote out of a phone, arcs across an almost-empty dark frame to a soft glowing point (Cuba), then settles into a calm glow. Slow, elegant, seamless loop. Negative: bitcoin, crypto, coins, text, logos, clutter.

---

**Folder on your Mac:** `/Users/cristianortizsuarez/Documents/Claude/Projects/Cuba Money/public/img/`

When you drop these in, tell me and I'll stack the sections edge-to-edge with a
scroll-linked crossfade so the light-thread hand-off between frames is seamless.
