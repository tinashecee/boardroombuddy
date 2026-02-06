let nodemailer;
let transporter;

try {
  nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "labpartnerswebportal@gmail.com",
      pass: "aafennaorjosxifq",
    },
  });
  console.log('✅ Email service initialized');
} catch (error) {
  console.warn('⚠️  Nodemailer not found. Email functionality will be disabled.');
  console.warn('   Install with: npm install nodemailer');
  transporter = null;
}

// Send email to admins when a booking is created
async function notifyAdminsNewBooking(booking, user) {
  if (!transporter) {
    console.log('Email service not available - skipping admin notification');
    return;
  }
  
  try {
    // Get all admin emails
    const db = require('../db');
    const [admins] = await db.query(
      "SELECT email, name FROM users WHERE role = 'ADMIN' AND is_approved = TRUE"
    );

    if (admins.length === 0) {
      console.log('No admins found to notify');
      return;
    }

    const adminEmails = admins.map(admin => admin.email).join(', ');

    // Format date for display
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const baseUrl = process.env.FRONTEND_URL || 'http://161.97.183.92:8080';
    const adminLoginUrl = `${baseUrl}/auth`;

    const mailOptions = {
      from: '"Boardroom Buddy" <labpartnerswebportal@gmail.com>',
      to: adminEmails,
      subject: `New Boardroom Booking Request - ${booking.organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Boardroom Booking Request</h2>
          <p>A new boardroom booking has been submitted and requires your approval.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Booking Details</h3>
            <p><strong>Organization:</strong> ${booking.organizationName}</p>
            <p><strong>Contact Name:</strong> ${booking.contactName}</p>
            <p><strong>Contact Email:</strong> ${booking.contactEmail}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Attendees:</strong> ${booking.attendees}</p>
            ${booking.purpose ? `<p><strong>Purpose:</strong> ${booking.purpose}</p>` : ''}
            <p><strong>Booked by:</strong> ${user.name} (${user.email})</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminLoginUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Log In to Approve Booking
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Or copy and paste this link into your browser:<br>
            <a href="${adminLoginUrl}" style="color: #2563eb; word-break: break-all;">${adminLoginUrl}</a>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to admins for booking ${booking.id}`);
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    // Don't throw - email failure shouldn't break booking creation
  }
}

// Send confirmation email to user when booking is approved
async function notifyUserBookingApproved(booking) {
  if (!transporter) {
    console.log('Email service not available - skipping booking confirmation');
    return;
  }
  
  try {
    // Get user details
    const db = require('../db');
    const [users] = await db.query(
      "SELECT u.email, u.name FROM users u WHERE u.id = ?",
      [booking.userId]
    );

    if (users.length === 0) {
      console.log(`User not found for booking ${booking.id}`);
      return;
    }

    const user = users[0];

    // Format date for display
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const mailOptions = {
      from: '"Boardroom Buddy" <labpartnerswebportal@gmail.com>',
      to: user.email,
      subject: `Booking Confirmed - ${booking.organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Booking Confirmed!</h2>
          <p>Hello ${user.name},</p>
          <p>Your boardroom booking has been approved and confirmed.</p>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="margin-top: 0; color: #1f2937;">Booking Details</h3>
            <p><strong>Organization:</strong> ${booking.organizationName}</p>
            <p><strong>Contact Name:</strong> ${booking.contactName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
            <p><strong>Attendees:</strong> ${booking.attendees}</p>
            ${booking.purpose ? `<p><strong>Purpose:</strong> ${booking.purpose}</p>` : ''}
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you need to cancel or modify this booking, please log in to your account.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${user.email} for booking ${booking.id}`);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    // Don't throw - email failure shouldn't break booking approval
  }
}

// Send password reset email
async function sendPasswordResetEmail(email, resetLink) {
  if (!transporter) {
    console.log('Email service not available - cannot send password reset email');
    throw new Error('Email service not configured. Please install nodemailer.');
  }
  
  try {
    const mailOptions = {
      from: '"Boardroom Buddy" <labpartnerswebportal@gmail.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested to reset your password for your Boardroom Buddy account.</p>
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error; // Re-throw for password reset since it's critical
  }
}

module.exports = {
  notifyAdminsNewBooking,
  notifyUserBookingApproved,
  sendPasswordResetEmail,
};
