# Brief: The Key Is the Only Secret

> The single source of truth for this deck's content. Lines marked _(drafted)_ were written by
> Claude, not given by the speaker; the speaker delegated every content and design decision
> (see `docs/decisions.md`, D1).

## The talk

- **Title:** The Key Is the Only Secret _(drafted)_
- **Subtitle:** Chapter 1, Introduction to Cryptography and Data Security
- **Speaker(s):** not shown on the title slide _(drafted; add a name in `01-title.html` if wanted)_
- **Event / course, date:** university cryptography course, Fall 2026 _(course code unknown)_
- **Audience:** classmates in the same course, technical, meeting cryptography for the first time
- **Length:** about 12 min main talk; 8 min short version, about 16 slides
- **Goal:** the room leaves knowing the vocabulary of the field, why a big key space is not enough,
  why the algorithm must be public, and how modular arithmetic describes the classic ciphers
- **Language and spelling:** English, British spelling (as in the earlier deck)

## Narrative

> A cipher is only as strong as the attacks it survives. A huge key space did not save the
> substitution cipher, keeping the design secret never works, and only the key may be secret.
> Modular arithmetic, the clock maths behind Caesar's shift, is the same tool modern public-key
> cryptography runs on.

## Sources

- **Authoritative:** C. Paar, J. Pelzl, *Understanding Cryptography*, Springer 2010, Chapter 1
  (the speaker's copy; not included in this repo).
- Supporting: Kerckhoffs, "La cryptographie militaire", 1883; Suetonius, *Life of Julius Caesar*
  56; NIST SP 800-57 Part 1 Rev. 5 and NIST IR 8547 for the 2026 note on key lengths.

## Slide plan

**01 — The Key Is the Only Secret** · `title` · 0:20
On screen: the title as Caesar ciphertext that builds into plaintext; chapter and book.
Notes: framing; the title itself is encrypted with Caesar's shift of 3.

**02 — Can you read this?** · `statement` · 0:40
On screen: Example 1.2 ciphertext; "26! keys, about 2^88. Secure?"
Notes: promise the answer on the frequency slide.

**03 — The field at a glance** · `diagram` · 0:50
On screen: Fig. 1.3 redrawn: cryptology splits into cryptography (symmetric, asymmetric,
protocols) and cryptanalysis.
Notes: cryptanalysis is the only way to know a cipher is secure; hybrid schemes; 1976.

**04 — Alice, Bob and Oscar** · `diagram` · 0:60
On screen: x, e, y, d over an insecure channel; Oscar listening; the key over a secure channel.
Notes: plaintext, ciphertext, key, key space; confidentiality only here.

**05 — Kerckhoffs' principle** · `statement` · 0:45
On screen: secure even if the attacker knows everything except the key (1883).
Notes: security by obscurity; DVD CSS.

**06 — The substitution cipher** · `two-column` · 0:50
On screen: ABBA becomes kddk; the key is the whole table; 26! keys.
Notes: brute force definition; 26! about 2^88; decades of search.

**07 — Letters give it away** · `diagram` · 1:20
On screen: English letter frequencies next to the ciphertext's; q is most common; the plaintext.
Notes: frequency, pairs (QU), short words; lesson: hide statistics; key space alone is not enough.

**08 — Attackers take the easy way in** · `three-column` · 0:50
On screen: classical cryptanalysis, implementation attacks, social engineering.
Notes: weakest link; side channels; phone call for passwords.

**09 — How many key bits are enough?** · `comparison-table` · 0:50
On screen: 56–64 bits short term; 112–128 decades; 256 even with quantum computers.
Notes: only if brute force is the best attack; 80-bit symmetric about 1024-bit RSA; 2026 update.

**10 — Moore's law is compound interest** · `diagram` · 0:45
On screen: a one-month $1M attack becomes about $1000 after 15 years.
Notes: 10 doublings, 1024x; 45 minutes for $1M.

**11 — Arithmetic on a clock** · `diagram` · 1:00
On screen: a dial of Z9; 8 + 4 lands on 3; 42 = 4·9 + 6.
Notes: definition of a ≡ r mod m; equivalence classes.

**12 — Reduce early** · `two-column` · 0:45
On screen: 3^8 mod 7 the long way (6561) and the short way (81·81 becomes 4·4).
Notes: why public-key computations stay small.

**13 — Caesar's shift** · `diagram` · 1:00
On screen: a cipher wheel shifted by 3; e(x) = x + k mod 26; only 26 keys.
Notes: ATTACK with k = 17 becomes RKKRTB; brute force in seconds by hand.

**14 — The affine cipher** · `two-column` · 1:00
On screen: y = a·x + b mod 26; gcd(a, 26) = 1; 12 · 26 = 312 keys; still broken.
Notes: inverses exist iff gcd = 1; ATTACK with (9, 13) becomes NCCNFZ.

**15 — Lessons learned** · `takeaway` · 0:40
On screen: never roll your own; big keys are not enough; only the key is secret.

**16 — References & questions** · `references` · 0:20

## Profiles and cut list

- **full:** all 16 slides, 12:55
- **short:** drop 03, 10, 12 and 14; 8:00
- Backup slides: none

## Design direction

- Mood: a cryptanalyst's working notebook. Graph paper, a red margin rule, fountain-pen navy
  ink, red pencil marks where the code breaks, typewriter ciphertext. Humane and hand-made, not
  a tech template. Not neo-brutalist, not the starter look.
- Colours: warm paper, deep navy ink, red pencil, a muted highlighter; light projector.
- Fonts: a characterful serif for headings (Fraunces), a mono for ciphertext (IBM Plex Mono),
  a handwriting face used sparingly for annotations (Caveat). All bundled through Fontsource.
