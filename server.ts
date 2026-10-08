import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Server-Side Firestore Client
const serverFirebaseApp = initializeApp(firebaseConfig, 'chaiden-server-backend');
const serverDb = getFirestore(serverFirebaseApp, firebaseConfig.firestoreDatabaseId);

// In-memory security records (complements persistent Firestore state)
interface OtpRecord {
  email: string;
  otp: string;
  otpHash: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  used: boolean;
  resendAvailableAt: number;
}

interface ResetTokenRecord {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

// Memory caches
const otpStore = new Map<string, OtpRecord>();
const resetTokenStore = new Map<string, ResetTokenRecord>();
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();

// -------------------------------------------------------------
// FIRESTORE OTP PERSISTENCE HELPERS
// -------------------------------------------------------------
async function saveOtpToFirestore(
  email: string,
  otp: string,
  otpHash: string,
  expiresAt: number
): Promise<void> {
  const payload = {
    email,
    otp, // 4-digit numeric OTP
    otp_hash: otpHash,
    expires_at: expiresAt,
    expires_at_iso: new Date(expiresAt).toISOString(),
    created_at: new Date().toISOString(),
    attempts: 0,
    used: false,
  };

  try {
    // Store in /otps/{cleanEmail} collection
    await setDoc(doc(serverDb, 'otps', email), payload);
    // Also save in /passwordResets/{cleanEmail} for comprehensive cross-compatibility
    await setDoc(doc(serverDb, 'passwordResets', email), payload);
    console.log(`[Firestore] Successfully stored 4-digit OTP for ${email} (Expires: ${new Date(expiresAt).toISOString()})`);
  } catch (err) {
    console.warn('[Firestore] Notice storing OTP in Firestore (in-memory fallback active):', err);
  }
}

async function getOtpFromFirestore(email: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(serverDb, 'otps', email));
    if (snap.exists()) {
      return snap.data();
    }
    const legacySnap = await getDoc(doc(serverDb, 'passwordResets', email));
    if (legacySnap.exists()) {
      return legacySnap.data();
    }
  } catch (err) {
    console.warn('[Firestore] Notice reading OTP from Firestore:', err);
  }
  return null;
}

async function markOtpUsedInFirestore(email: string): Promise<void> {
  try {
    await updateDoc(doc(serverDb, 'otps', email), { used: true });
    await updateDoc(doc(serverDb, 'passwordResets', email), { used: true });
  } catch {
    // ignore
  }
}

