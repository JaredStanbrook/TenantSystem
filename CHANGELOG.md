# Changelog

All notable changes to this project will be documented in this file.
This project follows Semantic Versioning.

## [1.0.0] - 2026-02-01

### Added
- Admin tools page for bulk voiding overdue invoices.
- Property/tenancy history toggles with restore and force-delete flows.
- Invoice history toggle that hides void invoices by default.
- Filter bars across key admin lists (properties, tenancies, invoices, expenses).
- Dynamic theme-aware favicon support.
- CI workflow for lint/typecheck/test/build.

### Changed
- Improved HTMX redirects and guard middleware behavior with flash toasts.
- Soft-delete behavior for properties and related records.
- Updated README with project structure, scripts, and setup guidance.

### Fixed
- HTMX partial rendering issues on dashboard refresh.
- History filter persistence and URL handling.

