# Fetch all branches and commits from upstream

git fetch upstream

# Make sure you're on your main branch

git checkout main

# Merge changes from upstream/main into your local main branch

git merge upstream/main

# Push the changes to your fork

git push origin main

# For each of your feature branches

git checkout your-feature-branch

# Rebase your branch onto the updated main

git rebase main

# Force push the rebased branch to your fork

# (Use with caution if sharing the branch with others)

git push origin your-feature-branch --force-with-lease

### Commit Message Standards

There are several widely used **Git commit message standards**, but one of the most popular is the **Conventional Commits** format. It helps maintain consistency, improves readability, and makes it easier to generate changelogs.

### **Conventional Commits Format**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### **Commit Types**

- **feat**: A new feature
- **fix**: A bug fix
- **chore**: Routine maintenance or non-functional updates
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that don't fix bugs or add features
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **ci**: Continuous integration changes
- **build**: Build system or dependency changes
- **revert**: Reverts a previous commit

### **Examples**

✅ **Adding a new feature**

```
feat(auth): add JWT-based authentication
```

✅ **Fixing a bug**

```
fix(api): resolve crash when fetching user data
```

✅ **Updating documentation**

```
docs(readme): update setup instructions
```

✅ **Refactoring code without behavior changes**

```
refactor(database): improve query performance
```

Would you like a **Git commit hook** to enforce this standard? 🚀
