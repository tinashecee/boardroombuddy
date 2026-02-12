USE boardroom_buddy;

-- Store admin notes when approving a booking (included in confirmation email)
ALTER TABLE bookings
  ADD COLUMN admin_approval_comments TEXT NULL;
