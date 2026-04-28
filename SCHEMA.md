# bv-registry Manifest Schema

Manifests are TOML files under `tools/<id>/<version>.toml`. Each file describes one versioned tool.

## Top-level structure

```toml
[tool]
id = "blast"
version = "2.15.0"
description = "..."
homepage = "..."
license = "..."
tier = "community"          # core | community | experimental (default: community)
maintainers = ["github:alice", "github:bob"]   # optional
deprecated = false          # omit when false

[tool.image]
backend = "docker"
reference = "ncbi/blast:2.15.0"
digest = "sha256:..."   # optional; pinned at lock time

[tool.hardware]
cpu_cores = 4
ram_gb = 8.0
disk_gb = 2.0

[tool.hardware.gpu]   # optional
required = true
min_vram_gb = 8
cuda_version = "11.8"

[[tool.inputs]]
name = "query"
type = "fasta"
cardinality = "one"
description = "Query sequences in FASTA format"

[[tool.outputs]]
name = "output"
type = "blast_tab"
cardinality = "one"
description = "Tabular alignment results"

[tool.entrypoint]
command = "blastn"
args_template = "-query {query} -db {db} -out {output} -num_threads {cpu_cores}"
```

## `[[tool.inputs]]` / `[[tool.outputs]]`

Both sections are optional. Tools without them parse fine and are flagged as "untyped" in `bv show`.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Port identifier; must be unique within inputs/outputs |
| `type` | TypeRef | yes | Type from the bv-types vocabulary (e.g. `fasta`, `fasta[protein]`, `blast_db`) |
| `cardinality` | enum | no | `one` (default), `many`, or `optional` |
| `mount` | path | no | Absolute container path for this value |
| `description` | string | no | Human-readable description |
| `default` | string | no | Default value used when cardinality is `optional` |

## Type vocabulary

Types are defined in `bv-types/types.toml`. The hierarchy:

```
file
  tabular
    sam
    vcf
    blast_tab
    hmmer_output (future: may move to file)
    mmseqs_output (future: may move to tabular)
  fasta          [alphabet: protein | nucleotide | dna | rna]
  fastq
  bam
  bcf
  pdb
  mmcif
  msa            [format: stockholm | clustal | fasta]
  hmm_profile
dir
  blast_db
  mmseqs_db
```

Use `bv show <tool>` to see a tool's declared types, or `bv show <tool> --json` for machine-readable output.

## `cache_paths`

Container paths the tool writes to during normal execution and that need writable backing. Critical on apptainer (its SIF root is read-only); useful on docker too because it lets caches persist across `docker rm` invocations.

```toml
cache_paths = ["/cache/colabfold"]
```

bv binds each path to `~/.cache/bv/<tool>/<slug>` on the host by default. Users override the host side with `[[cache]]` entries in their project `bv.toml`. Skip this section for tools that don't write inside the image (e.g. blast).

## `[tool.smoke]` (optional)

Per-binary overrides for `bv conformance`'s smoke check. Most tools don't need this block at all: by default, `bv conformance` tries `--version`, `-version`, `--help`, `-h`, `-v`, and `version` against every binary in `[tool.binaries]` and accepts the first one that exits 0.

Add overrides only for unusual binaries:

```toml
[tool.smoke]
# Pin a specific probe for binaries that don't accept any of the defaults.
probes = { weird-tool = "--check", another = "" }   # "" means run with no args

# Skip binaries that have no non-destructive invocation (daemons, REPLs that
# wait for stdin forever, etc.). They still get shims; conformance just
# doesn't probe them.
skip = ["server-daemon"]
```

Conformance does not currently run tools on canonical inputs or verify typed outputs; that's a v2 feature that needs a hosted test-fixture pipeline.

## Tier and governance fields

| Field | Type | Default | Description |
|---|---|---|---|
| `tier` | enum | `community` | `core`, `community`, or `experimental`. See [GOVERNANCE.md](GOVERNANCE.md). |
| `maintainers` | list of strings | `[]` | GitHub handles, e.g. `"github:alice"`. |
| `deprecated` | bool | `false` | Set to `true` when a tool is superseded. |

New submissions land as `community`. Promotion to `core` requires a separate PR from a registry maintainer. See [GOVERNANCE.md](GOVERNANCE.md) for full criteria.

## Adding a new tool

1. Create `tools/<id>/<version>.toml` following the structure above.
2. All TypeRefs must exist in the bv-types vocabulary. Unknown types produce an error with a suggestion.
3. Commit and push; `bv add` fetches via `git pull`.
4. Use `bv publish` to automate steps 1-3 and open a PR.

## Example: BLAST

```toml
[tool]
id = "blast"
version = "2.15.0"
description = "BLAST+ Basic Local Alignment Search Tool"
homepage = "https://blast.ncbi.nlm.nih.gov/Blast.cgi"
license = "Public Domain"

[tool.image]
backend = "docker"
reference = "ncbi/blast:2.15.0"

[tool.hardware]
cpu_cores = 4
ram_gb = 8.0
disk_gb = 2.0

[[tool.inputs]]
name = "query"
type = "fasta"
cardinality = "one"
description = "Query sequences in FASTA format"

[[tool.inputs]]
name = "db"
type = "blast_db"
cardinality = "one"
description = "BLAST database directory"

[[tool.outputs]]
name = "output"
type = "blast_tab"
cardinality = "one"
description = "Tabular BLAST alignment results (outfmt 6)"

[tool.entrypoint]
command = "blastn"
args_template = "-query {query} -db {db} -out {output} -num_threads {cpu_cores}"
```
