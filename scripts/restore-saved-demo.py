#!/usr/bin/env python3
"""Restore repository LMS records and the three saved student ML profiles locally."""
import argparse
import io
import json
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
ML_ROOT = ROOT / 'behavioral-auth-ml-service'
STUDENTS = {
    'vijay': '6a9268397e77cbd6c3c3e886',
    'ragavan': '6ab3f447e9fa5f05ade70262',
    'sarvanth': '6ab4975852379a75c38844e5',
}

MONGO_RESTORE = r'''
const records = EJSON.parse(require('fs').readFileSync(0, 'utf8'));
const collection = db.getCollection(process.env.RESTORE_COLLECTION);
let inserted = 0, kept = 0;
for (const record of records) {
    if (process.env.RESTORE_COLLECTION === 'users' &&
        collection.findOne({email: record.email, _id: {$ne: record._id}})) {
        throw new Error('Account ID conflict for ' + record.email +
                        '; no existing account was overwritten. Resolve before restoring ML profiles.');
    }
    const result = collection.updateOne({_id: record._id}, {$setOnInsert: record}, {upsert: true});
    if (result.upsertedCount) inserted++; else kept++;
}
print(process.env.RESTORE_COLLECTION + ': ' + inserted + ' restored, ' + kept + ' existing records kept');
'''

ML_RESTORE = r'''
import datetime, io, json, pathlib, shutil, sys, tarfile
root = pathlib.Path('/app/behavioral-auth-ml-service')
backup = root / 'data' / ('restore-backup-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
with tarfile.open(fileobj=io.BytesIO(sys.stdin.buffer.read()), mode='r:') as archive:
    for member in archive.getmembers():
        name = pathlib.PurePosixPath(member.name)
        if not member.isfile() or len(name.parts) != 2 or name.parts[0] not in ('data', 'models') or '..' in name.parts:
            raise ValueError('Unexpected archive entry: ' + member.name)
        target = root / member.name
        if target.exists():
            saved = backup / member.name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
        target.parent.mkdir(parents=True, exist_ok=True)
        with archive.extractfile(member) as source, target.open('wb') as output:
            shutil.copyfileobj(source, output)
print('Previous profile/model files, if present, backed up under ' + str(backup), flush=True)
sys.path.insert(0, str(root / 'backend'))
import storage
for uid in ('6a9268397e77cbd6c3c3e886', '6ab3f447e9fa5f05ade70262', '6ab4975852379a75c38844e5'):
    profile = storage.load_user(uid)
    if storage.load_model(uid) is None or not profile.get('baseline_trained_at'):
        raise RuntimeError('Trained profile failed verification: ' + uid)
    print(uid + ': trained model loaded; ' + str(len(profile.get('enroll_samples', []))) + ' enrollment samples')
'''


def compose(*args, payload=None):
    subprocess.run(['docker', 'compose', *args], cwd=ROOT, input=payload, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate saved inputs without changing Docker data')
    args = parser.parse_args()
    seeds = sorted((ROOT / 'backend/db_seeds').glob('*.json'))
    seeds.sort(key=lambda path: path.stem != 'users')
    if not seeds:
        raise RuntimeError('Saved LMS exports are missing')
    for path in seeds:
        records = json.loads(path.read_text())
        if not isinstance(records, list) or any('_id' not in row for row in records):
            raise ValueError('Invalid export: ' + str(path))
        print(f'{path.stem}: {len(records)} saved records', flush=True)
    users = json.loads((ROOT / 'backend/db_seeds/users.json').read_text())
    files = []
    for name, uid in STUDENTS.items():
        if not any(user['_id'] == uid and user['email'] == name + '@gmail.com' for user in users):
            raise ValueError('Saved LMS and ML IDs do not match: ' + name)
        for alias in (uid, name):
            profile = Path('data') / (alias + '.json')
            model = Path('models') / (alias + '.joblib')
            data = json.loads((ML_ROOT / profile).read_text())
            if not data.get('baseline_trained_at') or not (ML_ROOT / model).stat().st_size:
                raise ValueError('Missing trained profile/model: ' + alias)
            files.extend((profile, model))
        print(f'{name}: saved trained profile and model found', flush=True)
    if args.check:
        return

    # Fail before making changes if Docker permissions or services are unavailable.
    compose('exec', '-T', 'mongo', 'mongosh', '--quiet', '--eval', "db.adminCommand('ping')")
    compose('exec', '-T', 'ml', 'python', '-c', "print('ML service available')")
    for path in seeds:
        compose('exec', '-T', '-e', 'RESTORE_COLLECTION=' + path.stem,
                'mongo', 'mongosh', '--quiet', 'lms_demo', '--eval', MONGO_RESTORE,
                payload=path.read_bytes())
    archive_bytes = io.BytesIO()
    with tarfile.open(fileobj=archive_bytes, mode='w') as archive:
        for path in files:
            archive.add(ML_ROOT / path, arcname=str(path), recursive=False)
    compose('exec', '-T', 'ml', 'python', '-c', ML_RESTORE, payload=archive_bytes.getvalue())
    compose('restart', 'ml')
    compose('up', '-d', '--wait')
    print('Restore complete. Sign out and sign in again at http://localhost:8080.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except (subprocess.CalledProcessError, OSError, ValueError, RuntimeError) as error:
        raise SystemExit(f'Restore stopped: {error}')
