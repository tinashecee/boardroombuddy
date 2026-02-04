-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS boardroom_buddy;
USE boardroom_buddy;

-- Create the organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
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
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT,
    attendees INT NOT NULL,
    status ENUM('confirmed', 'pending', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for searching bookings by date
CREATE INDEX idx_booking_date ON bookings(booking_date);
CREATE INDEX idx_user_id ON bookings(user_id);
