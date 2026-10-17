#!/usr/bin/env python3
"""
Custom HTTP & API Database Server for Khmer Royal E-Invitation.
Handles static files, RSVP submissions, guestbook wishes, and configuration persistence
directly to disk in database/invitation_data.json with CORS support.
"""

import http.server
import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'database', 'invitation_data.json')

def load_db():
    if not os.path.exists(DB_FILE):
        return {"invitation_config": {}, "wishes": [], "rsvps": []}
    try:
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if "rsvps" not in data:
                data["rsvps"] = []
            if "wishes" not in data:
                data["wishes"] = []
            return data
    except Exception as e:
        print(f"Error reading {DB_FILE}: {e}")
        return {"invitation_config": {}, "wishes": [], "rsvps": []}

def save_db(data):
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    try:
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving {DB_FILE}: {e}")
        return False

# ==========================================================================
# Supabase dynamic connection (auto)
# --------------------------------------------------------------------------
# The client anon/publishable key is a PUBLIC key (safe to ship). It is used
# here so the Python backend auto-syncs with the same Cloud database the
# browser uses, with no manual setup. Override via env vars if needed:
#   SUPABASE_URL, SUPABASE_KEY
# The Postgres connection string / DB password is NEVER hardcoded - set it in
# the host's environment (DATABASE_URL) if direct Postgres access is required.
# ==========================================================================
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://htooctdmmtcpujkfhbna.supabase.co').rstrip('/')
SUPABASE_KEY = os.environ.get(
    'SUPABASE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b29jdGRtbXRjcHVqa2ZoYm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzY1OTIsImV4cCI6MjEwNzU1MjU5Mn0.onLnKaW5fekx81nbHgLiCM0wMbCfqED3Bjj2C8mR_l0',
)
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)

# The active invitation record id in Supabase (multi-tenant schema). RSVPs link
# to this via rsvps.invitation_id. Override with env INVITATION_ID if needed.
INVITATION_ID = os.environ.get('INVITATION_ID', '8957c601-8044-4935-aa3d-1f369b0befa1')


def _sb_request(method, table, query='', data=None, prefer=None, timeout=8):
    """Low-level PostgREST call to Supabase. Returns parsed JSON or None on failure."""
    if not SUPABASE_ENABLED:
        return None
    url = f"{SUPABASE_URL}/rest/v1/{table}{query}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
    }
    if prefer:
        headers['Prefer'] = prefer
    body = json.dumps(data, ensure_ascii=False).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode('utf-8')
            return json.loads(raw) if raw.strip() else []
    except urllib.error.HTTPError as e:
        detail = ''
        try:
            detail = e.read().decode('utf-8')[:200]
        except Exception:
            pass
        print(f"[Supabase] {method} {table} HTTP {e.code}: {detail}")
        return None
    except Exception as e:
        print(f"[Supabase] {method} {table} error: {e}")
        return None


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def sb_test_connection():
    """Return (ok, message) describing Supabase reachability."""
    if not SUPABASE_ENABLED:
        return False, 'Supabase not configured'
    res = _sb_request('GET', 'invitation_config', '?select=id&limit=1')
    if res is None:
        return False, 'Supabase unreachable or tables missing'
    return True, 'Supabase connected'


def sb_fetch_config():
    rows = _sb_request('GET', 'invitation_config', '?id=eq.wedding_main&select=config_json')
    if isinstance(rows, list) and rows:
        cfg = rows[0].get('config_json')
        return cfg if isinstance(cfg, dict) and cfg else None
    return None


def sb_save_config(config):
    return _sb_request(
        'POST', 'invitation_config', '',
        [{'id': 'wedding_main', 'config_json': config, 'updated_at': _now_iso()}],
        prefer='resolution=merge-duplicates,return=minimal',
    )


def sb_fetch_rsvps():
    rows = _sb_request('GET', 'rsvps', '?select=*&order=created_at.desc')
    if not isinstance(rows, list):
        return None
    return [
        {
            'name': r.get('guest_name') or r.get('name'),
            'phone': r.get('guest_phone') or r.get('phone') or '',
            'attendance': r.get('attendance_status') or r.get('attendance') or 'attending',
            'count': r.get('guest_count') if r.get('guest_count') is not None else (r.get('count') or 0),
            'wishes': r.get('wish_message') if r.get('wish_message') is not None else (r.get('wishes') or ''),
            'submittedAt': r.get('created_at') or r.get('submitted_at'),
        }
        for r in rows
    ]


