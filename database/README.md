# Database Setup Guide

This project uses MySQL to store booking and user data. Follow these steps to set up your local database.

## Prerequisites
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) installed and running.
- A MySQL client (like MySQL Workbench, DBeaver, or the `mysql` CLI).

## Installation

1. **Log in to your MySQL server:**
   ```bash
   mysql -u your_username -p
   ```

2. **Run the schema migration:**
   ```sql
   SOURCE database/schema.sql;
   ```

3. **(Optional) Seed the database with sample data:**
   ```sql
   SOURCE database/seed.sql;
   ```

## Database Structure

### `users` Table
Stores user accounts for authentication.
- `id`: UUID (Primary Key)
- `name`: User's full name
- `email`: Unique login email
- `password_hash`: Securely hashed password

### `bookings` Table
Stores boardroom reservations linked to users.
- `id`: UUID (Primary Key)
- `user_id`: Reference to the user who made the booking
- `organization_name`: Name of the entity booking the room
- `booking_date`: Date of reservation
- `start_time` / `end_time`: Reservation window
- `status`: confirmed, pending, or cancelled
