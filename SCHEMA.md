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

# Optional: factored OCI image built by bv-builder.
# When present, clients that support factored images pull at layer granularity.
# Older clients fall back to [tool.image] transparently.
[tool.factored]
spec_path = "specs/blast/2.15.0.yaml"        # bv-builder spec used to build this
image_reference = "ghcr.io/tejasprabhune/bv-pkg/blast:2.15.0"
image_digest = "sha256:..."                   # locked at build time
repodata_snapshot_digest = "sha256:..."       # OCI referrer artifact digest

[[tool.factored.layers]]
digest = "sha256:..."
size = 10485760
media_type = "application/vnd.oci.image.layer.v1.tar+zstd"
[tool.factored.layers.conda_package]
name = "openssl"
version = "3.2.1"
build = "h0d4d230_0"
channel = "conda-forge"
sha256 = "abcdef1234..."

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

## `[tool.entrypoint]` and `[tool.subcommands]`

Every manifest must declare at least one of these two sections (or both).

### `[tool.entrypoint]` — single-shape tools

Use for tools with one canonical invocation (BLAST, samtools, bcftools). The `command` is what runs as argv[0]; the optional `args_template` interpolates `{port_name}` from typed I/O and `{cpu_cores}`.

```toml
[tool.entrypoint]
command = "blastn"
args_template = "-query {query} -db {db} -out {output} -num_threads {cpu_cores}"

[tool.entrypoint.env]   # optional
MALLOC_ARENA_MAX = "4"
```

`bv run <tool>` (no args) runs the entrypoint as-is. `bv run <tool> ...args` appends user args.

### `[tool.subcommands]` — multi-script tools

Use for tools that bundle several scripts (typical for ML repos: genie2 has `train.py` + `sample_unconditional.py` + `sample_scaffold.py`; AlphaFold has `run_alphafold.py` + `run_alphafold_msa.py`; etc.).

Each entry maps a name to the literal argv prefix:

```toml
[tool.subcommands]
train                = ["python", "genie/train.py"]
sample_unconditional = ["python", "genie/sample_unconditional.py"]
sample_scaffold      = ["python", "genie/sample_scaffold.py"]
```

Invocation:

```sh
bv run genie2 train --devices 1 --num_nodes 1 --config runs/example/configuration
bv run genie2 sample_unconditional --name base --epoch 40 --scale 0.6 --outdir outputs
```

Everything after the subcommand name is passed to the script verbatim. There is no `args_template` for subcommands — each script has its own argparse.

Subcommand names stay namespaced under the tool id. They do **not** appear in `bv list --binaries`, do not become PATH shims, and cannot collide across tools (two tools may both expose a `train` subcommand without conflict).

If a manifest declares only subcommands (no entrypoint), `bv run <tool>` with no args prints the available subcommand list. If it declares both, the entrypoint runs as the default and subcommands are still selectable by name.

## `[tool.binaries]` (optional)

Real PATH-installed executables that the image exposes. Used for tools where the binary names are conventional and unambiguous (`blastn`, `blastp`, `samtools`, `bcftools`).

```toml
[tool.binaries]
exposed = ["blastn", "blastp", "tblastn", "tblastx", "makeblastdb"]
```

These names get a global shim and entries in the project's binary index, so `bv run blastn -query x.fa` and `blastn -query x.fa` (after `bv shim`) both work. **Do not** use `[tool.binaries]` for generic names like `train` — those belong in `[tool.subcommands]` to avoid cross-tool collision.

If `[tool.binaries]` is omitted, the entrypoint command's basename is the only exposed binary. Multi-script tools with no entrypoint expose no binaries at all.

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
