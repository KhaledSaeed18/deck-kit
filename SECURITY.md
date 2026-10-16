# Security policy

## Supported versions

Security fixes target the current code on the default branch (`main`). Older releases and
copies made from this template do not have separate maintenance branches. Update your copy
to incorporate upstream fixes; a fix here does not automatically update forks, generated
repositories, or previously exported decks.

## Report a vulnerability privately

Email [contact@khaledsaeed.tech](mailto:contact@khaledsaeed.tech) with the subject
`[deck-kit security]` and a short description. Do not open a public issue or pull request
with vulnerability details, exploit code, or sensitive data.

Include what you can:

- Affected version or commit and files or components involved.
- Steps to reproduce and a minimal proof of concept using non-sensitive sample content.
- Expected impact and any conditions needed to exploit the issue.
- Browser, operating system, Node.js, and pnpm versions, where relevant.
- Suggested mitigations or a fix, if available.

Reports about the presentation runtime, presenter communication, slide processing, build
tooling, exports, and dependencies used by the kit are welcome. If you are unsure whether
something is a security issue, use the private email address. Ordinary bugs and feature
requests belong in the public issue tracker.

The maintainer will review the report, request additional information if needed, and coordinate
a fix and disclosure with you. Response and resolution times depend on availability; there is
no guaranteed service level. If you have not received a response, follow up on the same email
thread. Please allow time for assessment and a fix before public disclosure.

## Security considerations for speakers

- Speaker notes are included in distributed HTML builds. Presenter mode hides them from the
  audience view, but is not an access control boundary. Do not distribute confidential notes.
- The kit is designed to run without runtime network requests. A locally served or offline
  deck still contains executable code; use trusted source files and dependencies.
- Template copies have their own maintainers. Report issues specific to a modified copy to
  that repository's maintainer; report problems reproducible in upstream deck-kit here.

If you reuse this template for another project, replace the reporting address and support
policy with your own before publishing it.
