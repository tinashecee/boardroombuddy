-- Reset monthly free hours balance for all tenant organizations except Lab Partners.
-- Run on the 1st of each month (e.g. via cron) or call POST /api/organizations/reset-tenant-balances (admin).
-- Sets monthly_free_hours = 10 and used_free_hours_this_month = 0 for each such tenant.

USE boardroom_buddy;

UPDATE organizations
SET monthly_free_hours = 10,
    used_free_hours_this_month = 0
WHERE is_tenant = TRUE
  AND LOWER(TRIM(name)) != 'lab partners';
