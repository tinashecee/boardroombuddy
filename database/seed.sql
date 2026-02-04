USE boardroom_buddy;

-- Sample Organizations
INSERT INTO organizations (id, name) VALUES 
('org1', 'Acme Corp'),
('org2', 'Tech Solutions Ltd'),
('org3', 'Green Energy Co'),
('org4', 'Global Logistics'),
('org5', 'Alpha FinTech');

-- Sample Users (Passwords are 'password123' hashed conceptually)
INSERT INTO users (id, name, email, company_name, role, is_approved, password_hash) VALUES 
('u1', 'John Smith', 'john@acme.com', 'Acme Corp', 'ADMIN', TRUE, '$2b$10$YourHashedPasswordHere'),
('u2', 'Sarah Johnson', 'sarah@techsolutions.com', 'Tech Solutions Ltd', 'ADMIN', TRUE, '$2b$10$YourHashedPasswordHere');

-- Sample Bookings
INSERT INTO bookings (id, user_id, organization_name, contact_name, contact_email, booking_date, start_time, end_time, purpose, attendees, status) VALUES
('b1', 'u1', 'Acme Corp', 'John Smith', 'john@acme.com', CURDATE(), '09:00:00', '10:30:00', 'Quarterly Planning Meeting', 8, 'confirmed'),
('b2', 'u2', 'Tech Solutions Ltd', 'Sarah Johnson', 'sarah@techsolutions.com', CURDATE(), '14:00:00', '15:30:00', 'Client Presentation', 12, 'confirmed'),
('b3', 'u1', 'Acme Corp', 'John Smith', 'john@acme.com', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '12:00:00', 'Budget Review', 5, 'pending');
