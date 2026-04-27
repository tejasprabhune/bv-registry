# bv-registry Governance

## Tier definitions

Every tool in the registry carries a `tier` field that signals its quality and maintenance status.

### `core`

- Typed I/O is complete and correct.
- Conformance tests pass.
- Image is from a recognized publisher (NCBI, EBI, BioContainers, a well-known research lab or institution).
- At least one listed maintainer has responded to an issue or PR within the past 30 days.
- `bv add` installs core tools without any warning or flag.

### `community`

- Typed I/O is present (may be partial).
- Basic manifest validation passes.
- Image pulls and runs correctly.
- `bv add` installs community tools without any flag.

### `experimental`

- Basic manifest validation passes.
- May lack typed I/O, may come from an unverified source, or may not have been tested end-to-end.
- `bv add` refuses to install experimental tools without `--allow-experimental`.
- Hidden from default search results (`bv search` requires `--tier all` or `--tier experimental`).

New submissions via `bv publish` land as `community` by default. Promotion is always a separate PR by a registry maintainer.

## Registry maintainers

Registry maintainers are responsible for:
- Reviewing PRs that promote tools to `core`.
- Verifying typed I/O correctness.
- Enforcing the deprecation policy.
- Responding to security disclosures.

Current maintainers are listed in the [CODEOWNERS](CODEOWNERS) file.

## Becoming a maintainer

Open an issue on this repository expressing interest. Existing maintainers vote with a simple majority. Requirements: at least two merged PRs to this repository, responsiveness on past reviews, and agreement to the security disclosure policy.

## Promotion to `core`

Anyone can open a PR to promote a tool from `community` to `core` by changing `tier = "community"` to `tier = "core"`. The PR must include evidence that:

1. Typed I/O is complete (all inputs and outputs declared with correct types).
2. The image reference points to a recognized publisher.
3. The tool runs correctly with `bv run`.
4. At least one maintainer (listed in `maintainers = [...]`) is reachable.

A maintainer reviews and merges the promotion PR. Demotion follows the same process in reverse.

## Deprecation policy

- Set `deprecated = true` in the manifest and open a PR with a comment explaining why.
- Deprecated tools remain in the registry permanently; old lockfiles continue to work.
- Deprecated tools are hidden from default search but still installable.
- A deprecated tool can be un-deprecated by reverting `deprecated = true`.

## Security disclosure

Report security issues in registry tools (e.g. a malicious image or compromised maintainer account) via GitHub Security Advisories on this repository. Do not open a public issue for security concerns.

For vulnerabilities in the `bv` CLI itself, report to the `bv` repository.

Maintainers aim to acknowledge disclosures within 48 hours and resolve or publish a mitigation within 14 days.
