#!/usr/bin/env python3
"""
Custom HTTP & API Database Server for Khmer Royal E-Invitation.
Handles static files, RSVP submissions, guestbook wishes, and configuration persistence
directly to disk in database/invitation_data.json with CORS support.
"""

import http.server
import html as html_lib
import json
import os
import re
import sys
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, 'database', 'invitation_data.json')

# Automatically load .env file if present
_env_path = os.path.join(BASE_DIR, '.env')
if os.path.exists(_env_path):
    try:
        with open(_env_path, 'r', encoding='utf-8') as _ef:
            for _line in _ef:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _v = _line.split('=', 1)
                    _k, _v = _k.strip(), _v.strip().strip('"').strip("'")
                    if _k and _k not in os.environ:
                        os.environ[_k] = _v
    except Exception as _ex:
        print(f"Notice: .env load error: {_ex}")

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')

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
# The Supabase connection is handled entirely on the server-side for maximum
# security. The API key is stored safely in .env / server environment and is
# NEVER leaked or exposed to client browsers or inspection tools.
# ==========================================================================
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://htooctdmmtcpujkfhbna.supabase.co').rstrip('/')
SUPABASE_KEY = os.environ.get(
    'SUPABASE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0b29jdGRtbXRjcHVqa2ZoYm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzY1OTIsImV4cCI6MjEwNzU1MjU5Mn0.onLnKaW5fekx81nbHgLiCM0wMbCfqED3Bjj2C8mR_l0',
)
SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)

# Reserved slugs that can never be claimed by user accounts (collision prevention)
RESERVED_SLUGS = frozenset({
    'amra-wedding',  # seeded demo
    'demo',          # fallback demo
    'example',       # example template
    'test',          # testing
    'admin',         # admin route
    'api',           # api route
    'assets',        # static assets
    'useraccount',   # auth route
    'databasecloud', # cloud db route
    'generate',      # generator route
    'invitation',    # generic
    'wedding',       # generic
    'invite',        # generic
    'e-invitation',  # generic
})

def is_reserved_slug(slug: str) -> bool:
    """Check if a slug is reserved and cannot be used by user accounts."""
    if not slug:
        return True
    slug_lower = slug.lower().strip()
    if slug_lower in RESERVED_SLUGS:
        return True
    # Also block slugs that start with reserved prefixes
    for reserved in RESERVED_SLUGS:
        if slug_lower.startswith(reserved + '_') or slug_lower.startswith(reserved + '-'):
            return True
    return False


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


def _public_anon_key():
    """Return a client-safe anon/publishable key, or '' when the configured key
    is privileged (service_role / secret) and must never reach a browser.

    Supabase Auth (Google + email) requires the browser to talk to Supabase
    directly, so the public anon key must be exposed. We only expose keys whose
    role is 'anon' / publishable.
    """
    if not SUPABASE_KEY:
        return ''
    key = SUPABASE_KEY.strip()
    if key.startswith('sb_publishable_'):
        return key
    if key.startswith('sb_secret_') or key.startswith('sb_service'):
        return ''
    try:
        import base64
        payload = key.split('.')[1]
        payload += '=' * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
        return key if data.get('role') == 'anon' else ''
    except Exception:
        return ''


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
    result = _sb_request(
        'POST', 'invitation_config', '',
        [{'id': 'wedding_main', 'config_json': config, 'updated_at': _now_iso()}],
        prefer='resolution=merge-duplicates,return=minimal',
    )
    sb_save_music(config)
    return result


def sb_save_music(config):
    """Mirror the background-music playlist onto the invitations row.

    Keeps public.invitations.music_playlist / music_url in sync with the
    invitation config so the schema stays authoritative. Silently no-ops if
    the playlist is absent or the column has not been created yet.
    """
    if not isinstance(config, dict):
        return None
    playlist = config.get('bgMusicPlaylist')
    music_url = config.get('bgMusicUrl')
    if playlist is None and not music_url:
        return None

    row = {'updated_at': _now_iso()}
    if isinstance(playlist, list):
        row['music_playlist'] = playlist
    if music_url:
        row['music_url'] = music_url

    query = f'?id=eq.{urllib.parse.quote(INVITATION_ID)}'
    return _sb_request('PATCH', 'invitations', query, row, prefer='return=minimal')


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


