import re
import json

with open('sheet.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Pattern for GIDs and Names in bootstrap data
# It usually looks like [gid, "name", ...]
# Specifically: [0,"EC130 T2",0,0,null,0]
# Or in the bootstrap data: [654321, "Sheet Name", 0, 0, null, 0]

pattern = r'\[(\d+),\"([^\"]+)\",\d+,\d+,(?:null|\[)'
matches = re.findall(pattern, content)

found = {}
for gid, name in matches:
    if len(gid) < 12 and len(name) < 100 and not name.startswith('[') and not name.startswith('{'):
        found[gid] = name

# Also check for Serial numbers mentioned by user
for sn in ["2411", "18301", "21111"]:
    if sn not in found.values():
        print(f"Searching for Serial Number/Sheet Name: {sn}")
        # Look for the SN in the content near a GID
        sn_pattern = r'\[(\d+),\"' + re.escape(sn) + r'\"'
        sn_matches = re.findall(sn_pattern, content)
        for g in sn_matches:
            found[g] = sn

for gid, name in found.items():
    print(f"GID: {gid}, Name: {name}")
