# Agent Instructions: Hono + HTMX + Web Components Stack

## Core Architecture
- **Language**: Strict TypeScript only.
- **Framework**: Hono (Node.js/Bun/Cloudflare Workers - specify your runtime).
- **Frontend**: SSR using Hono's JSX middleware.
- **Interactivity**: Primarily HTMX for server-driven UI.
- **Complexity Fallback**: Use native Web Components (Custom Elements) for client-side state or complex UI patterns that HTMX cannot handle easily.

## Coding Patterns
1. **HTMX First**: Every interaction should ideally be a POST/GET/PUT request returning a JSX fragment.
2. **Fragment-Based UI**: Keep JSX components small. Create a `components/` directory for reusable fragments.
3. **Type Safety**: Use Hono's `Context` types and ensure all JSX components have proper TypeScript interfaces for props.
4. **Web Components**: 
   - Define Custom Elements in a `public/js/` or `src/client/` directory.
   - Use standard `class X extends HTMLElement` syntax.
   - Only use these when a "vibe" requires high-fidelity client-side state.
5. **Route Structure**: Keep routes organized by feature. Group related HTMX endpoints under specific sub-paths (e.g., `/api/fragments/*`).

## Tools & Commands
- **Linting**: `npm run lint`
- **Testing**: `npm test`
- **Build**: `npm run build`

## Interaction Preferences
- **Build Mode**: When I say "build," implement the plan across all necessary files in one shot.
- **Directness**: Do not explain standard TypeScript or JSX syntax unless it is a novel solution.
- **Validation**: After writing code, run the type-checker (`tsc`) and report any errors immediately.
- **Documentation**: Write any significant architectural changes to `docs/arch.md`.