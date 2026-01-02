# Contributing Guide

Thank you for your interest in contributing to **Professional Portfolio**!  
We welcome all contributions—whether it's bug fixes, new features, or documentation improvements.

---

## 🛠️ Setting Up Your Development Environment

1. **Fork the Repository**  
   Click "Fork" on GitHub and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/ProfessionalPortfolio.git
   cd ProfessionalPortfolio
   ```

2. **Install Dependencies**  
   Make sure you have [Bun](https://bun.sh/) installed, then run:

   ```bash
   bun install
   ```

3. **Configure Cloudflare Resources**  
   Copy the example config and edit it for your environment:

   ```bash
   cp wrangler.jsonc.example wrangler.jsonc
   # Edit wrangler.jsonc with your Cloudflare D1, KV, and R2 details
   ```

4. **Set Up Environment Variables**  
   Copy and edit the environment files as needed:

   ```bash
   cp .dev.vars.example .dev.vars
   cp .dev.vars.example .dev.vars.staging
   ```

5. **Genereate Schemas, and Wranlger Types**

   ```bash
   bun run gen

   ```

6. **Run Database Migrations (Optional for DB changes)**

   ```bash
   bun run migrate:local
   ```

7. **Start the Development Servers**
   ```bash
   bun dev
   ```
   This will start both the frontend and the worker with hot reload.

---

## 🚀 Creating a New Feature

1. **Create a New Branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make Your Changes**

   - Add or update code in `src/` (frontend) or `worker/` (backend/API).
   - If you add a new page or API route, follow the existing folder structure.
   - Update or add tests if needed.

3. **Run Lint and Tests**

   ```bash
   bun run lint
   bun test
   ```

4. **Commit Your Changes**  
   Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages:

   ```
   feat(component): add new user profile card
   fix(api): correct error handling for login route
   ```

5. **Push and Open a Pull Request**
   ```bash
   git push origin feat/your-feature-name
   ```
   - Go to GitHub and open a Pull Request against the `main` branch.
   - Fill in the PR template and describe your changes clearly.

---

## 🔄 Keeping Your Branch Up to Date

To keep your feature branch up to date with the latest changes from `main`:

1. **Fetch the latest changes from upstream:**

   ```bash
   git fetch upstream
   ```

2. **Switch to your local main branch and update it:**

   ```bash
   git checkout main
   git merge upstream/main
   git push origin main
   ```

3. **Rebase your feature branch onto the updated main:**

   ```bash
   git checkout feat/your-feature-name
   git rebase main
   ```

4. **If your branch has unrelated changes after a rebase, use cherry-pick to keep your PR focused:**
   - Create a new branch from `main`:
     ```bash
     git checkout main
     git checkout -b feat/your-feature-name-clean
     ```
   - Cherry-pick only the relevant commits:
     ```bash
     git cherry-pick <commit-sha>
     ```
   - Push and open a new PR if needed.

---

## 💡 Tips for Contributors

- **Keep PRs focused:** One feature or fix per PR.
- **Write clear commit messages:** Follow the Conventional Commits format.
- **Update documentation:** If your change affects usage, update the README or relevant docs.
- **Ask questions:** If you're unsure, open a draft PR or ask in an issue.

---

## 🧹 Code Style

- Use the provided ESLint and Prettier configs.
- Run `bun run lint` before pushing.
- Use TypeScript for all code.

---

## 🛡️ Security

If you find a security issue, please follow the instructions in [SECURITY.md](./SECURITY.md) and do **not** open a public issue.

---

Thank you for helping make this project better!
