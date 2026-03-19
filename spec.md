# Nibba Nibbi

## Current State
App uses a light pink/rose theme with white backgrounds, gradient-primary (pink-to-purple), glass navbar. Logo currently references a generated file path `/assets/generated/nibba-nibbi-logo-transparent.dim_400x400.png` which may be missing. Landing page has light sections with dark hero overlay.

## Requested Changes (Diff)

### Add
- Dark purple/deep violet app-wide theme matching uploaded reference image (IMG-20260319-WA0011.jpg)
- Starfield/bokeh radial glow background effect on landing hero and throughout app

### Modify
- **Logo**: Replace all logo image src references with `/assets/uploads/IMG-20260315-WA0015-1.jpg` (existing uploaded logo) across LandingPage.tsx, Layout.tsx, and any other component using the logo
- **index.css tokens**: Switch to dark theme - deep purple-black backgrounds, bright pink/magenta primary, purple secondary, all text light-colored
- **Landing page**: Dark purple gradient background hero, pill badge "The modern dating experience", large white bold title, italic subtitle, pink-to-purple CTA button, dark glass Sign In button, "Trusted by 12,000+" tagline at bottom. Light navbar with logo + Sign In + Get Started (purple pill button)
- **Layout/navbar**: Dark background with glass effect on dark, logo + app name, nav items styled for dark theme
- **All pages** (Feed, Discover, Search, Profile, Chat, Notifications, etc.): Dark purple/deep violet backgrounds, cards with dark glass/semi-transparent styling, pink/magenta accents for active states and buttons
- **tailwind.config.js**: Update theme tokens to reflect dark color palette

### Remove
- Light/white background on body and cards
- References to generated logo file that may not exist

## Implementation Plan
1. Update logo src in LandingPage.tsx and Layout.tsx to `/assets/uploads/IMG-20260315-WA0015-1.jpg`
2. Rewrite index.css with dark purple OKLCH tokens (dark backgrounds ~0.08-0.12 L, bright pink primary ~0.65 C:0.28 H:350, purple secondary ~0.55 C:0.24 H:295)
3. Add dark bokeh/starfield radial glow utility classes in index.css
4. Update LandingPage.tsx to match reference screenshot exactly - dark hero, pill badge, centered logo+title+subtitle, gradient CTA button, dark outline Sign In button
5. Update Layout.tsx navbar for dark theme (dark glass background)
6. Ensure all page backgrounds use dark theme tokens automatically via CSS variables
