# Fact log

Every number, date and claim that appears on screen or in the notes, with its source and
verification status. Slides cite entries by id in their notes ("Fact log F-07"). Checked
2026-10-14 by an adversarial opus subagent that recomputed every example in python.

| Id | Claim (as it appears) | Source (primary first) | Status |
|---|---|---|---|
| F-01 | Example 1.2 ciphertext decrypts to "WE WILL MEET IN THE MIDDLE OF THE LIBRARY AT NOON ALL ARRANGEMENTS ARE MADE"; the mapping is one-to-one | Paar & Pelzl, Ch. 1, Ex. 1.2–1.3 | verified |
| F-02 | In that ciphertext (61 letters) q appears 10 times, h 7, c 6, then r, b, w 5 each (tie); q stands for E | python count | verified; do not rank past 3rd |
| F-03 | Substitution key space 26! = 403,291,461,126,605,635,584,000,000, log2 = 88.38, "about 2^88" | Ch. 1 §1.2.2; python | verified |
| F-04 | English letter frequencies: E 12.70%, T 9.06%, A 8.17%, O 7.51%, I 6.97%, N 6.75% | Ch. 1, Table 1.1 | verified |
| F-05 | ABBA encrypts to kddk (A to k, B to d) | Ch. 1, Ex. 1.1 | verified |
| F-06 | Shift cipher: ATTACK with k = 17 gives RKKRTB; e(x) = x + k mod 26; 26 keys | Ch. 1, Def. 1.4.3, Ex. 1.11 | verified |
| F-07 | Caesar used a shift of 3 (D for A) | Suetonius, *Divus Julius* 56.6; the book says "allegedly" | verified |
| F-08 | Affine: y = a·x + b mod 26, gcd(a, 26) = 1, a in {1,3,5,7,9,11,15,17,19,21,23,25}, 312 keys; (9, 13) turns ATTACK into NCCNFZ; 9^-1 = 3 mod 26 | Ch. 1, Def. 1.4.4, Ex. 1.12 | verified |
| F-09 | 3^8 = 6561 ≡ 2 mod 7; 81 ≡ 4 mod 7, 4·4 = 16 ≡ 2 mod 7 | Ch. 1, Ex. 1.8 | verified |
| F-10 | 8 + 4 ≡ 3 mod 9; 42 = 4·9 + 6, so 42 ≡ 6 mod 9 | Ch. 1, Ex. 1.5–1.6 | verified |
| F-11 | gcd(15, 26) = 1 so 15 has an inverse (7) in Z26; gcd(14, 26) = 2 so 14 has none | Ch. 1, Ex. 1.10; python | verified |
| F-12 | Kerckhoffs' principle, Auguste Kerckhoffs, "La cryptographie militaire", Journal des sciences militaires, Jan and Feb 1883 | Ch. 1 §1.3.1; Petitcolas archive | verified |
| F-13 | Public-key cryptography published in 1976 (Diffie and Hellman, "New Directions in Cryptography"; Merkle's related work published 1978) | Ch. 1 §1.1; IEEE Trans. Inf. Theory 22(6), Nov 1976 | verified, qualifier |
| F-14 | GCHQ found public-key methods first in secret (Ellis 1970, Cocks 1973, Williamson 1974), declassified 1997 | Schneier, 1998 | verified; notes only |
| F-15 | DVD Content Scrambling System broken once reverse-engineered (DeCSS, 1999; 40-bit keys) | Ch. 1 §1.3.1; CACM May 2000 | verified, qualifier |
| F-16 | Key lengths: 56–64 bits short term (hours or days); 112–128 bits several decades without quantum computers; 256 bits several decades even with them | Ch. 1, Table 1.2 | verified (book) |
| F-17 | 2026: AES-128 still NIST-approved (SP 800-131A Rev. 3 draft raises the minimum to 128-bit strength after 2030); quantum computers exist but break neither AES nor RSA today; Grover at best halves effective key length in theory and parallelises badly (NIST's view); the real quantum threat is to RSA and ECC, hence ML-KEM and ML-DSA (FIPS 203/204, Aug 2024) | NIST SP 800-57 Pt 1 Rev 5; SP 800-131A Rev 3 ipd; NIST IR 8547 ipd | verified; drafts, notes only |
| F-18 | Moore's law as the book states it: doubling every 18 months at constant cost; 15 years = 10 doublings = 1024x; a $1M one-month attack costs about $1000 (exactly $976.56); or $1M does it in about 43 minutes | Ch. 1 §1.3.2; python | verified; book says "45 minutes", use "about 43" |
| F-19 | 80-bit symmetric key gives roughly the security of 1024-bit RSA | Ch. 1 §1.3.2 | verified (book) |
| F-20 | Cryptography dates back to about 2000 B.C. (unusual hieroglyphs in Egypt); the Spartan scytale | Ch. 1 §1.1; Kahn, *The Codebreakers* | verified, qualifier |
| F-21 | Implementation attacks: power consumption, electromagnetic radiation, timing; mostly against devices the attacker holds | Ch. 1 §1.3.1 | verified (book) |
| F-22 | AES was selected in an open NIST competition, 1997–2000 | NIST, AES development history; FIPS 197 (2001) | added in Phase 3, well established |
| F-23 | DES used a 56-bit key | FIPS 46 (1977) | added in Phase 3, well established |
| F-24 | The authors recommend Bauer, Kahn and Singh for the history of ciphers | Ch. 1 §1.5 | verified (book) |
| F-25 | Moore's 1975 revision: a doubling every two years; 18 months is the popular variant | G. Moore, IEDM 1975 | verified by the Phase 0 checker |
