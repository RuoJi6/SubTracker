-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "cycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "cycleMultiplier" INTEGER NOT NULL DEFAULT 1,
    "customCycleDays" INTEGER,
    "endDate" DATETIME,
    "paymentMethod" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME NOT NULL,
    "nextRenewalDate" DATETIME NOT NULL,
    "url" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "exchangeRateAtPurchase" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Subscription" ("amount", "autoRenew", "category", "createdAt", "currency", "customCycleDays", "cycle", "description", "endDate", "exchangeRateAtPurchase", "icon", "id", "isActive", "name", "nextRenewalDate", "notes", "paymentMethod", "startDate", "updatedAt", "url") SELECT "amount", "autoRenew", "category", "createdAt", "currency", "customCycleDays", "cycle", "description", "endDate", "exchangeRateAtPurchase", "icon", "id", "isActive", "name", "nextRenewalDate", "notes", "paymentMethod", "startDate", "updatedAt", "url" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
