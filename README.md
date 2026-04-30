# bv-registry

The default tool registry for [bv](https://github.com/tejasprabhune/bv).

## Structure

```
tools/
  <tool-id>/
    <version>.toml    # one file per version
```

Each `.toml` file is a `bv` manifest (see `bv-core::manifest::Manifest` for the schema).

## Adding a tool

1. Create `tools/<tool-id>/` if it doesn't exist.
2. Add `<version>.toml` using a semver version as the filename (e.g. `2.15.0.toml`).
3. The `tool.image.reference` field must be a pullable OCI reference.
4. Submit a PR.

## Versioning

Filename versions must be valid semver (`MAJOR.MINOR.PATCH`). Any build metadata
or distro suffixes belong inside the manifest's `tool.image.reference`, not the
filename.
