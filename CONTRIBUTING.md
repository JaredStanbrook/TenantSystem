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
