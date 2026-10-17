#!/usr/bin/env python3
"""
Flask WSGI entry point for Vercel deployment of the Khmer Royal E-Invitation system.
Reuses the database helpers from server.py and mirrors every API endpoint so that
the same static site + REST API works both locally (server.py) and on Vercel (app.py).
"""

import os
import re
import time
import json
import base64
import mimetypes

from flask import Flask, request, jsonify, send_from_directory, Response

from server import (
    BASE_DIR,
    DB_FILE,
    load_db,
    save_db,
    export_database,
    SUPABASE_URL,
    SUPABASE_KEY,
    SUPABASE_ENABLED,
    sb_test_connection,
    sb_fetch_config,
    sb_save_config,
    sb_fetch_rsvps,
    sb_push_rsvp,
    sb_fetch_wishes,
    sb_push_wish,
    sb_delete_rsvp,
    sb_delete_wish,
    sb_clear_rsvps,
    sb_clear_wishes,
)

app = Flask(__name__, static_folder=None)


def json_response(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False),
        status=status,
        mimetype='application/json; charset=utf-8',
    )


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    elif request.path.endswith(('.html', '.js', '.css')) or request.path.endswith('/'):
        # HTML/JS/CSS always revalidate so admin config & code updates
        # (fonts, theme, sections) reach visitors immediately.
        response.headers['Cache-Control'] = 'no-cache, must-revalidate'
    else:
        # Long-cache heavy static assets (images, audio, video, fonts)
        response.headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=604800'
    return response


# ==========================================================================
# API: Read endpoints
# ==========================================================================
@app.route('/api/rsvps', methods=['GET'])
def api_rsvps():
    rsvps = sb_fetch_rsvps()
    if rsvps is None:
        db = load_db()
        rsvps = db.get('rsvps', [])
    return json_response(rsvps)


@app.route('/api/wishes', methods=['GET'])
def api_wishes():
    wishes = sb_fetch_wishes()
    if wishes is None:
        db = load_db()
        wishes = db.get('wishes', [])
    return json_response(wishes)


@app.route('/api/config', methods=['GET'])
def api_config_get():
    cfg = sb_fetch_config()
    if cfg is None:
        db = load_db()
        cfg = db.get('invitation_config', {})
    return json_response(cfg)


@app.route('/api/test-db', methods=['GET'])
def api_test_db():
    db = load_db()
    db_size = os.path.getsize(DB_FILE) if os.path.exists(DB_FILE) else 0
    sb_ok, sb_msg = sb_test_connection()
    return json_response({
        'success': True,
        'status': 'connected',
        'message': 'Connected to Local Database JSON successfully!',
        'databasePath': 'database/invitation_data.json',
        'databaseSizeBytes': db_size,
        'supabase': {
            'enabled': SUPABASE_ENABLED,
            'connected': sb_ok,
            'url': SUPABASE_URL,
            'message': sb_msg,
        },
        'counts': {
            'rsvps': len(db.get('rsvps', [])),
            'wishes': len(db.get('wishes', [])),
            'configFields': len(db.get('invitation_config', {})),
        },
        'data': {
            'invitation_config': db.get('invitation_config', {}),
            'rsvps': db.get('rsvps', []),
            'wishes': db.get('wishes', []),
        },
    })


@app.route('/api/export', methods=['GET'])
def api_export():
    return Response(export_database(), mimetype='application/json; charset=utf-8')


# ==========================================================================
# API: Write endpoints
# ==========================================================================
@app.route('/api/config', methods=['POST'])
def api_config_post():
    payload = request.get_json(silent=True) or {}
    db = load_db()
    db['invitation_config'] = payload
    save_db(db)
    sb_save_config(payload)
    return json_response({'success': True, 'message': 'Config saved to database file!'})


@app.route('/api/rsvp', methods=['POST'])
def api_rsvp_post():
    payload = request.get_json(silent=True) or {}
    db = load_db()
    if 'rsvps' not in db:
        db['rsvps'] = []
    db['rsvps'].insert(0, payload)

    new_wish = None
    wishes_text = (payload.get('wishes') or '').strip()
    if wishes_text:
        new_wish = {
            'name': payload.get('name', 'ភ្ញៀវកិត្តិយស'),
            'date_display': 'ទើបតែផ្ញើ',
            'message': wishes_text,
        }
        db['wishes'] = [
            w for w in db.get('wishes', [])
            if not (w.get('name') == new_wish['name'] and w.get('message') == new_wish['message'])
        ]
        db['wishes'].insert(0, new_wish)

    save_db(db)
    sb_push_rsvp(payload)
    if new_wish:
        sb_push_wish(new_wish)
    return json_response({'success': True, 'message': 'RSVP successfully saved to database file!'})


