# GitHub Push Instructions

Follow these steps to push your local repository to GitHub:

## 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Enter a name for your repository, e.g., `beer-distribution-game`
3. Add an optional description
4. Choose whether the repository should be public or private
5. Click "Create repository"
6. **Important:** Do not initialize with README, .gitignore, or license as we already have those files

## 2. Add GitHub as a Remote

After creating the repository, GitHub will show you the commands to push an existing repository.

```bash
# Add the GitHub repository as a remote called "origin"
git remote add origin https://github.com/YOUR-USERNAME/beer-distribution-game.git

# Push your code to GitHub
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username.

## 3. Authentication

If this is your first time pushing to GitHub, you might be prompted for authentication:

### Using HTTPS (Password/Token authentication)
If you're using HTTPS URLs, GitHub no longer accepts password authentication. You'll need to:

1. Create a Personal Access Token (PAT):
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token" and select appropriate permissions (at minimum, 'repo')
   - Copy the generated token

2. When prompted for a password, use this token instead

### Using SSH (Key-based authentication)
Alternatively, you can set up SSH authentication:

1. Generate an SSH key if you don't have one:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. Add the SSH key to your GitHub account:
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub → Settings → SSH and GPG keys → New SSH key
   - Paste your key and save

3. Change your remote URL to use SSH:
   ```bash
   git remote set-url origin git@github.com:YOUR-USERNAME/beer-distribution-game.git
   ```

## 4. Push Updates

For future updates, after making changes and committing them:

```bash
# Push your changes to GitHub
git push
``` 