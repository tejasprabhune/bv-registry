#!/usr/bin/env python3
"""Generate search index from bv-registry manifests. Writes JSON to stdout."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ImportError:
        print("error: Python 3.11+ required, or install tomli", file=sys.stderr)
        sys.exit(1)


def main():
    root = Path(__file__).parent.parent
    tools_dir = root / "tools"

    if not tools_dir.is_dir():
        print("error: tools/ directory not found", file=sys.stderr)
        sys.exit(1)

    tools_out = []

    for tool_dir in sorted(tools_dir.iterdir()):
        if not tool_dir.is_dir():
            continue

        tool_id = tool_dir.name
        versions = []

        for toml_file in sorted(tool_dir.glob("*.toml")):
            try:
                with open(toml_file, "rb") as f:
                    data = tomllib.load(f)
            except Exception as e:
                print(f"warning: skipping {toml_file}: {e}", file=sys.stderr)
                continue

            tool = data.get("tool", {})
            versions.append((tool.get("version", toml_file.stem), tool))

        if not versions:
            continue

        versions.sort(key=lambda x: x[0])
        version_strings = [v for v, _ in versions]

        _, latest = versions[-1]
        entry = {
            "id": tool_id,
            "version": latest.get("version", version_strings[-1]),
            "versions": version_strings,
            "description": latest.get("description"),
            "tier": latest.get("tier", "community"),
            "maintainers": latest.get("maintainers", []),
            "homepage": latest.get("homepage"),
            "license": latest.get("license"),
            "input_types": [i["type"] for i in latest.get("inputs", [])],
            "output_types": [o["type"] for o in latest.get("outputs", [])],
            "deprecated": latest.get("deprecated", False),
        }
        tools_out.append(entry)

    index = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "tools": tools_out,
    }

    print(json.dumps(index, indent=2))


if __name__ == "__main__":
    main()