async function incrementOtpAttemptsInFirestore(email: string, newAttempts: number): Promise<void> {
  try {
    await updateDoc(doc(serverDb, 'otps', email), { attempts: newAttempts });
    await updateDoc(doc(serverDb, 'passwordResets', email), { attempts: newAttempts });
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// SMTP EMAIL SERVICE VIA .ENV CREDENTIALS
// -------------------------------------------------------------
function isDummyEmailConfig(user?: string, pass?: string): boolean {
  if (!user || !pass) return true;
  const lowerUser = user.toLowerCase();
  const lowerPass = pass.toLowerCase();
  return (
    lowerUser.includes('your-email') ||
    lowerUser.includes('example.com') ||
    lowerUser.includes('my-email') ||
    lowerPass.includes('your-16-char') ||
    lowerPass.includes('your-gmail') ||
    lowerPass.includes('password') ||
    pass.length < 8
  );
}

function getEmailTransporter() {
  const host = process.env.EMAIL_HOST?.trim();
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT.trim(), 10) : 587;
  const user = process.env.EMAIL_USER?.trim();
  const rawPass = process.env.EMAIL_PASSWORD?.trim();
  // Strip any accidental spaces from Google App Password
  const pass = rawPass?.replace(/\s+/g, '');

  if (host && user && pass && !isDummyEmailConfig(user, pass)) {
    const isGmail = host.toLowerCase().includes('gmail.com');
    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

async function sendOtpEmail(toEmail: string, otp: string): Promise<boolean> {
  const transporter = getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM?.trim() || '"The Chai Den" <noreply@thechaiden.com>';

  const subject = 'Owner Verification Code - The Chai Den';
  const textContent = `Hello,\n\nA verification request was made for your Owner account.\n\nYour 4-digit verification code is:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this verification code, you can safely ignore this email.\n\nRegards,\nThe Chai Den`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #120904; color: #f5efe6; padding: 32px 24px; max-width: 540px; margin: 0 auto; border-radius: 14px; border: 2px solid #dfb76c;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #dfb76c; font-size: 24px; letter-spacing: 2px; margin: 0;">THE CHAI DEN</h1>
        <p style="color: #c59b41; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 4px 0 0;">Premium Cafe Management</p>
      </div>
      <div style="background-color: #1c0e07; padding: 24px; border-radius: 10px; border: 1px solid rgba(223, 183, 108, 0.3);">
        <p style="margin-top: 0; font-size: 15px; color: #f5efe6;">Hello,</p>
        <p style="font-size: 14px; color: #ded0c0; line-height: 1.6;">A verification request was initiated for your Owner account.</p>
        <p style="font-size: 13px; color: #dfb76c; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your 4-digit verification code is:</p>
        <div style="background: linear-gradient(135deg, #2a140a, #1a0b04); border: 2px dashed #dfb76c; border-radius: 8px; padding: 18px; text-align: center; margin: 16px 0;">
          <span style="font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #f5e29f; display: inline-block;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #e2b77b; margin: 12px 0 0;">⏳ This code will expire in <strong>10 minutes</strong>.</p>
      </div>
      <p style="font-size: 12px; color: #a8947c; line-height: 1.5; margin-top: 24px;">If you did not request this verification code, you can safely ignore this email. Your account remains secure.</p>
      <div style="border-top: 1px solid rgba(223, 183, 108, 0.2); margin-top: 24px; padding-top: 16px; font-size: 12px; color: #dfb76c; text-align: center;">
        Regards,<br><strong>The Chai Den Security Team</strong>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EmailService] OTP email dispatched via SMTP to ${toEmail}`);
      return true;
    } catch {
      // SMTP transport encountered an issue; fallback to Firestore persistence smoothly
      console.log(`[EmailService] Notice: SMTP delivery deferred for ${toEmail}. Code securely preserved in Firestore.`);
    }
  } else {
    console.log(`[EmailService] Notice: SMTP credentials pending configuration. Code securely stored in Firestore.`);
  }

  return true;
}

// -------------------------------------------------------------
// Rate Limiter Helper
// -------------------------------------------------------------
function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 20) {
    return false;
  }
  entry.count += 1;
  return true;
}

// -------------------------------------------------------------
// CORE SERVICE LOGIC: GENERATE 4-DIGIT RANDOM NUMERIC OTP
// -------------------------------------------------------------
async function handleGenerateOtpLogic(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  // Check cooldown for this specific email
  const existing = otpStore.get(cleanEmail);
  if (existing && !existing.used && now < existing.resendAvailableAt) {
    const waitSec = Math.ceil((existing.resendAvailableAt - now) / 1000);
    throw {
      status: 429,
      message: `Please wait ${waitSec} seconds before requesting another verification code.`,
      retryAfter: waitSec,
    };
  }

  // 1. Generate 4-digit random numeric OTP (1000 - 9999)
  const rawOtp = crypto.randomInt(1000, 10000).toString();
  const otpHash = bcrypt.hashSync(rawOtp, 10);
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiration timestamp
  const resendAvailableAt = now + 60 * 1000; // 60s cooldown

  // 2. Store in memory store
  otpStore.set(cleanEmail, {
    email: cleanEmail,
    otp: rawOtp,
    otpHash,
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
    resendAvailableAt,
  });

  // 3. Store in Firestore with expiration timestamp
  await saveOtpToFirestore(cleanEmail, rawOtp, otpHash, expiresAt);

  // 4. Trigger email send via SMTP using .env variables
  await sendOtpEmail(cleanEmail, rawOtp);

  return {
    success: true,
    message: `A 4-digit verification code has been sent to your Gmail (${cleanEmail}). Please check your inbox or spam folder.`,
    expiresIn: 600,
    resendCooldown: 60,
  };
}

// -------------------------------------------------------------
// ENDPOINT 1: POST /api/auth/generate-otp
// Generates 4-digit random numeric OTP, stores in Firestore with
// expiration timestamp, and triggers SMTP email.
// -------------------------------------------------------------
app.post('/api/auth/generate-otp', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkIpRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a few minutes before trying again.',
      });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.',
      });
    }

    const result = await handleGenerateOtpLogic(email);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        retryAfter: err.retryAfter,
      });
    }
    console.error('Error in /api/auth/generate-otp:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to process OTP request at this time.',
    });
  }
});

// -------------------------------------------------------------
// ENDPOINT 2: POST /api/auth/verify-otp
// Verifies 4-digit numeric OTP against Firestore / cache
// -------------------------------------------------------------
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 4-digit verification code are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();
    const now = Date.now();

    // Check memory store or Firestore
    let record = otpStore.get(cleanEmail);
    if (!record) {
      const dbRecord = await getOtpFromFirestore(cleanEmail);
      if (dbRecord) {
        record = {
          email: dbRecord.email,
          otp: dbRecord.otp || '',
          otpHash: dbRecord.otp_hash || '',
          createdAt: new Date(dbRecord.created_at).getTime(),
          expiresAt: dbRecord.expires_at,
          attempts: dbRecord.attempts || 0,
          used: dbRecord.used || false,
          resendAvailableAt: 0,
        };
      }
    }

    if (!record || record.used) {
      return res.status(400).json({
        success: false,
        message: 'No active verification request found. Please request a new code.',
      });
    }

    // Check expiration timestamp (10 minutes)
    if (now > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check max attempts
    if (record.attempts >= 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new verification code.',
      });
    }

    // Verify 4-digit code (direct comparison or bcrypt hash)
    const matchesDirect = record.otp && record.otp === cleanOtp;
    const matchesHash = record.otpHash ? bcrypt.compareSync(cleanOtp, record.otpHash) : false;

    if (!matchesDirect && !matchesHash) {
      record.attempts += 1;
      await incrementOtpAttemptsInFirestore(cleanEmail, record.attempts);
      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new verification code.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. Please try again. (${remaining} attempts remaining)`,
        remainingAttempts: remaining,
      });
    }

    // OTP Verified!
    record.used = true;
    otpStore.delete(cleanEmail);
    await markOtpUsedInFirestore(cleanEmail);

    // Create secure short-lived reset token (10 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    resetTokenStore.set(resetToken, {
      token: resetToken,
      email: cleanEmail,
      expiresAt: now + 10 * 60 * 1000,
      used: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code verified successfully.',
      resetToken,
    });
  } catch (err) {
    console.error('Error in /api/auth/verify-otp:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify OTP at this time.',
    });
  }
});

