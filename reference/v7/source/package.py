"""Package this release, with a byte-level manifest. Run after build and checks."""
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
archive = ROOT.with_suffix('.zip')
files = sorted(p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name not in {'MANIFEST.sha256', 'failure.png'})
(ROOT / 'MANIFEST.sha256').write_text(''.join(f'{sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}\n' for p in files), encoding='utf-8')
files.append(ROOT / 'MANIFEST.sha256')
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    for p in files:
        z.write(p, arcname=f'{ROOT.name}/{p.relative_to(ROOT).as_posix()}')
with ZipFile(archive) as z:
    bad = z.testzip()
    if bad:
        raise RuntimeError(f'Archive validation failed: {bad}')
    assert f'{ROOT.name}/diagram-studio.html' in z.namelist()
print(f'[package] Verified {len(files)} files in {archive} ({archive.stat().st_size:,} bytes)')
print(f'[package] SHA256 {sha256(archive.read_bytes()).hexdigest()}')