# ==========================================================================
# Dynamic Social Sharing (OpenGraph) — link previews mirror the live config
# ==========================================================================

def _get_live_config():
    """Return the current invitation config (Supabase first, local JSON fallback)."""
    cfg = sb_fetch_config()
    if isinstance(cfg, dict) and cfg:
        return cfg
    try:
        cfg = load_db().get('invitation_config', {})
    except Exception:
        cfg = {}
    return cfg if isinstance(cfg, dict) else {}


def _og_values(cfg):
    """Build (og_title, description, image) from the live config."""
    title = (cfg.get('invitationTitle') or 'សិរីសួស្តី អាពាហ៍ពិពាហ៍').strip()
    groom = (cfg.get('groomName') or '').strip()
    bride = (cfg.get('brideName') or '').strip()
    couple = ''
    if groom or bride:
        couple = (groom + ' ❤️ ' + bride).strip(' ❤️ ')
    og_title = (title + ' | ' + couple) if couple else title

    desc = (cfg.get('invitationSubtext') or cfg.get('invitationGreeting') or '').strip()
    if not desc:
        desc = 'សូមគោរពអញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីសិរីមង្គលអាពាហ៍ពិពាហ៍'
    if couple and groom and bride:
        desc = f"សូមគោរពអញ្ជើញចូលរួមពិធីមង្គលការ {groom} និង {bride}។ {desc}"
    image = (cfg.get('couplePhoto') or cfg.get('sealImage') or 'assets/images/couple.jpg').strip()
    return og_title, desc, image


def _set_meta(page, prop, value):
    pattern = re.compile(
        r'(<meta\s+property="' + re.escape(prop) + r'"\s+content=")[^"]*(")',
        re.IGNORECASE,
    )
    return pattern.sub(lambda m: m.group(1) + html_lib.escape(value, quote=True) + m.group(2), page)


def render_index_html(base_url=''):
    """Return index.html with OpenGraph/Twitter tags populated from the live config."""
    path = os.path.join(BASE_DIR, 'index.html')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            page = f.read()
    except Exception as e:
        print(f'[OG] Cannot read index.html: {e}')
        return None

    cfg = _get_live_config()
    og_title, desc, image = _og_values(cfg)

    if image and not re.match(r'^(https?:)?//', image):
        image_url = (base_url.rstrip('/') + '/' + image.lstrip('/')) if base_url else image
    else:
        image_url = image

    page = re.sub(r'<title>.*?</title>', '<title>' + html_lib.escape(og_title) + '</title>',
                  page, count=1, flags=re.DOTALL)
    page = _set_meta(page, 'og:title', og_title)
    page = _set_meta(page, 'og:description', desc)
    page = _set_meta(page, 'og:image', image_url)
    # Keep the plain description in sync too
    page = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")',
                  lambda m: m.group(1) + html_lib.escape(desc, quote=True) + m.group(2),
                  page, count=1, flags=re.IGNORECASE)

    extra = (
        f'<meta property="og:url" content="{html_lib.escape((base_url.rstrip("/") + "/") if base_url else "", quote=True)}">\n'
        '  <meta property="og:site_name" content="Khmer Royal E-Invitation">\n'
        f'<meta property="og:image:secure_url" content="{html_lib.escape(image_url, quote=True)}">\n'
        '  <meta name="twitter:card" content="summary_large_image">\n'
        f'<meta name="twitter:title" content="{html_lib.escape(og_title, quote=True)}">\n'
        f'<meta name="twitter:description" content="{html_lib.escape(desc, quote=True)}">\n'
        f'<meta name="twitter:image" content="{html_lib.escape(image_url, quote=True)}">'
    )
    existing = '<meta property="og:type" content="website">'
    if existing in page:
        page = page.replace(existing, existing + '\n  ' + extra, 1)
    else:
        page = page.replace('</head>', '  ' + extra + '\n</head>', 1)
    return page


class EInvitationHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        path = urlparse(self.path).path
        if path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        elif path.endswith(('.html', '.js', '.css')) or path.endswith('/'):
            # HTML/JS/CSS must always revalidate so admin config & code updates
            # (fonts, theme, sections) reach visitors immediately.
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        else:
            # Long-cache heavy static assets (images, audio, video, fonts)
            self.send_header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
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

        elif path == '/api/supabase/status':
            sb_ok, sb_msg = sb_test_connection()
            res = {
                "success": sb_ok,
                "connected": sb_ok,
                "url": SUPABASE_URL,
                "message": sb_msg,
                "secured": True
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


        # Dynamic index.html so social link previews mirror the live config
        if path in ('/', '/index.html'):
            host = self.headers.get('Host') or ''
            proto = self.headers.get('X-Forwarded-Proto') or ('https' if 'onrender.com' in host else 'http')
            base_url = f"{proto}://{host}" if host else ''
            page = render_index_html(base_url)
            if page is not None:
                body = page.encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
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

        elif path == '/api/upload-image':
            try:
                import re, base64, time, mimetypes
                filename = payload.get('filename', 'poster.jpg')
                safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
                if not safe_name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.ico', '.svg')):
                    safe_name += '.jpg'

                unique_name = f"image_{int(time.time())}_{safe_name}"
                image_dir = os.path.join(BASE_DIR, 'assets', 'images')
                os.makedirs(image_dir, exist_ok=True)
                dest_path = os.path.join(image_dir, unique_name)

                b64_str = payload.get('base64Data', '')
                if ',' in b64_str:
                    b64_str = b64_str.split(',', 1)[1]

                image_bytes = base64.b64decode(b64_str)
                with open(dest_path, 'wb') as f:
                    f.write(image_bytes)

                rel_url = f"assets/images/{unique_name}"
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "url": rel_url,
                    "filename": unique_name,
                    "sizeBytes": len(image_bytes),
                    "message": "Image uploaded successfully!"
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

        elif path == '/api/supabase/config':
            url = payload.get('url', '').strip()
            key = payload.get('key', '').strip()
            global SUPABASE_URL, SUPABASE_KEY, SUPABASE_ENABLED
            if url:
                SUPABASE_URL = url.rstrip('/')
            if key and not key.startswith('••••'):
                SUPABASE_KEY = key
            SUPABASE_ENABLED = bool(SUPABASE_URL and SUPABASE_KEY)
            sb_ok, sb_msg = sb_test_connection()

            # Save to .env if writable
            try:
                if os.path.exists(_env_path):
                    with open(_env_path, 'r', encoding='utf-8') as ef:
                        lines = ef.readlines()
                    updated = []
                    found_url, found_key = False, False
                    for l in lines:
                        if l.strip().startswith('SUPABASE_URL='):
                            updated.append(f"SUPABASE_URL={SUPABASE_URL}\n")
                            found_url = True
                        elif l.strip().startswith('SUPABASE_KEY='):
                            if key and not key.startswith('••••'):
                                updated.append(f"SUPABASE_KEY={SUPABASE_KEY}\n")
                            else:
                                updated.append(l)
                            found_key = True
                        else:
                            updated.append(l)
                    if not found_url:
                        updated.append(f"SUPABASE_URL={SUPABASE_URL}\n")
                    if not found_key and key and not key.startswith('••••'):
                        updated.append(f"SUPABASE_KEY={SUPABASE_KEY}\n")
                    with open(_env_path, 'w', encoding='utf-8') as ef:
                        ef.writelines(updated)
            except Exception as ex:
                print(f"Notice: .env update warning: {ex}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": sb_ok,
                "connected": sb_ok,
                "message": sb_msg,
                "supabase": {
                    "enabled": SUPABASE_ENABLED,
                    "connected": sb_ok,
                    "url": SUPABASE_URL,
                    "secured": True
                }
            }, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/supabase/sync':
            db = load_db()
            rsvps = db.get("rsvps", [])
            wishes = db.get("wishes", [])
            cfg = db.get("invitation_config", {})
            synced_rsvps = 0
            synced_wishes = 0
            for r in rsvps:
                if sb_push_rsvp(r) is not None:
                    synced_rsvps += 1
            for w in wishes:
                if sb_push_wish(w) is not None:
                    synced_wishes += 1
            if cfg:
                sb_save_config(cfg)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": f"Synced {synced_rsvps} RSVPs & {synced_wishes} Wishes to Supabase Cloud!",
                "syncedRsvps": synced_rsvps,
                "syncedWishes": synced_wishes
            }, ensure_ascii=False).encode('utf-8'))
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