@app.route('/api/wish', methods=['POST'])
def api_wish_post():
    payload = request.get_json(silent=True) or {}
    db = load_db()
    if 'wishes' not in db:
        db['wishes'] = []
    db['wishes'].insert(0, payload)
    save_db(db)
    sb_push_wish(payload)
    return json_response({'success': True, 'message': 'Wish saved to database file!'})


@app.route('/api/reset-wishes', methods=['POST'])
def api_reset_wishes():
    default_wishes = [
        {
            'name': 'ឯកឧត្តម លី សុផាត',
            'date_display': 'ថ្មីៗនេះ',
            'message': 'សូមប្រសិទ្ធពរជ័យមង្គល សិរីសួស្តី វិបុលសុខគ្រប់ប្រការដល់គូស្វាមីភរិយាថ្មី ស្រឡាញ់គ្នារហូតដល់ចាស់កោងខ្នង!',
        },
        {
            'name': 'លោកជំទាវ ម៉េង គន្ធា',
            'date_display': 'ថ្មីៗនេះ',
            'message': 'អបអរសាទរពិធីមង្គលការ! សូមឱ្យគ្រួសារថ្មីពោរពេញដោយសុភមង្គល ទ្រព្យសម្បត្តិហូរហៀរ និងត្រជាក់ត្រជុំដូចទឹកអង្គរ។',
        },
        {
            'name': 'មិត្តភក្តិរួមការងារ (ABA Team)',
            'date_display': 'ថ្មីៗនេះ',
            'message': 'Congratulations Vibol & Devi! Wishing you both a lifetime of eternal love, prosperity, and happiness!',
        },
    ]
    db = load_db()
    db['wishes'] = default_wishes
    save_db(db)
    return json_response({'success': True, 'wishes': default_wishes})


@app.route('/api/import', methods=['POST', 'PUT'])
def api_import():
    payload = request.get_json(silent=True) or {}
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return json_response({'success': True, 'message': 'Database imported successfully!'})
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, status=500)


@app.route('/api/import', methods=['GET'])
def api_import_info():
    return json_response({
        'message': 'Use POST method to import database',
        'instructions': {
            'curl': "curl -X POST -H 'Content-Type: application/json' -d @yourfile.json /api/import",
            'html_form': "<form method='POST' enctype='multipart/form-data' action='/api/import'><input type='file' name='database'/><button type='submit'>Import</button></form>",
        },
    })


# ==========================================================================
# API: Delete endpoints
# ==========================================================================
@app.route('/api/rsvp', methods=['DELETE'])
def api_rsvp_delete():
    payload = request.get_json(silent=True) or {}
    name = payload.get('name')
    submitted_at = payload.get('submittedAt')
    db = load_db()
    db['rsvps'] = [
        r for r in db.get('rsvps', [])
        if not (r.get('name') == name and (not submitted_at or r.get('submittedAt') == submitted_at))
    ]
    save_db(db)
    sb_delete_rsvp(name, submitted_at)
    return json_response({'success': True})


@app.route('/api/rsvps/clear', methods=['DELETE'])
def api_rsvps_clear():
    db = load_db()
    db['rsvps'] = []
    save_db(db)
    sb_clear_rsvps()
    return json_response({'success': True})


@app.route('/api/wish', methods=['DELETE'])
def api_wish_delete():
    payload = request.get_json(silent=True) or {}
    name = payload.get('name')
    msg = payload.get('message')
    db = load_db()
    db['wishes'] = [
        w for w in db.get('wishes', [])
        if not (w.get('name') == name and w.get('message') == msg)
    ]
    save_db(db)
    sb_delete_wish(name, msg)
    return json_response({'success': True})


@app.route('/api/wishes/clear', methods=['DELETE'])
def api_wishes_clear():
    db = load_db()
    db['wishes'] = []
    save_db(db)
    sb_clear_wishes()
    return json_response({'success': True})


