-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS boardroom_buddy;
USE boardroom_buddy;

-- Create the organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    is_tenant BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_free_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_free_hours_this_month DECIMAL(5,2) NOT NULL DEFAULT 0,
    billing_rate_per_hour DECIMAL(10,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY, -- Using UUID
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id CHAR(36) PRIMARY KEY, -- Using UUID
    user_id CHAR(36), -- Link to user
    organization_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT,
    attendees INT NOT NULL,
    attendance_type ENUM('INTERNAL','EXTERNAL') NOT NULL DEFAULT 'INTERNAL',
    needs_display_screen BOOLEAN NOT NULL DEFAULT FALSE,
    needs_video_conferencing BOOLEAN NOT NULL DEFAULT FALSE,
    needs_projector BOOLEAN NOT NULL DEFAULT FALSE,
    needs_whiteboard BOOLEAN NOT NULL DEFAULT FALSE,
    needs_conference_phone BOOLEAN NOT NULL DEFAULT FALSE,
    needs_extension_power BOOLEAN NOT NULL DEFAULT FALSE,
    catering_option ENUM('NONE','TEA_COFFEE_WATER','LIGHT_SNACKS') NOT NULL DEFAULT 'NONE',
    booking_type ENUM('FREE_HOURS','HIRE') NOT NULL DEFAULT 'FREE_HOURS',
    duration_hours DECIMAL(5,2),
    free_hours_applied BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('confirmed', 'pending', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for searching bookings by date
CREATE INDEX idx_booking_date ON bookings(booking_date);
CREATE INDEX idx_user_id ON bookings(user_id);
