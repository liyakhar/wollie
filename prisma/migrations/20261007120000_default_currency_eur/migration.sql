-- New workspaces start in euros. Workspaces that have no bank data yet are moved too.
ALTER TABLE "BudgetWorkspace" ALTER COLUMN "currency" SET DEFAULT 'EUR';
UPDATE "BudgetWorkspace" w SET "currency" = 'EUR'
WHERE w."currency" = 'USD'
  AND NOT EXISTS (SELECT 1 FROM "FinancialAccount" a WHERE a."workspaceId" = w."id");
