# Design System Specification: Culinary Precision
 
## 1. Overview & Creative North Star
In the high-stakes environment of a professional kitchen and restaurant floor, clarity is not just an aesthetic choice—it is an operational requirement. This design system is built upon the Creative North Star of **"The Kinetic Gallery."**
 
Unlike traditional, boxy administrative interfaces that feel heavy and static, this system treats data as editorial content. By utilizing intentional asymmetry, expansive whitespace, and sophisticated tonal layering, we transform a management tool into a high-end digital experience. The system breaks the "template" look by favoring depth over lines and motion over clutter, ensuring that while the brand feels "Professional and Efficient," it also feels bespoke and premium.
 
---
 
## 2. Color Theory: Tonal Depth & The No-Line Rule
The palette is anchored by a high-chroma Primary Red, balanced by an expansive range of sophisticated neutrals.
 
### Palette Highlights
*   **Primary (`#b90014`):** Our "Vibrant Professional Red." Use this for high-impact actions and critical branding.
*   **Surface Tiers:** We utilize five levels of surface containers (`lowest` to `highest`) to create hierarchy.
*   **Tertiary Green (`#286740`):** Reserved for "Success" and "Ready" states in the KDS and billing.
 
### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts. For example, a `surface-container-low` sidebar should sit against a `surface` main content area. This creates a seamless, modern flow that mimics high-end physical stationery.
 
### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface` (`#f7f9ff`)
*   **Sectioning:** `surface-container-low` (`#f2f3f9`)
*   **Cards/Interactive Elements:** `surface-container-lowest` (`#ffffff`) 
 
### The "Glass & Gradient" Rule
For floating elements like modals or mobile navigation bars, use **Glassmorphism**. Apply a semi-transparent `surface` color with a `backdrop-blur: 12px`. For primary CTAs, apply a subtle linear gradient from `primary` to `primary_container` at 135 degrees to add "soul" and dimension.
 
---
 
## 3. Typography: Editorial Hierarchy
We use **Inter** for its neutral, architectural quality. The scale is designed to create an "Editorial" feel through high contrast between display and body text.
 
*   **Display (L/M/S):** Used for large data snapshots (e.g., daily revenue). High tracking (-0.02em) to maintain a tight, professional look.
*   **Headline (L/M/S):** Used for primary page titles. 
*   **Title (L/M/S):** Used for card headers and section titles.
*   **Body (L/M/S):** Optimized for high-speed readability in kitchen environments.
*   **Label (M/S):** Used for metadata, KDS timestamps, and table headers. Always use `on_surface_variant` to keep them secondary.
 
---
 
## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often messy. We convey depth through **Tonal Layering** and **Ambient Shadows**.
 
*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container` background to create a "soft lift." This is our primary method of containment.
*   **Ambient Shadows:** For floating elements (Modals, Toasts), use a shadow with a 24px-32px blur, 4% opacity, using the `primary` color as the shadow tint. This mimics natural light reflecting off a colored surface.
*   **The Ghost Border Fallback:** If a border is required for accessibility (e.g., input fields), use `outline_variant` at **20% opacity**. Never use a 100% opaque border.
*   **Glassmorphism:** Use for "floating" KDS status bars to allow the underlying order details to subtly bleed through, keeping the chef's focus on the workflow.
 
---
 
## 5. Components
 
### Action Buttons
*   **Primary:** Gradient fill (Primary to Primary Container), `8px` (DEFAULT) corner radius. White text. 
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary:** Transparent background, `primary` text. Use for low-emphasis actions like "Cancel" or "Edit."
 
### KDS High-Visibility Cards
*   **Structure:** Use `surface-container-lowest` for the card body. 
*   **Status Accent:** Use a 6px vertical "accent bar" on the left edge using `tertiary` (Ready) or `warning` (In-Progress) rather than coloring the whole card.
*   **Typography:** Order numbers should use `headline-lg` for instant recognition from 5 feet away.
 
### Input Fields
*   **Style:** Minimalist. No bottom line. Use a subtle `surface-container-highest` background.
*   **Focus State:** A 2px `primary` "Ghost Border" (low opacity) and a slight elevation shift.
 
### Data Tables & Lists
*   **The "No-Divider" Rule:** Forbid the use of horizontal divider lines between rows. Instead, use a `16px` vertical spacing gap or an alternating `surface-container-low` background on every other row. 
*   **Interactive Rows:** On hover, shift the background to `surface-container-high` and apply a `sm` ambient shadow.
 
### KDS Order Chips
*   **Selection Chips:** For filtering by "Station" (Grill, Prep, Dessert). Use `secondary_fixed` for inactive and `primary` for active.
 
---
 
## 6. Do's and Don'ts
 
### Do
*   **Do** use asymmetrical margins to create a sense of high-end editorial "flow" in the Manager's dashboard.
*   **Do** prioritize `surface-container` shifts over lines to separate sections.
*   **Do** use the `xl` (24px) roundedness for large-scale marketing or customer-facing mobile cards to feel "friendly."
*   **Do** ensure all interactive elements have a minimum touch target of 44px for busy waiters.
 
### Don't
*   **Don't** use pure black (`#000000`) for text. Use `on_surface` for better tonal harmony.
*   **Don't** use 1px solid borders to separate list items; use white space.
*   **Don't** use high-opacity drop shadows; they look "cheap" and dated.
*   **Don't** clutter the KDS view with non-essential information. If the chef doesn't need to see the "Order Date," hide it.
 
---
 
## 7. Device Support Strategy
*   **Desktop (Admin/KDS):** Focus on information density. Use the `body-sm` and `label-md` scales to maximize data visibility without clutter.
*   **Mobile (Waiter/Customer):** Focus on ergonomic reach. Use "Glassmorphism" bottom sheets for order modifiers. Ensure the `primary` red is used sparingly but effectively to guide the user to the "Send Order" or "Pay" buttons.