def sb_push_rsvp(r):
    row = {
        'invitation_id': INVITATION_ID,
        'guest_name': r.get('name'),
        'guest_phone': r.get('phone', ''),
        'attendance_status': r.get('attendance', 'attending'),
        'guest_count': int(r.get('count') or 0),
        'wish_message': r.get('wishes', ''),
    }
    return _sb_request('POST', 'rsvps', '', [row], prefer='return=minimal')


def sb_fetch_wishes():
    rows = _sb_request('GET', 'wishes', '?select=*&order=created_at.desc')
    if not isinstance(rows, list):
        return None
    return [
        {
            'name': w.get('name'),
            'date_display': w.get('date_display') or 'ថ្មីៗនេះ',
            'message': w.get('message'),
        }
        for w in rows
    ]


def sb_push_wish(w):
    return _sb_request(
        'POST', 'wishes', '',
        [{
            'name': w.get('name'),
            'date_display': w.get('date_display') or w.get('date') or 'ថ្មីៗនេះ',
            'message': w.get('message'),
        }],
        prefer='return=minimal',
    )


def sb_delete_rsvp(name, submitted_at=None):
    query = f'?guest_name=eq.{urllib.parse.quote(str(name))}'
    if submitted_at:
        query += f'&created_at=eq.{urllib.parse.quote(str(submitted_at))}'
    return _sb_request('DELETE', 'rsvps', query)


def sb_delete_wish(name, message):
    query = (
        f'?name=eq.{urllib.parse.quote(str(name))}'
        f'&message=eq.{urllib.parse.quote(str(message))}'
    )
    return _sb_request('DELETE', 'wishes', query)


def sb_clear_rsvps():
    return _sb_request('DELETE', 'rsvps', f'?invitation_id=eq.{urllib.parse.quote(INVITATION_ID)}')


def sb_clear_wishes():
    return _sb_request('DELETE', 'wishes', '?name=neq.__none__')


class EInvitationHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        path = urlparse(self.path).path
        if path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        else:
            # Cache static assets (Khmer fonts, CSS, JS, images, audio, video)
            self.send_header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/rsvps':
            # Prefer Supabase (Cloud, shared with all clients), fall back to local JSON
            rsvps = sb_fetch_rsvps()
            if rsvps is None:
                db = load_db()
                rsvps = db.get("rsvps", [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(rsvps, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wishes':
            wishes = sb_fetch_wishes()
            if wishes is None:
                db = load_db()
                wishes = db.get("wishes", [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(wishes, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/config':
            cfg = sb_fetch_config()
            if cfg is None:
                db = load_db()
                cfg = db.get("invitation_config", {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(cfg, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/test-db':
            db = load_db()
            db_size = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
            sb_ok, sb_msg = sb_test_connection()
            res = {
                "success": True,
                "status": "connected",
                "message": "Connected to Local Database JSON successfully!",
                "databasePath": "database/invitation_data.json",
                "databaseSizeBytes": db_size,
                "supabase": {
                    "enabled": SUPABASE_ENABLED,
                    "connected": sb_ok,
                    "url": SUPABASE_URL,
                    "message": sb_msg
                },
                "counts": {
                    "rsvps": len(db.get("rsvps", [])),
                    "wishes": len(db.get("wishes", [])),
                    "configFields": len(db.get("invitation_config", {}))
                },
                "data": {
                    "invitation_config": db.get("invitation_config", {}),
                    "rsvps": db.get("rsvps", []),
                    "wishes": db.get("wishes", [])
                }
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/export':
            db_data = export_database()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(db_data.encode('utf-8'))
            return

        elif path == '/api/import':
            # Import database from JSON - for POST requests
            # In browser, use POST method (e.g., via HTML form or curl)
            # For GET requests, show instructions
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "message": "Use POST method to import database",
                "instructions": {
                    "curl": "curl -X POST -H 'Content-Type: application/json' -d @yourfile.json https://e-invitations.onrender.com/api/import",
                    "html_form": "<form method='POST' enctype='multipart/form-data' action='/api/import'><input type='file' name='database'/><button type='submit'>Import</button></form>"
                }
            }, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/upload-mp3':
            # MP3 upload endpoint - for POST requests
            # In browser, use POST method via HTML form or curl
            # For GET requests, show instructions
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "message": "Use POST method to upload MP3",
                "instructions": {
                    "curl": "curl -X POST -H 'Content-Type: application/json' -d '{\"filename\":\"song.mp3\",\"base64Data\":\"DATA\"}' https://e-invitations.onrender.com/api/upload-mp3",
                    "html_form": "<form method='POST' enctype='application/json' action='/api/upload-mp3'><input type='text' name='json-data'/><button type='submit'>Upload MP3</button></form>"
                }
            }, ensure_ascii=False).encode('utf-8'))
            return


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

        if path == '/api/rsvp':
            db = load_db()
            if "rsvps" not in db:
                db["rsvps"] = []

            # Add or update RSVP
            db["rsvps"].insert(0, payload)

            # If wish included, also store in wishes list
            wishes_text = payload.get('wishes', '').strip()
            new_wish = None
            if wishes_text:
                new_wish = {
                    "name": payload.get('name', 'ភ្ញៀវកិត្តិយស'),
                    "date_display": "ទើបតែផ្ញើ",
                    "message": wishes_text
                }
                # Remove if same message already exists to avoid duplicates
                db["wishes"] = [w for w in db["wishes"] if not (w.get("name") == new_wish["name"] and w.get("message") == new_wish["message"])]
                db["wishes"].insert(0, new_wish)

            save_db(db)

            # Sync to Supabase Cloud so every client updates in real time
            sb_push_rsvp(payload)
            if new_wish:
                sb_push_wish(new_wish)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "RSVP successfully saved to database file!"}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wish':
            db = load_db()
            if "wishes" not in db:
                db["wishes"] = []
            db["wishes"].insert(0, payload)
            save_db(db)
            sb_push_wish(payload)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Wish saved to database file!"}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/config':
            db = load_db()
            db["invitation_config"] = payload
            save_db(db)
            # Push config to Supabase so all connected clients re-render live
            sb_save_config(payload)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Config saved to database file!"}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/reset-wishes':
            db = load_db()
            default_wishes = [
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
            db["wishes"] = default_wishes
            save_db(db)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "wishes": default_wishes}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/import':
            import json, os
            db_file = os.path.join(BASE_DIR, 'database', 'invitation_data.json')
            try:
                with open(db_file, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Database imported successfully!"}, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        elif path == '/api/upload-video':
            try:
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
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        elif path == '/api/upload-mp3':
            try:
                import re, base64, time, mimetypes
                filename = payload.get('filename', 'song.mp3')
                safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
                if not safe_name.lower().endswith('.mp3'):
                    safe_name += '.mp3'
                
                unique_name = f"music_{int(time.time())}_{safe_name}"
                music_dir = os.path.join(BASE_DIR, 'assets', 'music')
                os.makedirs(music_dir, exist_ok=True)
                dest_path = os.path.join(music_dir, unique_name)

                b64_str = payload.get('base64Data', '')
                if ',' in b64_str:
                    b64_str = b64_str.split(',', 1)[1]
                
                audio_bytes = base64.b64decode(b64_str)
                
                # Limit to 10 music files - remove oldest if over limit
                existing_files = []
                if os.path.exists(music_dir):
                    for f in os.listdir(music_dir):
                        if f.endswith('.mp3'):
                            existing_files.append(f)
                
                if len(existing_files) >= 10:
                    # Remove oldest file (first in sorted list)
                    oldest = sorted(existing_files)[0]
                    os.remove(os.path.join(music_dir, oldest))
                
                with open(dest_path, 'wb') as f:
                    f.write(audio_bytes)
                
                rel_url = f"assets/music/{unique_name}"
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "url": rel_url,
                    "filename": unique_name,
                    "sizeBytes": len(audio_bytes),
                    "message": "MP3 uploaded successfully!"
                }, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
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

        if path == '/api/rsvp':
            name = payload.get('name')
            submitted_at = payload.get('submittedAt')
            db = load_db()
            db["rsvps"] = [r for r in db.get("rsvps", []) if not (r.get("name") == name and (not submitted_at or r.get("submittedAt") == submitted_at))]
            save_db(db)
            sb_delete_rsvp(name, submitted_at)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/rsvps/clear':
            db = load_db()
            db["rsvps"] = []
            save_db(db)
            sb_clear_rsvps()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wish':
            name = payload.get('name')
            msg = payload.get('message')
            db = load_db()
            db["wishes"] = [w for w in db.get("wishes", []) if not (w.get("name") == name and w.get("message") == msg)]
            save_db(db)
            sb_delete_wish(name, msg)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wishes/clear':
            db = load_db()
            db["wishes"] = []
            save_db(db)
            sb_clear_wishes()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'

        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == '/api/import':
            import json, os
            db_file = os.path.join(BASE_DIR, 'database', 'invitation_data.json')
            try:
                with open(db_file, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Database imported successfully!"}, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()


def export_database():
    """Export the current database as JSON data"""
    db = load_db()
    return json.dumps(db, ensure_ascii=False, indent=2)


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