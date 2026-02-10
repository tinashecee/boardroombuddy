USE boardroom_buddy;

-- Extend bookings table with additional fields for attendance, equipment, catering, billing and contact
ALTER TABLE bookings
  ADD COLUMN attendance_type ENUM('INTERNAL','EXTERNAL') NOT NULL DEFAULT 'INTERNAL' AFTER attendees,
  ADD COLUMN needs_display_screen BOOLEAN NOT NULL DEFAULT FALSE AFTER attendance_type,
  ADD COLUMN needs_video_conferencing BOOLEAN NOT NULL DEFAULT FALSE AFTER needs_display_screen,
  ADD COLUMN needs_projector BOOLEAN NOT NULL DEFAULT FALSE AFTER needs_video_conferencing,
  ADD COLUMN needs_whiteboard BOOLEAN NOT NULL DEFAULT FALSE AFTER needs_projector,
  ADD COLUMN needs_conference_phone BOOLEAN NOT NULL DEFAULT FALSE AFTER needs_whiteboard,
  ADD COLUMN needs_extension_power BOOLEAN NOT NULL DEFAULT FALSE AFTER needs_conference_phone,
  ADD COLUMN catering_option ENUM('NONE','TEA_COFFEE_WATER','LIGHT_SNACKS') NOT NULL DEFAULT 'NONE' AFTER needs_extension_power,
  ADD COLUMN booking_type ENUM('FREE_HOURS','HIRE') NOT NULL DEFAULT 'FREE_HOURS' AFTER catering_option,
  ADD COLUMN duration_hours DECIMAL(5,2) NULL AFTER booking_type,
  ADD COLUMN contact_phone VARCHAR(50) NULL AFTER contact_email,
  ADD COLUMN free_hours_applied BOOLEAN NOT NULL DEFAULT FALSE AFTER duration_hours;

