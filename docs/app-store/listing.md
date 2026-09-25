# Wollie — App Store listing (draft, 2026-09-25)

Screenshots: `01-intro.png` … `05-goals.png` in this folder, 1320 × 2868 (iPhone 6.9" display, the size App Store Connect requires; it scales them down for smaller iPhones).

## Name and subtitle

- **Name:** Wollie: Budget & Savings
- **Subtitle (30 chars max):** Know what you can spend

## Promotional text (170 chars max, can change without review)

Connect your bank and see what you can safely spend today. Budgets reset on payday, goals keep count, and it works on your own or with a partner.

## Description

Wollie connects to your bank and answers one question clearly: how much can you safely spend?

SAFE TO SPEND
Your money now, minus bills due before payday and what you plan to save. One number, updated as you spend.

EVERY TRANSACTION, SORTED
See spending by date or by category. Fix a category with one tap.

BUDGETS THAT RESET ON PAYDAY
Set a limit for groceries, eating out, or transport. Wollie finds your payday and starts each month when your salary arrives.

SAVE FOR WHAT MATTERS
Travel, a safety cushion, your pension. Set an amount each month and mark it saved when you move the money.

ON YOUR OWN OR TOGETHER
Budget alone, or invite a partner. Different banks are no problem.

READ-ONLY AND PRIVATE
Wollie reads your transactions through regulated open banking. It cannot move money.

Free to start. Household plan for unlimited banks and budgets.

## Keywords (100 chars max, comma separated)

budget,budgeting,money,spending,savings,goals,finance,bank,expense tracker,couples,payday,planner

## Category

- Primary: Finance
- Secondary: Productivity

## Age rating

4+ (no objectionable content). Answer "No" to all content questions.

## App Privacy (the questionnaire in App Store Connect)

Data collected, all **linked to the user**, **not used for tracking**:

| Data type | Why |
| --- | --- |
| Contact info → Name, Email address | App functionality (account) |
| Financial info → Other financial info (bank transactions, balances) | App functionality |
| User content → Other (budgets, goals, categories) | App functionality |
| Identifiers → User ID | App functionality |

No advertising, no third-party analytics, no tracking across apps.

## Review notes (for Apple)

Wollie is a read-only budgeting app. Bank data comes from regulated open-banking providers; the app cannot initiate payments.

Demo account: see "Sign-in required" in App Store Connect → App Review Information. **Blocker:** the reviewer account needs sample bank data. Create it once live bank access is approved (see `docs/prod-launch-checklist.md`), or seed a reviewer workspace with demo transactions before submitting.

## Still needed before submitting

- Privacy policy URL and support URL on a public domain (currently wollie.pages.dev).
- Legal business details (see launch checklist).
- Reviewer demo account with data.
