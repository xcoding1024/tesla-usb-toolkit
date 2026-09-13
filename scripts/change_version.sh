#!/usr/bin/env bash
set -euo pipefail

# Update the visible app version x.y.z across npm, Tauri, and Cargo.

if [[ -z "${1:-}" ]]; then
  echo "Usage: $0 <x.y.z>" >&2
  exit 1
fi

version="$1"
if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be x.y.z, for example 1.2.3." >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

echo "Version: $version"

if [[ -f package.json ]]; then
  node - "$version" <<'NODE'
const fs = require("fs");
const [version] = process.argv.slice(2);
const path = "package.json";
const json = JSON.parse(fs.readFileSync(path, "utf8"));
json.version = version;
fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
NODE
fi

if [[ -f package-lock.json ]]; then
  node - "$version" <<'NODE'
const fs = require("fs");
const [version] = process.argv.slice(2);
const path = "package-lock.json";
const json = JSON.parse(fs.readFileSync(path, "utf8"));
json.version = version;
if (json.packages && json.packages[""]) {
  json.packages[""].version = version;
}
fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
NODE
fi

if [[ -f src-tauri/tauri.conf.json ]]; then
  node - "$version" <<'NODE'
const fs = require("fs");
const [version] = process.argv.slice(2);
const path = "src-tauri/tauri.conf.json";
const json = JSON.parse(fs.readFileSync(path, "utf8"));
json.version = version;
fs.writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
NODE
fi

if [[ -f src-tauri/Cargo.toml ]]; then
  if [[ "${OSTYPE:-}" == darwin* ]]; then
    sed -i '' -E "s/^version = \"[0-9]+\\.[0-9]+\\.[0-9]+\"/version = \"$version\"/" src-tauri/Cargo.toml
  else
    sed -i -E "s/^version = \"[0-9]+\\.[0-9]+\\.[0-9]+\"/version = \"$version\"/" src-tauri/Cargo.toml
  fi
fi

if [[ -f src-tauri/Cargo.lock ]]; then
  node - "$version" <<'NODE'
const fs = require("fs");
const [version] = process.argv.slice(2);
const path = "src-tauri/Cargo.lock";
let text = fs.readFileSync(path, "utf8");
text = text.replace(
  /(\[\[package\]\]\nname = "tesla-usb-detector"\nversion = ")[0-9]+\.[0-9]+\.[0-9]+(")/,
  `$1${version}$2`,
);
fs.writeFileSync(path, text);
NODE
fi

if [[ -f src/lib/update.ts ]]; then
  if [[ "${OSTYPE:-}" == darwin* ]]; then
    sed -i '' -E "s/__APP_VERSION__ : \"[0-9]+\\.[0-9]+\\.[0-9]+\"/__APP_VERSION__ : \"$version\"/" src/lib/update.ts
  else
    sed -i -E "s/__APP_VERSION__ : \"[0-9]+\\.[0-9]+\\.[0-9]+\"/__APP_VERSION__ : \"$version\"/" src/lib/update.ts
  fi
fi

if [[ -f README.md ]]; then
  if [[ "${OSTYPE:-}" == darwin* ]]; then
    sed -i '' -E "s/\\*\\*v[0-9]+\\.[0-9]+\\.[0-9]+\\*\\*/**v$version**/" README.md
  else
    sed -i -E "s/\\*\\*v[0-9]+\\.[0-9]+\\.[0-9]+\\*\\*/**v$version**/" README.md
  fi
fi

if [[ -f README.zh.md ]]; then
  if [[ "${OSTYPE:-}" == darwin* ]]; then
    sed -i '' -E "s/\\*\\*v[0-9]+\\.[0-9]+\\.[0-9]+\\*\\*/**v$version**/" README.zh.md
  else
    sed -i -E "s/\\*\\*v[0-9]+\\.[0-9]+\\.[0-9]+\\*\\*/**v$version**/" README.zh.md
  fi
fi

echo "Done."