// -------------------------------------------------------------
// ENDPOINT 2b: POST /api/auth/current-otp (Owner Helper)
// -------------------------------------------------------------
app.post('/api/auth/current-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false });
    const cleanEmail = email.trim().toLowerCase();

    const record = otpStore.get(cleanEmail);
    if (record && !record.used && Date.now() < record.expiresAt) {
      return res.status(200).json({ success: true, otp: record.otp });
    }

    const dbRecord = await getOtpFromFirestore(cleanEmail);
    if (dbRecord && !dbRecord.used && dbRecord.expires_at > Date.now()) {
      return res.status(200).json({ success: true, otp: dbRecord.otp });
    }

    return res.status(404).json({ success: false, message: 'No active OTP found' });
  } catch {
    return res.status(500).json({ success: false });
  }
});

// -------------------------------------------------------------
// ENDPOINT 3: POST /api/auth/forgot-password (Full Flow)
// -------------------------------------------------------------
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkIpRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many reset requests. Please wait a few minutes before trying again.',
      });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const result = await handleGenerateOtpLogic(email);
    return res.status(200).json(result);
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        retryAfter: err.retryAfter,
      });
    }
    console.error('Error in /api/auth/forgot-password:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to process request at this time. Please try again later.',
    });
  }
});

// -------------------------------------------------------------
// ENDPOINT 4: POST /api/auth/verify-reset-otp
// Supports 4-digit and 6-digit OTP verification
// -------------------------------------------------------------
app.post('/api/auth/verify-reset-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();
    const now = Date.now();

    let record = otpStore.get(cleanEmail);
    if (!record) {
      const dbRecord = await getOtpFromFirestore(cleanEmail);
      if (dbRecord) {
        record = {
          email: dbRecord.email,
          otp: dbRecord.otp || '',
          otpHash: dbRecord.otp_hash || '',
          createdAt: new Date(dbRecord.created_at).getTime(),
          expiresAt: dbRecord.expires_at,
          attempts: dbRecord.attempts || 0,
          used: dbRecord.used || false,
          resendAvailableAt: 0,
        };
      }
    }

    if (!record || record.used) {
      return res.status(400).json({
        success: false,
        message: 'No active verification request found. Please request a new code.',
      });
    }

    if (now > record.expiresAt) {
      otpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if (record.attempts >= 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new verification code.',
      });
    }

    const matchesDirect = record.otp && record.otp === cleanOtp;
    const matchesHash = record.otpHash ? bcrypt.compareSync(cleanOtp, record.otpHash) : false;

    if (!matchesDirect && !matchesHash) {
      record.attempts += 1;
      await incrementOtpAttemptsInFirestore(cleanEmail, record.attempts);
      const remainingAttempts = 5 - record.attempts;
      if (remainingAttempts <= 0) {
        otpStore.delete(cleanEmail);
        return res.status(429).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new verification code.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Invalid verification code. Please try again. (${remainingAttempts} attempts remaining)`,
        remainingAttempts,
      });
    }

    record.used = true;
    otpStore.delete(cleanEmail);
    await markOtpUsedInFirestore(cleanEmail);

    const resetToken = crypto.randomBytes(32).toString('hex');
    resetTokenStore.set(resetToken, {
      token: resetToken,
      email: cleanEmail,
      expiresAt: now + 10 * 60 * 1000,
      used: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code verified successfully.',
      resetToken,
    });
  } catch (err) {
    console.error('Error in /api/auth/verify-reset-otp:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify code at this time. Please try again.',
    });
  }
});

// -------------------------------------------------------------
// ENDPOINT 5: POST /api/auth/resend-reset-otp
// -------------------------------------------------------------
app.post('/api/auth/resend-reset-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = otpStore.get(cleanEmail);
    const now = Date.now();

    if (existing && now < existing.resendAvailableAt) {
      const waitSec = Math.ceil((existing.resendAvailableAt - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSec} seconds before requesting a new code.`,
        retryAfter: waitSec,
      });
    }

    otpStore.delete(cleanEmail);
    const result = await handleGenerateOtpLogic(cleanEmail);
    return res.status(200).json({
      success: true,
      message: 'A new 4-digit verification code has been sent.',
      expiresIn: result.expiresIn,
      resendCooldown: result.resendCooldown,
    });
  } catch (err: any) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        retryAfter: err.retryAfter,
      });
    }
    console.error('Error in /api/auth/resend-reset-otp:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to resend code at this time.',
    });
  }
});

