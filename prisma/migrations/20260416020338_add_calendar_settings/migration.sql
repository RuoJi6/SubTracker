-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GlobalSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "displayCurrency" TEXT NOT NULL DEFAULT 'CNY',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "calendarToken" TEXT,
    "dingtalkWebhook" TEXT,
    "dingtalkSecret" TEXT,
    "dingtalkTemplate" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "emailFrom" TEXT,
    "emailTo" TEXT,
    "emailTemplate" TEXT,
    "calendarTitle" TEXT,
    "calendarDesc" TEXT,
    "calendarAlarmDays" TEXT NOT NULL DEFAULT '[0,1]',
    "calendarRefreshHours" INTEGER NOT NULL DEFAULT 6,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai'
);
INSERT INTO "new_GlobalSettings" ("calendarDesc", "calendarTitle", "calendarToken", "dingtalkSecret", "dingtalkTemplate", "dingtalkWebhook", "displayCurrency", "emailFrom", "emailTemplate", "emailTo", "id", "language", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "timezone") SELECT "calendarDesc", "calendarTitle", "calendarToken", "dingtalkSecret", "dingtalkTemplate", "dingtalkWebhook", "displayCurrency", "emailFrom", "emailTemplate", "emailTo", "id", "language", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "timezone" FROM "GlobalSettings";
DROP TABLE "GlobalSettings";
ALTER TABLE "new_GlobalSettings" RENAME TO "GlobalSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
