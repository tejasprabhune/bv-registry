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

## Adding a new tool

1. Create `tools/<id>/<version>.toml` following the structure above.
2. All TypeRefs must exist in the bv-types vocabulary. Unknown types produce an error with a suggestion.
3. Commit and push; `bv add` fetches via `git pull`.

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
