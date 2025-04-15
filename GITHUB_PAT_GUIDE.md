# GitHub Personal Access Token Guide

This guide will help you push your code to GitHub using a Personal Access Token (PAT).

## 1. Create a Personal Access Token on GitHub

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token" and select "Generate new token (classic)"
3. Give your token a descriptive name (e.g., "Beer Distribution Game Project")
4. Set an expiration date (30 days is recommended for security)
5. Select these scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (if you plan to use GitHub Actions)
6. Click "Generate token"
7. **IMPORTANT**: Copy your token immediately and save it in a secure place (like a password manager). GitHub will only show it once!

## 2. Use HTTPS with Your Token

Change your remote URL back to HTTPS:

```bash
git remote set-url origin https://github.com/EshaanJad/beer-distribution-game.git
```

## 3. Configure Git to Store Your Credentials

You can store your credentials so you don't have to enter them each time:

For macOS:

```bash
git config --global credential.helper osxkeychain
```

For Windows:

```bash
git config --global credential.helper wincred
```

For Linux:

```bash
git config --global credential.helper store
```

## 4. Push Your Code to GitHub

```bash
git push -u origin main
```

When prompted for your password, use your Personal Access Token instead.

## 5. Checking Your Configuration

To verify your remote URL:

```bash
git remote -v
```

It should display:
```
origin  https://github.com/EshaanJad/beer-distribution-game.git (fetch)
origin  https://github.com/EshaanJad/beer-distribution-game.git (push)
```

## Troubleshooting

- If you get authentication errors, verify that your token hasn't expired
- Ensure you've copied the entire token without any extra spaces
- Check that you have the correct permissions set for your token
- Verify that you have the correct remote URL

## Security Notes

- Never commit your token to your repository
- Use token expiration dates to limit risk
- Only grant the minimum permissions needed
- Revoke tokens when they're no longer needed

For more information, see [GitHub's documentation on creating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) 