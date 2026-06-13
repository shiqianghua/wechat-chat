"""
WeChat Chat Generator - Backend Server
Permanent image hosting + HTML chat storage + cross-device sync

Free deployment to Render.com:
  pip install -r requirements.txt
  gunicorn server:app --bind 0.0.0.0:$PORT

API:
  POST /api/upload/image    - Upload image file (multipart), returns permanent URL
  POST /api/upload/html     - Upload HTML chat file, returns stored URL
  GET  /static/images/<fn>  - Serve uploaded images (permanent URLs)
  GET  /api/sync            - Download all groups data
  POST /api/sync            - Upload all groups data (metadata sync)
  GET  /api/health          - Health check
"""

import os
import json
import time
import uuid
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# File paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / 'data' / 'shot_data.json'
IMAGES_DIR = BASE_DIR / 'static' / 'images'
HTML_DIR = BASE_DIR / 'data' / 'html'

# Ensure directories exist
DATA_FILE.parent.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
HTML_DIR.mkdir(parents=True, exist_ok=True)


def load_data():
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {'groups': [], 'updatedAt': None}
    return {'groups': [], 'updatedAt': None}


def save_data(data):
    data['updatedAt'] = time.time()
    tmp = DATA_FILE.with_suffix('.json.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    tmp.replace(DATA_FILE)


# ========== Image Hosting (图床) ==========

@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """Upload an image file. Returns a permanent URL."""
    try:
        if 'file' not in request.files:
            return jsonify({'ok': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'ok': False, 'error': 'Empty filename'}), 400

        # Generate unique filename, preserve extension
        ext = Path(file.filename).suffix.lower()
        allowed = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}
        if ext not in allowed:
            ext = '.png'

        unique_name = f"{uuid.uuid4().hex}{ext}"
        filepath = IMAGES_DIR / unique_name
        file.save(str(filepath))

        # Build permanent URL
        host = request.host_url.rstrip('/')
        url = f"{host}/static/images/{unique_name}"

        return jsonify({
            'ok': True,
            'url': url,
            'filename': unique_name,
            'size': filepath.stat().st_size
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/static/images/<path:filename>')
def serve_image(filename):
    """Serve uploaded images (permanent URLs)."""
    return send_from_directory(str(IMAGES_DIR), filename)


# ========== HTML Chat File Upload ==========

@app.route('/api/upload/html', methods=['POST'])
def upload_html():
    """Upload HTML chat content. Returns a permanent URL."""
    try:
        body = request.get_json(force=True, silent=True)
        if body is None:
            # Try form data
            html_content = request.form.get('content', '')
            name = request.form.get('name', 'chat')
        else:
            html_content = body.get('content', '')
            name = body.get('name', 'chat')

        if not html_content:
            return jsonify({'ok': False, 'error': 'No HTML content'}), 400

        unique_name = f"{uuid.uuid4().hex}.html"
        filepath = HTML_DIR / unique_name

        # Wrap in full HTML if it's just a fragment
        if not html_content.strip().startswith('<!DOCTYPE') and not html_content.strip().startswith('<html'):
            html_content = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#ededed;padding:10px;margin:0}}
.msg{{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;max-width:100%}}
.msg.left{{justify-content:flex-start}}.msg.right{{flex-direction:row-reverse}}
.avatar{{width:36px;height:36px;border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff}}
.avatar.left{{background:#ff7675}}.avatar.right{{background:#4a90d9}}
.bubble{{max-width:240px;padding:8px 12px;border-radius:4px;font-size:16px;line-height:1.45;word-break:break-word}}
.msg.left .bubble{{background:#fff;color:#000;border:0.5px solid #e5e5e5}}
.msg.right .bubble{{background:#95ec69;color:#000}}
.time{{text-align:center;color:#b2b2b2;font-size:12px;margin:8px 0}}
.system{{text-align:center;color:#b2b2b2;font-size:12px;padding:6px 16px;background:rgba(0,0,0,0.04);border-radius:4px;margin:4px auto;max-width:280px}}
</style></head><body>{html_content}</body></html>"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

        host = request.host_url.rstrip('/')
        url = f"{host}/api/html/{unique_name}"

        return jsonify({
            'ok': True,
            'url': url,
            'filename': unique_name,
            'size': filepath.stat().st_size
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/html/<path:filename>')
def serve_html(filename):
    """Serve stored HTML chat files."""
    filepath = HTML_DIR / filename
    if not filepath.exists():
        return jsonify({'ok': False, 'error': 'Not found'}), 404
    return send_from_directory(str(HTML_DIR), filename, mimetype='text/html; charset=utf-8')


# ========== Sync ==========

@app.route('/api/sync', methods=['GET'])
def sync_download():
    try:
        data = load_data()
        return jsonify({
            'ok': True,
            'groups': data.get('groups', []),
            'updatedAt': data.get('updatedAt')
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/sync', methods=['POST'])
def sync_upload():
    try:
        body = request.get_json(force=True, silent=True)
        if body is None:
            return jsonify({'ok': False, 'error': 'Invalid JSON'}), 400

        groups = body.get('groups', [])
        if not isinstance(groups, list):
            return jsonify({'ok': False, 'error': 'Invalid groups format'}), 400

        data = load_data()
        data['groups'] = groups
        save_data(data)

        total_images = sum(len(g.get('images', [])) for g in groups)
        return jsonify({
            'ok': True,
            'groupsCount': len(groups),
            'imagesCount': total_images,
            'updatedAt': data['updatedAt']
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    data = load_data()
    total_images = sum(len(g.get('images', [])) for g in data.get('groups', []))
    return jsonify({
        'ok': True,
        'status': 'running',
        'groupsCount': len(data.get('groups', [])),
        'imagesCount': total_images,
        'storageBytes': DATA_FILE.stat().st_size if DATA_FILE.exists() else 0
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8767))
    print(f'Backend server: http://0.0.0.0:{port}')
    print(f'Images dir: {IMAGES_DIR}')
    print(f'HTML dir: {HTML_DIR}')
    app.run(host='0.0.0.0', port=port, debug=False)
