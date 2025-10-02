const jwt = require('jsonwebtoken');
const db = require('../config/db');
const sgMail = require('../config/mailer');
const bcrypt = require('bcrypt');

// Helper function to parse name from VIT email
const parseNameFromEmail = (email) => {
  const namePart = email.split('@')[0];
  // Remove trailing digits (e.g., 2021, 2022)
  const nameWithoutDigits = namePart.replace(/\d+$/, '');
  // Replace dot with space and capitalize
  const fullName = nameWithoutDigits
    .split('.')
    .map(name => name.charAt(0).toUpperCase() + name.slice(1))
    .join(' ');
  return fullName;
};

exports.generateOtp = async (req, res) => {
  const { email } = req.body;

  if (!email || !email.endsWith('@vitstudent.ac.in')) {
    return res.status(400).json({ error: 'Please provide a valid @vitstudent.ac.in email.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  console.log(`[STEP 1] Starting OTP process for ${email}. Generated OTP: ${otp}`);

  try {
    const saltRounds = 10;
    const otpHash = await bcrypt.hash(otp, saltRounds);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    console.log('[STEP 2] OTP hashed. Now connecting to database...');
    
    await db.query('DELETE FROM otp WHERE email = $1', [email]);
    await db.query(
      'INSERT INTO otp (email, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [email, otpHash, expiresAt]
    );

    console.log('[STEP 3] Database write successful. Now sending email...');

    const msg = {
      to: email,
      from: 'keshavdadhichb7@gmail.com', // Your verified sender email
      subject: 'Your Login OTP for VIT Book Exchange',
      text: `Your One-Time Password is: ${otp}\nIt is valid for 10 minutes.`,
      html: `<p>Your One-Time Password is: <b>${otp}</b></p><p>It is valid for 10 minutes.</p>`,
    };

    await sgMail.send(msg);

    console.log('[STEP 4] Email sent successfully! Sending response.');
    
    res.status(200).json({ message: 'OTP has been sent to your email.' });

  } catch (error) {
    console.error('Error during OTP generation:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required.' });
  }

  try {
    const otpResult = await db.query('SELECT * FROM otp WHERE email = $1', [email]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid OTP or email.' });
    }

    const storedOtp = otpResult.rows[0];

    if (new Date() > new Date(storedOtp.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    const isMatch = await bcrypt.compare(otp, storedOtp.otp_hash);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid OTP.' });
    }

    let userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userResult.rows.length === 0) {
      const newUserName = parseNameFromEmail(email);
      const newUserResult = await db.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *',
        [email, newUserName]
      );
      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    await db.query('DELETE FROM otp WHERE email = $1', [email]);

    res.status(200).json({
      message: 'Login successful!',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};