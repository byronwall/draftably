"""Extract and verify the attached immutable source packet beside this evaluation bundle."""
import argparse,hashlib,json,pathlib,zipfile
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--destination',type=pathlib.Path,default=root.parent/'baseline');args=p.parse_args()
archive=root/'baseline-packet/source-packet.zip'
expected='34c38648ff539731e53f719e8865faee6ae62ce1b1a92567fb069c8b1caa5dff'
assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected,'Source packet hash mismatch'
manifest=json.loads((root/'data/baseline-manifest.json').read_text())
destination=args.destination.resolve()
if destination.exists() and any(destination.iterdir()):
    missing=[n for n,h in manifest.items()if not(destination/n).is_file()or hashlib.sha256((destination/n).read_bytes()).hexdigest()!=h]
    if missing:raise SystemExit('Destination contains a different source tree; choose an empty destination. First mismatch: '+missing[0])
else:
    destination.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive)as z:
        for entry in z.infolist():
            target=(destination/entry.filename).resolve()
            if not target.is_relative_to(destination):raise SystemExit('Unsafe archive path')
        z.extractall(destination)
    bad=[n for n,h in manifest.items()if not(destination/n).is_file()or hashlib.sha256((destination/n).read_bytes()).hexdigest()!=h]
    if bad:raise SystemExit('Extracted source mismatch: '+bad[0])
print(json.dumps({'baseline':'f14d9b891adba75de6cc172b190017ea5a5ca091','path':str(destination),'verifiedOriginalFiles':len(manifest)}))
