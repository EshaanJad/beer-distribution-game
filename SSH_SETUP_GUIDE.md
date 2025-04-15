# GitHub SSH Setup Guide

Follow these steps to set up SSH authentication for GitHub:

## 1. Generate an SSH Key

Run the following command in your terminal:

```bash
ssh-keygen -t ed25519 -C "eshaan.jad@gmail.com"
```

When prompted:
1. Press Enter to accept the default file location
2. Enter a secure passphrase or press Enter for no passphrase (a passphrase adds extra security)

## 2. Start the SSH Agent

```bash
eval "$(ssh-agent -s)"
```

## 3. Add Your SSH Key to the Agent

```bash
ssh-add ~/.ssh/id_ed25519
```

## 4. Copy Your Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the output (it starts with `ssh-ed25519` and ends with your email).

## 5. Add Your SSH Key to GitHub

1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Enter a title (e.g., "MacBook Pro")
4. Paste your public key in the "Key" field
5. Click "Add SSH key"

## 6. Test Your SSH Connection

```bash
ssh -T git@github.com
```

You may see a warning about authenticity of host. Type `yes` to continue.
If you see "Hi EshaanJad! You've successfully authenticated", the setup is complete.

## 7. Push Your Code to GitHub

Now you can push your code:

```bash
git push -u origin main
```

## Switching Between Repositories

If you need to change the remote URL for an existing repository:

```bash
git remote set-url origin git@github.com:EshaanJad/beer-distribution-game.git
```

## Troubleshooting

If you encounter permission issues:
1. Verify your SSH key is added to the SSH agent: `ssh-add -l`
2. Confirm you've added the correct public key to GitHub
3. Check repository permissions (for organization repositories)

For more help, see GitHub's documentation: [Connecting to GitHub with SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) 