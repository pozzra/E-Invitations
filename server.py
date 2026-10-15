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
from urllib.parse import urlparse, parse_qs

PORT = 8080
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

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/rsvps':
            db = load_db()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("rsvps", []), ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wishes':
            db = load_db()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("wishes", []), ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/config':
            db = load_db()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(db.get("invitation_config", {}), ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/test-db':
            db = load_db()
            db_size = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
            res = {
                "success": True,
                "status": "connected",
                "message": "Connected to Local Database JSON successfully!",
                "databasePath": "database/invitation_data.json",
                "databaseSizeBytes": db_size,
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

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "Wish saved to database file!"}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/config':
            db = load_db()
            db["invitation_config"] = payload
            save_db(db)

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
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
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

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/rsvps/clear':
            db = load_db()
            db["rsvps"] = []
            save_db(db)

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

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            return

        elif path == '/api/wishes/clear':
            db = load_db()
            db["wishes"] = []
            save_db(db)

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
    server_address = ('', PORT)
    httpd = http.server.HTTPServer(server_address, EInvitationHandler)
    print(f"E-Invitation Database & Web Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        sys.exit(0)
