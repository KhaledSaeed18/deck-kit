# Plan: The Key Is the Only Secret

Status: built. The speaker delegated every decision (`docs/decisions.md`, D1), so the flags below
were decided by Claude and are listed here for the speaker's review.

## Slides

| # | data-id | type | steps | full | short |
|---|---|---|---|---|---|
| 01 | title | title | 1 | 0:20 | 0:15 |
| 02 | hook | statement | 2 | 0:40 | 0:35 |
| 03 | field | diagram | 2 | 0:50 | |
| 04 | channel | diagram | 3 | 1:00 | 0:50 |
| 05 | kerckhoffs | statement | 1 | 0:45 | 0:40 |
| 06 | substitution | two-column | 1 | 0:50 | 0:40 |
| 07 | frequency | diagram | 4 | 1:20 | 1:10 |
| 08 | attacks | three-column | 4 | 0:50 | 0:40 |
| 09 | key-bits | comparison-table | 4 | 0:50 | 0:40 |
| 10 | moore | diagram | 2 | 0:45 | |
| 11 | clock | diagram | 3 | 1:00 | 0:50 |
| 12 | reduce | two-column | 2 | 0:45 | |
| 13 | caesar | diagram | 2 | 1:00 | 0:50 |
| 14 | affine | two-column | 1 | 1:00 | |
| 15 | lessons | takeaway | 3 | 0:40 | 0:35 |
| 16 | references | references | 0 | 0:20 | 0:15 |
| | | | | **12:55** | **8:00** |

## Flags (decided under D1)

| # | Question | Decision | Fact log |
|---|---|---|---|
| C1 | The book's key-length table predates real quantum computers | On screen as in the book; a 2026 update goes in the notes (AES-128 still approved, quantum threat is to RSA/ECC) | F-16, F-17 |
| C2 | Book: "$1M buys the attack in 45 minutes" | Notes say "about 43 minutes" (one month / 1024) | F-18 |
| C3 | "All cryptography until 1976 was symmetric" | Notes say "publicly", with GCHQ's secret earlier work as a Q&A answer | F-13, F-14 |
| C4 | Ciphertext letter ranks tie after third place | Never rank past the third letter | F-02 |
| C5 | The hook pays off later | The slide 02 ciphertext is decrypted on slide 07 | F-01 |
| S1 | Word cap | Exempt: hook, frequency, key-bits, clock and caesar (diagram letters), references | |
| S2 | Copy rule: "!" | Allowed directly after a digit, for factorials (26!); tuned in `src/engine/validate.ts` | |
| S3 | Title slide | The title appears encrypted (Caesar, shift 3) and decrypts on the first click | F-07 |
| S4 | Speaker name and course code | Not on the title slide; the speaker can add them in `01-title.html` | |

## Diagrams

- 03: cryptology tree (Fig. 1.3, redrawn)
- 04: Alice, Bob, Oscar, with the key on a separate secure channel (Figs. 1.4, 1.5, redrawn)
- 07: English letter frequencies against the hook ciphertext's
- 10: Moore's-law cost halving, 11 bars
- 11: a mod-9 dial, 8 + 4 landing on 3
- 13: a Caesar cipher wheel, shift 3
