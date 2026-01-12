# E2E Tests

End-to-end tests using Playwright to verify critical user journeys.

## Running Tests

```bash
# Run all E2E tests
bun test:e2e

# Run with UI mode
bunx playwright test --ui

# Run specific test file
bunx playwright test navigation.spec.ts

# Run with headed browser
bunx playwright test --headed
```

## Test Files

- `navigation.spec.ts` - Navigation and routing tests
- `dashboard.spec.ts` - Dashboard page functionality
- `agents.spec.ts` - Agents page functionality

## Configuration

See `playwright.config.ts` for test configuration including:
- Browser targets (Chromium, Firefox, WebKit)
- Viewport settings
- Trace and screenshot capture on failure
- Timeout settings

## Writing New Tests

```typescript
import { expect, test } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("selector")).toBeVisible();
  });
});
```

## CI Integration

E2E tests run on pull requests in `.github/workflows/ci.yml`.
Artifacts (traces, screenshots) are captured on failure.
