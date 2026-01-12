# Account Management

Flywheel Gateway uses BYOA (Bring Your Own Account) for AI providers. This guide covers account setup and management.

## Overview

BYOA means you link your own AI provider accounts rather than using shared credits. Benefits include:

- **Direct billing** - Pay providers directly
- **Full control** - Manage rate limits and usage
- **Privacy** - Conversations stay in your account
- **Failover** - Multiple accounts for redundancy

## Supported Providers

| Provider | Auth Methods | Notes |
|----------|--------------|-------|
| Claude (Anthropic) | OAuth, API Key | Full model access |
| Codex (OpenAI) | OAuth, API Key | GPT-4 and GPT-4o |
| Gemini (Google) | OAuth, Device Code | Gemini Pro and Ultra |

## Adding an Account

### Step 1: Navigate to Accounts

Click **Accounts** in the sidebar to open the Account Management page.

### Step 2: Click Add Account

Click the **Add Account** button to start the onboarding wizard.

### Step 3: Select Provider

Choose from:

- **Claude** - Anthropic's Claude models
- **Codex** - OpenAI's GPT models
- **Gemini** - Google's Gemini models

### Step 4: Choose Authentication Method

#### OAuth (Recommended)

1. Click **Connect with [Provider]**
2. You'll be redirected to the provider's auth page
3. Log in and authorize Flywheel Gateway
4. You'll be redirected back with your account linked

#### API Key

1. Select **API Key** method
2. Go to your provider's dashboard and create an API key
3. Paste the key into the form
4. Click **Verify** to test the connection

#### Device Code (Headless)

For environments without a browser:

1. Select **Device Code** method
2. Copy the code displayed
3. Visit the URL shown on another device
4. Enter the code and authorize
5. The wizard will detect authorization automatically

## Account Status

| Status | Description | Action |
|--------|-------------|--------|
| Verified | Account is working | None needed |
| Cooldown | Rate limited temporarily | Wait for cooldown |
| Expired | OAuth token expired | Re-authenticate |
| Error | Account has issues | Check error message |

## Account Rotation

With multiple accounts per provider, Flywheel Gateway automatically:

- Distributes load across accounts
- Switches on rate limits
- Fails over on errors

### Manual Rotation

To manually rotate to a different account:

1. Open the provider card
2. Click **Rotate**
3. The next available account becomes primary

### Rotation Settings

Configure rotation behavior:

- **Strategy**: Round-robin, least-used, or failover-only
- **Cooldown**: How long to wait after rate limit
- **Max Retries**: Attempts before marking account error

## Removing an Account

To remove a linked account:

1. Find the account in the Profiles list
2. Click the **Delete** button (trash icon)
3. Confirm removal

Note: Removing an account doesn't affect past session data.

## Security Considerations

### API Key Security

- Keys are encrypted at rest
- Keys are never exposed in the UI
- Keys are transmitted over HTTPS only

### OAuth Security

- Tokens refresh automatically
- Minimal permission scopes requested
- Revoke access anytime via provider dashboard

### Best Practices

1. Use OAuth when available (more secure)
2. Create dedicated API keys for Flywheel
3. Set up multiple accounts for redundancy
4. Monitor usage via provider dashboards
5. Rotate keys periodically

## Troubleshooting

### "Account verification failed"

- Check that the API key is correct
- Verify the key has required permissions
- Ensure the key isn't rate limited

### "OAuth token expired"

- Click **Re-authenticate** on the account
- Complete the OAuth flow again

### "Rate limit exceeded"

- Wait for the cooldown period
- Add additional accounts for load balancing
- Check your provider's rate limits

### "Account not found"

- The API key may have been deleted
- Re-link the account with a new key