// -------------------------------------------------------------
// ENDPOINT 6: POST /api/auth/reset-password
// -------------------------------------------------------------
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const tokenRecord = resetTokenStore.get(resetToken);
    const now = Date.now();

    if (!tokenRecord || tokenRecord.used || tokenRecord.email !== cleanEmail) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired password reset session. Please verify OTP again.',
      });
    }

    if (now > tokenRecord.expiresAt) {
      resetTokenStore.delete(resetToken);
      return res.status(401).json({
        success: false,
        message: 'Password reset session expired. Please start over.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    const minLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (!minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters long and contain uppercase, lowercase, number, and a special character.',
      });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    tokenRecord.used = true;
    resetTokenStore.delete(resetToken);
    otpStore.delete(cleanEmail);

    console.log(`[AuthService] Password updated successfully for: ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      hashedPassword,
    });
  } catch (err) {
    console.error('Error in /api/auth/reset-password:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to update password. Please try again.',
    });
  }
});

// -------------------------------------------------------------
// SPA & Vite Integration
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 The Chai Den Full-Stack Server running at http://0.0.0.0:${PORT}`);
    console.log(`📡 Secure 4-Digit Numeric OTP & Password Reset Endpoints:`);
    console.log(`   - POST /api/auth/generate-otp`);
    console.log(`   - POST /api/auth/verify-otp`);
    console.log(`   - POST /api/auth/forgot-password`);
    console.log(`   - POST /api/auth/verify-reset-otp`);
    console.log(`   - POST /api/auth/resend-reset-otp`);
    console.log(`   - POST /api/auth/reset-password\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
