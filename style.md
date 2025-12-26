# Front-end Style Guide: Tenant System

This document outlines the architectural and stylistic patterns used in the front-end of the Tenant System, specifically within the `worker/views/` and `worker/index.css` files.

## 1. Core Principles
- **Efficiency**: Minimal JavaScript on the client; logic is primarily server-side.
- **Interactivity**: Powered by **HTMX** for seamless, partial page updates without full reloads.
- **Theming**: Deep support for multiple visual "modes" beyond just Light and Dark.
- **Responsiveness**: Mobile-first design using Tailwind CSS.

## 2. Technology Stack
- **Engine**: Hono JSX (Server-Side Rendering).
- **Styling**: **Tailwind CSS v4** (utilizing OKLCH color spaces).
- **Icons**: [Lucide Icons](https://lucide.dev/).
- **Dynamic UI**: [HTMX](https://htmx.org/) (AJAX, CSS transitions, and DOM swapping).
- **Web Components**: Lightweight custom elements (e.g., `<theme-provider>`, `<app-toaster>`) for global state and UI feedback.

## 3. Theming System
The system uses a variable-based approach (Shadcn-like) with four distinct themes defined in `worker/index.css`:

| Theme | Characteristic | Vibe |
| :--- | :--- | :--- |
| **Light/Dark** | Modern, clean, balanced contrast. | Professional / Default |
| **Baked** | Warm, golden-browns, wheats, soft corners (`1rem`). | Cozy / Organic |
| **Techno** | High-contrast neon green on deep black, sharp edges (`0px`). | Cyberpunk / Retro |

### Color Tokens (OKLCH)
We use `oklch` for more perceptually uniform colors across modes:
- `--primary`: Main action color.
- `--background / --foreground`: Base colors for the canvas and text.
- `--muted / --muted-foreground`: Secondary text and subtle backgrounds.
- `--accent`: Highlighting interactive elements.

## 4. Typography
- **Sans-Serif**: `Montserrat` (Primary for UI, buttons, headings).
- **Serif**: `Domine` (Used for long-form content or specific stylistic accents).
- **Monospace**: `Source Code Pro` (Code blocks, technical data).

## 5. Layout Patterns
- **Main Shell**: Defined in `Layout.tsx`.
    - **Header**: Fixed top, glassmorphism effect (`backdrop-blur`). Contains global navigation and user/property selectors.
    - **Main**: Uses `hx-boost="true"` to intercept standard link clicks and convert them to AJAX requests.
    - **Footer**: Simple centered copyright and tech stack attribution.
- **Containers**: Standard `.container` class for max-width and horizontal centering.

## 6. Component Style
- **Dropdowns**: Implemented using native HTML `<details>` and `<summary>` for accessibility and no-JS fallback, styled with Tailwind for a custom "popover" look.
- **Buttons**:
    - **Primary**: Solid background (`bg-primary`), high contrast.
    - **Ghost/Outline**: Transparent background, border or hover-state accent.
- **Navigation**: Uses `currentPath` logic to highlight active states with `text-foreground` vs `text-muted-foreground`.

## 7. Animations & Interactivity
- **Marquee**: Custom CSS `infinite-marquee` for scrolling notifications or text.
- **Transitions**: Heavy use of `transition-colors` and `duration-200` for smooth hover states.
- **HTMX Swapping**: Uses `hx-swap="outerHTML"` or `hx-swap="none"` (with headers like `HX-Refresh`) to keep the UI in sync with server state.

---

### Implementation Snippet (Layout)
```tsx
<body class="bg-background text-foreground antialiased min-h-screen font-sans flex flex-col">
  <theme-provider defaultTheme="system"></theme-provider>
  <NavBar user={props.user} ... />
  <main hx-boost="true" id="main-content" class="relative flex-grow w-full">
    {props.children}
  </main>
  <app-toaster></app-toaster>
  <footer class="...">...</footer>
</body>
```