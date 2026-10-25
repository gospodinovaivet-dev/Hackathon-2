"""Upload the checked-in illustrative photos. Python standard library only.
The admin key is read from a hidden prompt, never written to the browser or disk.
"""
import getpass
import json
import urllib.error
import urllib.parse
import urllib.request
from setup import ROOT, load_config


def upload(url, key):
    def request(path, method='GET', data=None, mime='application/json', extra=None):
        headers = {'apikey': key, 'Content-Type': mime, **(extra or {})}
        if not key.startswith('sb_secret_'):
            headers['Authorization'] = 'Bearer ' + key
        req = urllib.request.Request(url.rstrip('/') + '/storage/v1/' + path,
                                     data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read()
            return json.loads(body) if body else None

    # Inspect first: only create our own bucket; never change an existing bucket's visibility.
    try:
        bucket = request('bucket/mock-photos')
    except urllib.error.HTTPError as exc:
        if exc.code not in (400, 404):
            raise
        # Storage sometimes returns 400 for a missing bucket; confirm using the bucket list.
        buckets = request('bucket')
        if any(b['id'] == 'mock-photos' for b in buckets):
            raise RuntimeError('Cannot inspect the existing mock-photos bucket.') from None
        bucket = request('bucket', 'POST', json.dumps({
            'id': 'mock-photos', 'name': 'mock-photos', 'public': True,
            'allowed_mime_types': ['image/jpeg'], 'file_size_limit': 5242880
        }).encode())
        bucket = request('bucket/mock-photos')
    if not bucket.get('public'):
        raise RuntimeError('mock-photos must be a public bucket for these shared illustrations.')
    catalog = json.loads((ROOT / 'supabase/mock-catalog.json').read_text())
    for photo in catalog['photos']:
        path = photo['object_path']
        content = (ROOT / 'assets/products' / path).read_bytes()
        request('object/mock-photos/' + urllib.parse.quote(path, safe=''), 'POST', content,
                'image/jpeg', {'x-upsert': 'true', 'cache-control': '3600'})
        print('Uploaded:', path)
    print('Done. Refresh the app and confirm an example scan to save items to your fridge.')


def main():
    url, _ = load_config()
    if not url:
        raise SystemExit('Configure the Supabase project URL in .env first.')
    print('Project:', url)
    print('Uploads 15 shared demo illustrations to the public mock-photos bucket.')
    key = getpass.getpass('Supabase secret/service-role key (hidden, used only for this upload): ').strip()
    if not key or key.startswith('sb_publishable_'):
        raise SystemExit('An admin key is required for this one-time upload, not the publishable key.')
    try:
        upload(url, key)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f'Upload failed (HTTP {exc.code}). Check the project/key and Storage permissions. Rerunning safely retries the uploads.') from None


if __name__ == '__main__':
    main()
