#!/usr/bin/env python3
"""
Custom HTTP & API Database Server for Khmer Royal E-Invitation.
Handles static files, RSVP submissions, guestbook wishes, and configuration persistence
directly to Supabase PostgreSQL database with CORS support.
"""

import http.server
import json
import os
import sys
from urllib.parse import urlparse, parse_qs

import psycopg2

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:localhost@localhost:5432/postgres')


def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def init_tables(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rsvps (
                id SERIAL PRIMARY KEY,
                data JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS wishes (
                id SERIAL PRIMARY KEY,
                name TEXT,
                date_display TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS invitation_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                data JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """)
        # Ensure config row exists
        cur.execute("""
            INSERT INTO invitation_config (id, data) VALUES (1, '{}'::jsonb)
            ON CONFLICT (id) DO NOTHING;
        """)


def load_rsvps(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT data FROM rsvps ORDER BY created_at DESC;")
        rows = cur.fetchall()
        rsvps = []
        for row in rows:
            if row[0]:
                rsvps.extend(row[0] if isinstance(row[0], list) else [row[0]])
        return rsvps


def save_rsvps(conn, rsvps):
    with conn.cursor() as cur:
        # Clear existing and insert new
        cur.execute("DELETE FROM rsvps;")
        for rsvp in rsvps:
            cur.execute("INSERT INTO rsvps (data) VALUES (%s);", (json.dumps(rsvp),))


def load_wishes(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT name, message, date_display FROM wishes ORDER BY created_at DESC;")
        rows = cur.fetchall()
        return [
            {"name": row[0], "message": row[1], "date_display": row[2]}
            for row in rows
        ]


def save_wishes(conn, wishes):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM wishes;")
        for wish in wishes:
            cur.execute(
                "INSERT INTO wishes (name, message, date_display) VALUES (%s, %s, %s);",
                (wish.get('name'), wish.get('message'), wish.get('date_display'))
            )


def load_config(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT data FROM invitation_config WHERE id = 1;")
        row = cur.fetchone()
        if row and row[0]:
            return row[0] if isinstance(row[0], dict) else {}
        return {}


def save_config(conn, config):
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE invitation_config SET data = %s, updated_at = NOW() WHERE id = 1;",
            (json.dumps(config),)
        )


def reset_wishes_defaults(conn):
    with conn.cursor() as cur:
        cur.execute("DELETE FROM wishes;")
        defaults = [
            {
                "name": "ឯកឧត្តម លី សុផាត",
                "date_display": "ថ្មីៗនេះ",
                "message": "សូមប្រសិទ្ធពរជ័យមង្គល សិរីសួស្តី វិបុលសុខគ្រប់ប្រការដល់គូស្វាមីភរិយាថ្មី ស្រឡាញ់គ្នារហូតដល់ចាស់កោងខ្នង!"
            },
            {
                "name": "លោកជំទាវ ម៉េង គន្ធា",
                "date_display": "ថ្មីៗនេះ",
                "message": "អបអរសាទរពិធីមង្គលការ! សូមឱ្យគ្រួសារថ្មីពោរពេញដោយសុភមង្គល ទ្រព្យសម្បត្តិហូរហៀរ និងត្រជាក់ត្រជុំដូចទឹកអង្គរ។"
            },
            {
                "name": "មិត្តភក្តិរួមការងារ (ABA Team)",
                "date_display": "ថ្មីៗនេះ",
                "message": "Congratulations Vibol & Devi! Wishing you both a lifetime of eternal love, prosperity, and happiness!"
            }
        ]
        for wish in defaults:
            cur.execute(
                "INSERT INTO wishes (name, message, date_display) VALUES (%s, %s, %s);",
                (wish['name'], wish['message'], wish['date_display'])
            )


class EInvitationHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def get_db(self):
        conn = get_db_connection()
        if conn is None:
            self.send_response(500)
            self.end_headers()
            return None
        init_tables(conn)
        return conn

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        conn = self.get_db()
        if conn is None:
            return

        try:
            if path == '/api/rsvps':
                db = load_rsvps(conn)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(db, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wishes':
                db = load_wishes(conn)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(db, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/config':
                db = load_config(conn)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(db, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/test-db':
                db = load_rsvps(conn)
                wish_count = len(load_wishes(conn))
                config_count = len(load_config(conn))
                res = {
                    "success": True,
                    "status": "connected",
                    "message": "Connected to Supabase PostgreSQL successfully!",
                    "databaseType": "postgresql",
                    "counts": {
                        "rsvps": len(db),
                        "wishes": wish_count,
                        "configFields": config_count
                    },
                    "data": {
                        "invitation_config": load_config(conn),
                        "rsvps": db,
                        "wishes": load_wishes(conn)
                    }
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
                return
        finally:
            conn.close()

        # Friendly direct routes
        if path in ('/databasecloud', '/databasecloud/'):
            file_path = os.path.join(BASE_DIR, 'databasecloud', 'index.html')
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return

        elif path in ('/generate', '/generate/'):
            file_path = os.path.join(BASE_DIR, 'generate', 'index.html')
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return

        elif path in ('/admin', '/admin/'):
            file_path = os.path.join(BASE_DIR, 'admin', 'index.html')
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return

        # Fallback to standard static file server
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'

        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        conn = self.get_db()
        if conn is None:
            self.send_response(500)
            self.end_headers()
            return

        try:
            if path == '/api/rsvp':
                if "rsvps" not in payload:
                    payload["rsvps"] = []

                # Add or update RSVP
                rsvps = load_rsvps(conn)
                rsvps.insert(0, payload)

                # If wish included, also store in wishes list
                wishes_text = payload.get('wishes', '').strip()
                if wishes_text:
                    new_wish = {
                        "name": payload.get('name', 'ភ្ញៀវកិត្តិយស'),
                        "date_display": "ទើបតែផ្ញើ",
                        "message": wishes_text
                    }
                    # Remove if same message already exists to avoid duplicates
                    existing_wishes = load_wishes(conn)
                    existing_names = [w.get('name') for w in existing_wishes]
                    if new_wish['name'] not in existing_names:
                        existing_wishes.insert(0, new_wish)
                        save_wishes(conn, existing_wishes)

                save_rsvps(conn, rsvps)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "RSVP successfully saved to database!"}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wish':
                db = load_wishes(conn)
                db.insert(0, payload)
                save_wishes(conn, db)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Wish saved to database!"}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/config':
                db = load_config(conn)
                db["invitation_config"] = payload
                save_config(conn, db)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Config saved to database!"}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/reset-wishes':
                reset_wishes_defaults(conn)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "wishes": load_wishes(conn)}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/upload-video':
                import re, base64, time
                filename = payload.get('filename', 'wedding_video.mp4')
                safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
                if not safe_name.lower().endswith(('.mp4', '.webm', '.mov', '.ogg')):
                    safe_name += '.mp4'

                unique_name = f"video_{int(time.time())}_{safe_name}"
                video_dir = os.path.join(BASE_DIR, 'assets', 'videos')
                os.makedirs(video_dir, exist_ok=True)
                dest_path = os.path.join(video_dir, unique_name)

                b64_str = payload.get('base64Data', '')
                if ',' in b64_str:
                    b64_str = b64_str.split(',', 1)[1]

                video_bytes = base64.b64decode(b64_str)
                with open(dest_path, 'wb') as f:
                    f.write(video_bytes)

                rel_url = f"assets/videos/{unique_name}"
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "url": rel_url,
                    "filename": unique_name,
                    "sizeBytes": len(video_bytes),
                    "message": "Video uploaded successfully!"
                }, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/rsvp/clear':
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM rsvps;")
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wishes/clear':
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM wishes;")
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wish':
                name = payload.get('name')
                msg = payload.get('message')
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM wishes WHERE name = %s AND message = %s;",
                        (name, msg)
                    )
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wishes/clear':
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM wishes;")
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'

        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        conn = self.get_db()
        if conn is None:
            self.send_response(500)
            self.end_headers()
            return

        try:
            if path == '/api/rsvp':
                name = payload.get('name')
                submitted_at = payload.get('submittedAt')
                rsvps = load_rsvps(conn)
                rsvps = [r for r in rsvps if not (r.get("name") == name and (not submitted_at or r.get("submittedAt") == submitted_at))]
                save_rsvps(conn, rsvps)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/rsvps/clear':
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM rsvps;")
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wish':
                name = payload.get('name')
                msg = payload.get('message')
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM wishes WHERE name = %s AND message = %s;",
                        (name, msg)
                    )
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

            elif path == '/api/wishes/clear':
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM wishes;")
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    os.chdir(BASE_DIR)
    server_address = (HOST, PORT)
    httpd = http.server.HTTPServer(server_address, EInvitationHandler)
    print(f"E-Invitation Database & Web Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        sys.exit(0)