# ==========================================================================
# API: Uploads
# ==========================================================================
@app.route('/api/upload-video', methods=['POST'])
def api_upload_video():
    payload = request.get_json(silent=True) or {}
    try:
        filename = payload.get('filename', 'wedding_video.mp4')
        safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
        if not safe_name.lower().endswith(('.mp4', '.webm', '.mov', '.ogg')):
            safe_name += '.mp4'
        unique_name = f'video_{int(time.time())}_{safe_name}'
        video_dir = os.path.join(BASE_DIR, 'assets', 'videos')
        os.makedirs(video_dir, exist_ok=True)

        b64_str = payload.get('base64Data', '')
        if ',' in b64_str:
            b64_str = b64_str.split(',', 1)[1]
        video_bytes = base64.b64decode(b64_str)

        with open(os.path.join(video_dir, unique_name), 'wb') as f:
            f.write(video_bytes)

        return json_response({
            'success': True,
            'url': f'assets/videos/{unique_name}',
            'filename': unique_name,
            'sizeBytes': len(video_bytes),
            'message': 'Video uploaded successfully!',
        })
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, status=500)


@app.route('/api/upload-image', methods=['POST'])
def api_upload_image():
    payload = request.get_json(silent=True) or {}
    try:
        filename = payload.get('filename', 'poster.jpg')
        safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
        if not safe_name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')):
            safe_name += '.jpg'
        unique_name = f'image_{int(time.time())}_{safe_name}'
        image_dir = os.path.join(BASE_DIR, 'assets', 'images')
        os.makedirs(image_dir, exist_ok=True)

        b64_str = payload.get('base64Data', '')
        if ',' in b64_str:
            b64_str = b64_str.split(',', 1)[1]
        image_bytes = base64.b64decode(b64_str)

        with open(os.path.join(image_dir, unique_name), 'wb') as f:
            f.write(image_bytes)

        return json_response({
            'success': True,
            'url': f'assets/images/{unique_name}',
            'filename': unique_name,
            'sizeBytes': len(image_bytes),
            'message': 'Image uploaded successfully!',
        })
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, status=500)


@app.route('/api/upload-mp3', methods=['POST'])
def api_upload_mp3():
    payload = request.get_json(silent=True) or {}
    try:
        filename = payload.get('filename', 'song.mp3')
        safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
        if not safe_name.lower().endswith('.mp3'):
            safe_name += '.mp3'
        unique_name = f'music_{int(time.time())}_{safe_name}'
        music_dir = os.path.join(BASE_DIR, 'assets', 'music')
        os.makedirs(music_dir, exist_ok=True)

        b64_str = payload.get('base64Data', '')
        if ',' in b64_str:
            b64_str = b64_str.split(',', 1)[1]
        audio_bytes = base64.b64decode(b64_str)

        existing = [f for f in os.listdir(music_dir) if f.endswith('.mp3')] if os.path.exists(music_dir) else []
        if len(existing) >= 10:
            os.remove(os.path.join(music_dir, sorted(existing)[0]))

        with open(os.path.join(music_dir, unique_name), 'wb') as f:
            f.write(audio_bytes)

        return json_response({
            'success': True,
            'url': f'assets/music/{unique_name}',
            'filename': unique_name,
            'sizeBytes': len(audio_bytes),
            'message': 'MP3 uploaded successfully!',
        })
    except Exception as e:
        return json_response({'success': False, 'error': str(e)}, status=500)


# ==========================================================================
# Static file serving (client invitation, admin panel, etc.)
# ==========================================================================
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path == '' or path.endswith('/'):
        candidate = os.path.join(BASE_DIR, path, 'index.html')
        if os.path.exists(candidate):
            return send_from_directory(BASE_DIR, os.path.join(path, 'index.html'))
        return send_from_directory(BASE_DIR, 'index.html')

    candidate = os.path.join(BASE_DIR, path)
    if os.path.exists(candidate) and os.path.isfile(candidate):
        return send_from_directory(BASE_DIR, path)

    pretty = os.path.join(BASE_DIR, path, 'index.html')
    if os.path.exists(pretty):
        return send_from_directory(BASE_DIR, os.path.join(path, 'index.html'))

    return send_from_directory(BASE_DIR, 'index.html')


# Vercel entry point
application = app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
