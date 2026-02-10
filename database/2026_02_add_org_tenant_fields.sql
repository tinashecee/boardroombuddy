USE boardroom_buddy;

-- Extend organizations table with tenant configuration and billing-related fields
ALTER TABLE organizations
  ADD COLUMN is_tenant BOOLEAN NOT NULL DEFAULT FALSE AFTER name,
  ADD COLUMN monthly_free_hours DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER is_tenant,
  ADD COLUMN used_free_hours_this_month DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER monthly_free_hours,
  ADD COLUMN billing_rate_per_hour DECIMAL(10,2) NULL AFTER used_free_hours_this_month;

