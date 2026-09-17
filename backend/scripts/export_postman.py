#!/usr/bin/env python3
"""Export a Postman collection from the live OpenAPI schema.

**Generated, never hand-edited.** A collection maintained by hand drifts from
the API within a week, and the drift is invisible: a request that 404s looks
like a broken endpoint rather than a stale file. Regenerate instead:

    python scripts/export_openapi.py && python scripts/export_postman.py

**Not committed.** It is published as a CI artifact beside `openapi.json`, so
a copy in the repository can never be the stale one somebody imports.

Folders follow the surface prefixes (`candidate`, `employer`, `college`,
`admin`, and the rest), which is how the four client teams are split.

Two collection-level variables and nothing else to configure:

  * `{{baseUrl}}` -- defaults to the local API on :8099.
  * `{{token}}` -- a bearer token. Locally, mint one with
    `POST /api/v1/auth/dev/token` (`AUTH_ALLOW_LOCAL_TOKENS=true`); in a
    deployed environment it is a Cognito access token from the real sign-in.

Auth is set once on the collection and inherited, so a request that must be
anonymous (health, a gateway callback) is the exception and says so.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

#: Paths that must not carry a bearer token: they are called by somebody who
#: does not have one. A gateway signs its callback with an HMAC instead.
ANONYMOUS = ("/health", "/billing/callbacks/")

#: Example values by parameter name, so a collection is clickable rather than
#: full of `{id}`. Obvious placeholders -- nobody should mistake one for real.
EXAMPLES = {
    "min_score": "800",
    "limit": "20",
}


def _folder_for(path: str) -> str:
    """The surface a path belongs to: the first segment after the version."""
    parts = [p for p in path.split("/") if p and not p.startswith("{")]
    if len(parts) >= 3 and parts[0] == "api":
        return parts[2]
    return parts[0] if parts else "root"


def _request(method: str, path: str, operation: dict[str, Any]) -> dict[str, Any]:
    url_path = [p for p in path.split("/") if p]
    variables = [
        {"key": seg.strip("{}"), "value": f":{seg.strip('{}')}"}
        for seg in url_path
        if seg.startswith("{")
    ]
    query = [
        {
            "key": str(p.get("name")),
            "value": EXAMPLES.get(str(p.get("name")), ""),
            "disabled": not p.get("required", False),
        }
        for p in operation.get("parameters", [])
        if p.get("in") == "query"
    ]

    item: dict[str, Any] = {
        "name": operation.get("summary") or f"{method.upper()} {path}",
        "request": {
            "method": method.upper(),
            "header": [{"key": "Accept", "value": "application/json"}],
            "url": {
                "raw": "{{baseUrl}}" + path,
                "host": ["{{baseUrl}}"],
                "path": url_path,
                "query": query,
                "variable": variables,
            },
            "description": operation.get("description") or "",
        },
    }
    if any(path.startswith(prefix) or prefix in path for prefix in ANONYMOUS):
        item["request"]["auth"] = {"type": "noauth"}
    if operation.get("requestBody"):
        item["request"]["header"].append({"key": "Content-Type", "value": "application/json"})
        item["request"]["body"] = {"mode": "raw", "raw": "{}"}
    return item


def build(schema: dict[str, Any]) -> dict[str, Any]:
    folders: dict[str, list[dict[str, Any]]] = {}
    for path, methods in sorted(schema.get("paths", {}).items()):
        for method, operation in sorted(methods.items()):
            if method.lower() not in ("get", "post", "put", "patch", "delete"):
                continue
            folders.setdefault(_folder_for(path), []).append(_request(method, path, operation))

    info = schema.get("info", {})
    return {
        "info": {
            "name": f"{info.get('title', 'BharatPath')} {info.get('version', '')}".strip(),
            "description": (
                "Generated from openapi.json by scripts/export_postman.py. "
                "Do not edit by hand -- regenerate. Set {{baseUrl}} and {{token}} "
                "in the collection variables."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}"}]},
        "variable": [
            {"key": "baseUrl", "value": "http://localhost:8099"},
            {"key": "token", "value": ""},
        ],
        "item": [{"name": name, "item": items} for name, items in sorted(folders.items())],
    }


def main() -> int:
    schema_path = ROOT / "openapi.json"
    if not schema_path.exists():
        print("openapi.json is missing -- run scripts/export_openapi.py first.")
        return 1
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    collection = build(schema)
    out = ROOT / "bharatpath.postman_collection.json"
    out.write_text(json.dumps(collection, indent=2, sort_keys=False), encoding="utf-8")
    count = sum(len(folder["item"]) for folder in collection["item"])
    print(f"Wrote {out} - {count} request(s) in {len(collection['item'])} folder(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
