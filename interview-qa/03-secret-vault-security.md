# Secret Vault — Application Security, Secrets Management & Cryptography

> **Interview study file 03 — Secret Vault**
> Candidate: **Saiganesh** · Role: *Engineer / Senior Engineer FullStack — React + Python/FastAPI (Azure/AWS)* · Fractal Analytics (Fortune-500 client)
> Flashcard Q&A. **Bold question** + spoken-style answer. ⭐ = very likely to be asked.
> `[fill in: your real detail]` = substitute your actual project truth before the interview.
>
> **Project under discussion:** *Secret Vault* — a self-hosted secrets-management service (FastAPI + React + Postgres, Docker) that stores and retrieves secrets (API keys, DB creds, TLS certs) with encryption at rest, TLS in transit, RBAC, scoped short-lived tokens, and audit logging. Conceptually analogous to **HashiCorp Vault** and **Azure Key Vault**.
> Companion projects referenced where natural: **TARA Copilot** (on-prem RAG, LLaMA 3.1 8B/Ollama, SecureBERT, pgvector) and **VMS** (Vulnerability Management System, Django/FastAPI + React, NVD CVE sync, RBAC).

---

## Table of contents

1. [The 60-second project pitch](#0-the-60-second-pitch)
2. [What a secrets manager is & why](#1-what-a-secrets-manager-is--why)
3. [Encryption at rest](#2-encryption-at-rest)
4. [Encryption in transit (TLS / mTLS)](#3-encryption-in-transit)
5. [Hashing vs encryption vs encoding & password storage](#4-hashing-vs-encryption-vs-encoding)
6. [AuthN & AuthZ](#5-authn--authz)
7. [Audit logging](#6-audit-logging)
8. [Threats & mitigations (OWASP)](#7-threats--mitigations)
9. [Operational: rotation, revocation, break-glass](#8-operational)
10. [Azure mapping (Key Vault)](#9-azure-mapping)
11. [Likely follow-up gauntlet](#10-likely-follow-up-gauntlet)
12. [Rapid-fire cheat sheet](#rapid-fire-cheat-sheet)
13. [Traps & gotchas](#traps--gotchas)

---

## 0. The 60-second pitch

**⭐ "Tell me about Secret Vault in 60 seconds."**

> "Secret Vault is a self-hosted secrets-management service I built to stop teams from hardcoding credentials in code, `.env` files, and CI configs. Think a lightweight, self-hostable Azure Key Vault or HashiCorp Vault. The stack is FastAPI on the backend, React on the frontend, and Postgres for storage, all containerized with Docker.
>
> The core ideas are: secrets are **encrypted at rest** with AES-256-GCM using envelope encryption — each secret gets its own data encryption key, and those are wrapped by a master key. Everything is served over **TLS**. Access is gated by **RBAC** with **deny-by-default** policies, and clients get **scoped, short-lived tokens** rather than long-lived god-credentials. Every read, write, and delete is written to an **append-only audit log** — who touched which secret, when — and we never log the secret value itself.
>
> The whole point is the security trifecta: **central rotation, least privilege, and a tamper-evident audit trail** — none of which you get from a `.env` file checked into a repo."

*(If they want more, drift into envelope encryption or the token-leasing model — those are the most senior-sounding threads.)*

---

## 1. What a secrets manager is & why

**⭐ "What is a secrets manager and why would I use one instead of environment variables?"**

> "A secrets manager is a centralized, access-controlled service whose entire job is to store sensitive values — API keys, DB passwords, TLS private keys, tokens — encrypted, and hand them out only to authenticated, authorized callers, while logging every access.
>
> Environment variables and `.env` files *look* convenient but they fail on four axes:
> 1. **No central rotation** — if a DB password leaks, you're hunting through dozens of services and pipelines. With a vault you rotate in one place.
> 2. **No audit** — a `.env` file can't tell you *who read it or when*. A vault logs every access.
> 3. **No access control** — anyone who can read the file or the process environment (or a crash dump, or `/proc/<pid>/environ`) gets everything. A vault enforces least privilege per-secret.
> 4. **Sprawl & leakage** — `.env` files get committed to git, copied to laptops, pasted in Slack. A vault gives one source of truth.
>
> Env vars are fine for *non-secret config* — log level, feature flags, the vault's own address. They are a bad home for actual secrets."

**Follow-up — "But Kubernetes has Secrets. Isn't that enough?"**

> "Kubernetes Secrets are a step up from env files but they're **base64-encoded, not encrypted**, by default. At rest in etcd they're plaintext unless you explicitly enable encryption-at-rest with a KMS provider. They also have weak audit and no native rotation or leasing. They're really a *distribution* mechanism, not a secrets *manager*. A common production pattern is: a real vault holds the source of truth and a controller (like the External Secrets Operator or the CSI Secrets Store driver) syncs into k8s Secrets just-in-time. So Vault and k8s Secrets are complementary, not competitors."

**"Compare to the big managed offerings."**

| | **Secret Vault (mine)** | **Azure Key Vault** | **AWS Secrets Manager** | **HashiCorp Vault** |
|---|---|---|---|---|
| Hosting | Self-hosted (Docker) | Managed (Azure) | Managed (AWS) | Self/managed (HCP) |
| Encryption at rest | AES-256-GCM, envelope | FIPS 140-2 HSM-backed | KMS (AES-256) | Barrier + KMS seal |
| Auth | Scoped tokens / OAuth2 | Managed Identity / AAD | IAM roles | Auth methods (k8s, AppRole…) |
| Dynamic/leased secrets | `[fill in: do you lease?]` | Limited | Rotation Lambdas | **Strong** (DB, cloud creds) |
| Audit | Append-only Postgres log | Azure Monitor / diagnostics | CloudTrail | Audit devices |
| Rotation | Versioned + rotate API | Built-in (some) | Built-in schedules | Built-in / dynamic |

> "My Secret Vault is deliberately a *minimal, self-hostable* version of these. The conceptual lineage is HashiCorp Vault — barrier encryption, leased tokens, audit devices — adapted to a FastAPI/Postgres footprint that an on-prem client can run without a cloud dependency. That on-prem story matters because the same constraint drove TARA Copilot, which runs LLaMA locally precisely so no data leaves the client's network."

**Trade-off to volunteer:** "The honest cost of a vault is that you've created a **single, high-value target and a runtime dependency**. If the vault is down, services can't fetch secrets. You mitigate with HA, caching with short TTLs, and break-glass procedures — but you should name that trade-off, not pretend it doesn't exist."

---

## 2. Encryption at rest

**⭐ "How are secrets encrypted at rest in Secret Vault?"**

> "Each secret value is encrypted with **AES-256 in GCM mode** — that's AES with a 256-bit key in an **authenticated encryption** mode. GCM gives me confidentiality *and* integrity in one primitive: it produces a ciphertext plus an authentication tag, so if anyone tampers with a stored ciphertext, decryption fails loudly instead of returning garbage.
>
> I use **envelope encryption**: every secret is encrypted with its own **Data Encryption Key (DEK)**. The DEK is then encrypted ('wrapped') by a **Key Encryption Key (KEK)**, the master key. I store the ciphertext, the nonce, the auth tag, and the *wrapped* DEK in Postgres. The plaintext DEK and the KEK never sit on disk."

**⭐ "Walk me through AEAD / why GCM and not plain CBC."**

> "AEAD stands for Authenticated Encryption with Associated Data. The problem with a plain mode like AES-CBC is it only gives confidentiality — an attacker can flip ciphertext bits and you'd never know without a separate MAC, and historically pairing them wrong led to padding-oracle attacks. AEAD modes like **GCM** or **ChaCha20-Poly1305** bake the integrity check in: encryption emits a tag, decryption verifies it. The 'Associated Data' part lets me bind non-secret context — say the secret's ID or version — into the tag so a ciphertext can't be silently moved from one record to another. The one rule you must never break with GCM is **never reuse a nonce with the same key** — nonce reuse in GCM is catastrophic, it can leak the authentication key. So I generate a fresh random 96-bit nonce per encryption."

```python
# Encryption at rest with envelope encryption (cryptography lib, AES-256-GCM)
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_secret(plaintext: bytes, kek: bytes, secret_id: str) -> dict:
    """Envelope-encrypt one secret. Returns the row we persist in Postgres."""
    # 1. Fresh per-secret Data Encryption Key (DEK)
    dek = AESGCM.generate_key(bit_length=256)

    # 2. Encrypt the secret value with the DEK. 96-bit nonce, fresh every time.
    data_nonce = os.urandom(12)
    aad = secret_id.encode()  # bind the secret's identity into the tag
    ciphertext = AESGCM(dek).encrypt(data_nonce, plaintext, aad)
    # NOTE: cryptography appends the 16-byte GCM tag to `ciphertext`

    # 3. Wrap (encrypt) the DEK with the master KEK
    key_nonce = os.urandom(12)
    wrapped_dek = AESGCM(kek).encrypt(key_nonce, dek, None)

    # 4. Zeroize the plaintext DEK ASAP (best-effort in Python — see caveat later)
    dek = b"\x00" * len(dek)

    return {
        "secret_id": secret_id,
        "ciphertext": ciphertext,
        "data_nonce": data_nonce,
        "wrapped_dek": wrapped_dek,
        "key_nonce": key_nonce,
        "kek_version": 1,        # which master key wrapped this DEK
        "alg": "AES-256-GCM",
    }

def decrypt_secret(row: dict, kek: bytes) -> bytes:
    """Unwrap the DEK, then decrypt the value. Tag is verified automatically."""
    dek = AESGCM(kek).decrypt(row["key_nonce"], row["wrapped_dek"], None)
    plaintext = AESGCM(dek).decrypt(
        row["data_nonce"], row["ciphertext"], row["secret_id"].encode()
    )
    return plaintext
```

**⭐ "Why envelope encryption? Why not just encrypt every secret directly with the master key?"**

> "Three reasons:
> 1. **Key rotation becomes cheap.** To rotate the master key I only have to *re-wrap the DEKs* — decrypt each small DEK with the old KEK and re-encrypt it with the new one. I never have to touch or re-encrypt the actual secret payloads, which could be large or numerous. That's an O(number-of-secrets) operation on tiny 32-byte blobs instead of re-encrypting everything.
> 2. **Blast radius & cryptographic hygiene.** Using one key for millions of encryptions is bad practice — GCM has limits on how many messages you should encrypt under a single key. Per-secret DEKs keep each key's usage tiny.
> 3. **The master key can live somewhere special.** The KEK is the one thing that has to be protected at the highest level — a KMS or HSM. Because only DEKs are wrapped with it, the KMS only ever does small wrap/unwrap operations and the master key material never has to leave the KMS boundary."

**⭐ "Where does the master key live?"**

> "The honest answer for a self-hosted box is: the master key is the **root of trust**, so you push it as far from the application as you can. Options, best to worst:
> 1. **HSM** (Hardware Security Module) — the key is generated inside tamper-resistant hardware and *never leaves it*; you send wrap/unwrap requests in. Highest assurance.
> 2. **A KMS** — Azure Key Vault (HSM-backed) or AWS KMS. The app holds *no* key material; it calls KMS to unwrap DEKs. This is what I'd map to in Azure.
> 3. **Key derived at startup from a passphrase / unseal keys** — HashiCorp Vault's model: the master key is split with **Shamir's Secret Sharing** into N shares, you need K of them to 'unseal' the vault after a restart, and the unsealed key lives only in memory. No single operator can unseal alone.
> 4. **Environment/file** — only acceptable for dev. Never for prod.
>
> In my Secret Vault the current approach is `[fill in: e.g. 'KEK loaded from an env-injected value at boot, with a documented path to back it with Azure Key Vault / KMS in the client's environment']`. The senior point is: **you never store the KEK next to the ciphertext it protects.** If the database is dumped, the attacker gets wrapped DEKs they can't unwrap."

**"What about the chicken-and-egg — the vault itself needs a key to start?"**

> "Right, that's the **seal/unseal** problem. The vault can't store its own master key inside itself. Real options: an HSM/KMS the box trusts via hardware identity; auto-unseal where a cloud KMS holds the seal key and the instance authenticates via its **managed identity / instance role** (no stored secret); or manual unseal with Shamir shares held by separate humans. The principle: bootstrap trust from *hardware identity or split human trust*, not from a stored secret."

**"Key rotation without re-encrypting everything — say it concretely."**

> "Because of envelope encryption, master-key rotation is: generate KEKv2, then for each row, unwrap the DEK with KEKv1 and re-wrap with KEKv2, bumping `kek_version`. The secret ciphertexts are untouched. I keep KEKv1 around until every DEK is re-wrapped, then retire it. For rotating an *individual secret's value*, that's a different operation — I create a **new version** of the secret with a new DEK and mark the old version superseded; I keep old versions for a grace window so in-flight consumers don't break, then purge."

**Trade-off:** "Field-level vs. full-record encryption — I encrypt the secret *value* field specifically rather than relying solely on database transparent disk encryption (TDE). TDE protects against someone stealing the physical disk, but it's transparent to anyone with a DB connection — a SQL injection or a rogue DBA reads plaintext. Application-level field encryption means even a full DB dump yields only ciphertext + wrapped DEKs. You can do both; they defend different threats."

---

## 3. Encryption in transit

**⭐ "How do you protect secrets in transit?"**

> "Everything is served over **TLS** — TLS 1.2 minimum, ideally 1.3. That gives confidentiality, integrity, and server authentication on the wire, so secrets aren't readable by anything sniffing the network. I disable old protocol versions and weak cipher suites, and I'd serve HSTS on the React UI so browsers refuse to downgrade to plaintext HTTP."

**"TLS vs mTLS — when do you need mutual TLS?"**

> "Regular TLS authenticates the *server* to the client — the client checks the server's cert against a CA. **mTLS** (mutual TLS) adds the reverse: the *client* also presents a certificate the server validates. For a secrets vault, mTLS is great for **service-to-service** auth: a backend service proves its identity with a client cert issued by our internal CA, so the vault knows *which service* is calling before it even looks at the token. It's a strong identity layer that doesn't rely on a bearer secret that can be replayed if stolen. In Secret Vault I'd use mTLS for machine clients and OAuth2/token for human/UI clients. `[fill in: state whether you actually implemented mTLS or it's a design intent]`."

**"Certificate management — what's hard about it?"**

> "Certs expire — the classic outage is a forgotten renewal. So you need: a CA (internal PKI or something like ACME/Let's Encrypt for public-facing, or step-ca internally), automated issuance and renewal, short-lived certs so a leaked one self-expires, and rotation of the CA itself. Interestingly, **a vault is often the thing that issues and stores certs** — Vault has a PKI engine, and Azure Key Vault manages certificate lifecycle. So Secret Vault both *consumes* TLS and *could store* TLS certs as one of its secret types, which is part of the original brief — API keys, DB creds, **and TLS certificates**."

---

## 4. Hashing vs encryption vs encoding

**⭐ "Difference between hashing, encryption, and encoding?"**

> "These get conflated constantly, so I'm precise:
> - **Encoding** (Base64, URL-encoding, hex) is **not security at all** — it's a reversible format transformation with no key. Anyone can decode Base64. Its job is safe transport, not secrecy. Calling Base64 'encryption' is a red flag.
> - **Encryption** is **reversible *with a key*** — you can get the plaintext back if you hold the key. Use it when you need the original value later, which is exactly the case for stored secrets in the vault.
> - **Hashing** is a **one-way** function — you cannot recover the input from the digest. Use it when you only ever need to *verify*, not retrieve — passwords being the canonical case.
>
> So in Secret Vault: the actual secret *values* are **encrypted** (we must give them back), but user *login passwords* are **hashed** (we only check them)."

**⭐ "How do you store user passwords for the Vault's own login?"**

> "Never reversibly. I use a **slow, salted, memory-hard password hash** — **Argon2id** is my first choice today, **bcrypt** is the solid, widely-supported fallback. Key components:
> - **Salt** — a unique random value per password, stored alongside the hash. It defeats precomputed **rainbow tables** and ensures two users with the same password get different hashes. Modern libraries generate and embed the salt for you.
> - **Work factor / cost** — Argon2 and bcrypt are *deliberately slow* and tunable, so brute-forcing is expensive. You raise the cost as hardware improves.
> - **Argon2id memory-hardness** — it forces the attacker to use lots of memory too, which neutralizes cheap GPU/ASIC parallel cracking.
> - **Pepper** (optional, advanced) — a *secret* value applied in addition to the salt, but stored **separately** from the database (in the vault/HSM, not the user table). So a DB-only leak still can't be brute-forced offline. The salt is per-user and public; the pepper is global and secret. `[fill in: whether you used a pepper]`."

**⭐ "Why not just SHA-256?"**

> "Because SHA-256 is **fast** — and fast is exactly wrong for passwords. It's designed to hash gigabytes quickly, which means an attacker with a leaked hash can try *billions* of guesses per second on a GPU. Plain SHA-256 also has no built-in salt, so identical passwords collide and rainbow tables apply. Password hashing wants the *opposite* properties: slow, salted, and memory-hard. SHA-256 is great for *integrity* (file checksums, HMACs, the audit-log chain) — just not for passwords."

```python
# Password hashing with Argon2 (passlib), used for Vault's own user accounts
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=3,       # iterations
    argon2__memory_cost=65536, # 64 MB — memory-hardness
    argon2__parallelism=4,
)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)   # salt is generated & embedded automatically

def verify_password(plain: str, stored_hash: str) -> bool:
    return pwd_context.verify(plain, stored_hash)
    # constant-time comparison handled inside; resists timing attacks
```

**Trap to mention:** "Comparing secrets/hashes must be **constant-time** (`hmac.compare_digest` / library `.verify`), never `==`, to avoid timing side-channels. And you never log the password or the hash."

---

## 5. AuthN & AuthZ

**⭐ "Walk me through authentication and authorization in Secret Vault."**

> "I keep the two ideas separate:
> - **Authentication (AuthN)** = *who are you?* Clients authenticate and receive a token. Humans via the React UI go through OAuth2 / OIDC and get a **JWT**; machine clients use scoped API tokens, or mTLS client certs.
> - **Authorization (AuthZ)** = *what are you allowed to do?* Once I know who you are, **RBAC policies** decide which secrets and which operations (read/write/delete/rotate) you can perform — and the default is **deny**."

**⭐ "Tell me about your token model — scoped and short-lived."**

> "Two principles: **scope** and **lease/TTL**.
> - **Scoped**: a token is bound to a narrow set of permissions — e.g. 'read-only on `prod/payments/*`'. It is *not* a god-token. So even if it leaks, the blast radius is one path, read-only.
> - **Short-lived / leased**: tokens expire fast — minutes to hours, not forever. A leaked token is a leaked *window*, not a permanent breach. This is the HashiCorp Vault leasing idea: secrets and tokens have a TTL and can be *renewed* or *revoked*. The strongest form is **dynamic secrets** — the vault generates a brand-new DB credential on demand, leases it for, say, an hour, and automatically deletes it from the database when the lease ends. The app never holds a long-lived DB password at all. `[fill in: whether Secret Vault does dynamic secrets or only static secrets with short token TTLs]`."

```python
# FastAPI auth dependency: validate a scoped JWT, enforce deny-by-default
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt  # PyJWT

bearer = HTTPBearer()
JWT_ALG = "RS256"          # asymmetric: vault signs with private key, verifiers use public
PUBLIC_KEY = "[fill in]"   # loaded from config / JWKS

def get_principal(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    token = creds.credentials
    try:
        claims = jwt.decode(
            token, PUBLIC_KEY, algorithms=[JWT_ALG],
            options={"require": ["exp", "sub", "scope"]},
            audience="secret-vault",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token")
    return claims  # {sub, scope: ["read:prod/payments/*"], roles, exp, ...}

def require_scope(needed: str):
    """Authorization: deny by default, allow only if the scope is explicitly granted."""
    def checker(principal: dict = Depends(get_principal)):
        scopes = principal.get("scope", [])
        if not _scope_allows(scopes, needed):     # explicit allow-list match
            raise HTTPException(status.HTTP_403_FORBIDDEN, "insufficient scope")
        return principal
    return checker

@app.get("/secrets/{path:path}")
def read_secret(path: str, principal: dict = Depends(require_scope("read"))):
    # by the time we're here, AuthN + AuthZ have both passed
    ...
```

**⭐ "RBAC vs ABAC — what did you use and why?"**

> "**RBAC** (Role-Based Access Control) assigns permissions to *roles*, and users to roles — 'the payments-service role can read `prod/payments/*`'. It's simple, auditable, and the right default; it's what I used in Secret Vault and in VMS.
>
> **ABAC** (Attribute-Based Access Control) makes decisions on *attributes* — user department, resource tags, time of day, request IP, environment. It's more expressive — 'allow reads only from the prod subnet during business hours' — but it's more complex to reason about and audit.
>
> Rule of thumb: **start with RBAC; reach for ABAC when role explosion or context-sensitivity demands it.** A lot of real systems are a hybrid — roles for the coarse grant, attributes for the fine-grained constraints."

**⭐ "What does 'deny by default' mean and why does it matter?"**

> "It means the policy engine returns **deny unless an explicit allow rule matches**. The opposite — allow by default, deny specific things — is how you get **broken access control**, which is OWASP's #1 risk. With deny-by-default, forgetting to write a rule fails *closed* (safe) instead of *open* (a leak). Every new secret path is inaccessible until someone deliberately grants access. That's the whole posture of a vault."

**"JWT — stateless tokens. How do you revoke one before it expires?"**

> "That's the classic JWT weakness — a signed JWT is valid until `exp` no matter what, because verification is stateless. Mitigations: keep **TTLs short** so revocation is rarely needed; maintain a small **revocation/denylist** of token IDs (`jti`) checked on each request — which reintroduces a little state but only for revoked tokens; or rotate the signing key for a mass invalidation. In a vault specifically, I'd lean on short leases plus an explicit **revoke endpoint** that adds the `jti` to a denylist for the remainder of its lifetime."

**"OAuth2 in one breath?"**

> "OAuth2 is a **delegated authorization** framework — it lets a client get a scoped **access token** to act on a resource without handling the user's password. OIDC layers identity (the `id_token`) on top. For the Vault UI, the user authenticates with the identity provider, the Vault gets an access token with scopes, and uses it for API calls. The win is the Vault never sees or stores user passwords for SSO logins."

---

## 6. Audit logging

**⭐ "What does Secret Vault log, and what does it deliberately NOT log?"**

> "The audit log answers **who did what to which secret, when, and from where** — *without ever recording the secret value itself*. Each entry has: timestamp, principal (user/service ID), action (read/write/delete/rotate/login), the secret's **path/ID and version** (the *identifier*, never the plaintext), source IP, request ID, and the outcome (allowed/denied). Denied attempts matter as much as allowed ones — they're your early-warning of an attacker probing.
>
> What I **never** log: the secret value, the DEK, the password, the token, full request bodies that might contain any of those. Secret leakage *through logs and stack traces* is one of the most common real-world breaches, so the logging layer has to be secret-aware — redact known fields, and never dump exceptions with request payloads attached."

**⭐ "Make the audit log tamper-evident."**

> "Two properties: **append-only** and **tamper-evident**.
> - **Append-only**: the log table is write-once — no UPDATE or DELETE for application roles; ideally a separate, lower-privilege append-only sink so even a Vault compromise can't quietly rewrite history. Shipping to a WORM store or an external SIEM helps.
> - **Tamper-evidence**: I **hash-chain** the entries — each record includes a hash of the previous record plus its own contents, like a tiny blockchain / Merkle chain. If anyone alters or deletes a past entry, every subsequent hash breaks, so tampering is *detectable* even if you can't fully *prevent* it. You can periodically sign checkpoints. `[fill in: did you implement hash-chaining or is it append-only-only?]`"

```python
# Tamper-evident audit entry: each row chains to the previous via SHA-256
import hashlib, json

def make_audit_entry(prev_hash: str, event: dict) -> dict:
    body = {
        "ts": event["ts"], "principal": event["principal"],
        "action": event["action"], "secret_path": event["secret_path"],
        "version": event.get("version"), "src_ip": event["src_ip"],
        "outcome": event["outcome"], "request_id": event["request_id"],
        # NOTE: no secret value, token, or password anywhere in here
    }
    serialized = json.dumps(body, sort_keys=True, separators=(",", ":"))
    body["prev_hash"] = prev_hash
    body["entry_hash"] = hashlib.sha256(
        (prev_hash + serialized).encode()
    ).hexdigest()
    return body   # break any past row and every entry_hash after it stops matching
```

**Trade-off:** "Audit logging adds write latency and storage growth, and you must protect the log itself (it reveals access *patterns*). But for a security product it's non-negotiable — an unauditable vault is just an encrypted database with extra steps."

---

## 7. Threats & mitigations

**⭐ "Walk me through the threats to a secrets vault and how you mitigate them."** *(Use OWASP Top 10 as the spine — it signals you know the canon.)*

| Threat (OWASP) | In Secret Vault terms | Mitigation |
|---|---|---|
| **A01 Broken Access Control** | A token reads a secret it shouldn't | Deny-by-default RBAC, scoped tokens, per-request authz checks, never trust client-side checks |
| **A02 Cryptographic Failures** | Weak crypto, plaintext at rest, nonce reuse | AES-256-GCM, envelope encryption, TLS 1.2+, no homegrown crypto, fresh nonces |
| **A03 Injection (SQLi)** | Attacker injects SQL to dump the secret table | **Parameterized queries / ORM**, never string-concatenated SQL |
| **A04 Insecure Design** | Missing rotation/revocation by design | Threat-model up front; rotation, leasing, break-glass as first-class features |
| **A05 Security Misconfig** | Debug mode on, default creds, verbose errors in prod | Secure defaults, disable debug, generic error messages, locked-down CORS |
| **A07 Auth Failures** | Brute-force login, weak passwords | Argon2/bcrypt, rate limiting, lockout, MFA on admin |
| **A09 Logging Failures** | Secrets leak into logs; no audit trail | Redaction, secret-aware logging, append-only audit |
| **A10 SSRF** | Trick the Vault into calling an internal URL | Allow-list outbound targets, no user-supplied URLs to fetch |

**⭐ "Secret sprawl and secret leakage — explain and defend."**

> "**Secret sprawl** is the same secret copied into a dozen places — env files, CI variables, laptops, wikis, Terraform state. The fix is *centralization*: one source of truth in the vault, and everything else fetches at runtime. **Secret leakage** is a secret escaping into somewhere it shouldn't — logs, stack traces, error responses, git history, a crash dump. Mitigations: secret-aware redaction in logging, **never put secrets in error messages**, scan repos and CI with tools like `gitleaks`/`truffleHog`, and pre-commit hooks. The combination of central storage + short-lived tokens means even a leaked secret is *rotatable and time-bounded* rather than a permanent compromise."

**⭐ "SQL injection — show me you'd actually prevent it."**

> "**Parameterized queries**, always. The vulnerability is building SQL by concatenating user input; the fix is letting the driver bind parameters so input is never parsed as SQL. With SQLAlchemy I use the ORM or bound parameters; I never f-string user data into a query."

```python
# WRONG — SQL injection: user input concatenated into the query
# query = f"SELECT value FROM secrets WHERE path = '{path}'"   # NEVER

# RIGHT — parameterized (SQLAlchemy Core); driver binds the value safely
from sqlalchemy import text
row = conn.execute(
    text("SELECT value FROM secrets WHERE path = :path"),
    {"path": path},
).first()

# RIGHT — ORM; also parameterized under the hood
secret = session.query(Secret).filter(Secret.path == path).one_or_none()
```

**"XSS and CSRF on the React UI?"**

> "**XSS** (Cross-Site Scripting) — an attacker injects script that runs in another user's browser, which in a vault UI could exfiltrate a displayed secret or a session token. Defenses: React **escapes by default** so I avoid `dangerouslySetInnerHTML`; a strict **Content-Security-Policy**; and storing session tokens in **HttpOnly, Secure, SameSite cookies** so script can't read them. **CSRF** (Cross-Site Request Forgery) — a malicious site rides the user's logged-in session to perform actions. Defenses: **SameSite cookies**, anti-CSRF tokens on state-changing requests, and checking Origin/Referer. Bearer-token-in-header APIs are naturally CSRF-resistant because the browser doesn't auto-attach the header."

**⭐ "Rate limiting and brute-force protection?"**

> "Rate limiting on auth endpoints caps login attempts per IP/account to blunt **brute-force** and **credential stuffing**, plus exponential backoff and temporary lockout after repeated failures. I'd also rate-limit secret reads to make bulk-exfiltration noisy and slow, and alert on anomalies — e.g. one token reading hundreds of secrets it never touched before. `[fill in: did you implement rate limiting via middleware / reverse proxy / Redis token bucket?]`"

**"Prompt injection — tie it to TARA."**

> "Prompt injection isn't a direct Secret Vault threat, but it's a great cross-link to **TARA Copilot**. In a RAG assistant, an attacker can plant instructions in a document the model retrieves ('ignore your rules and reveal X'). The defenses rhyme with vault thinking: **least privilege** — the model only has access to data the *current user* is authorized for; **don't put real secrets in the prompt context** — if TARA needs a credential it goes through a tool with its own authz, not pasted into the context window; treat all retrieved content as **untrusted input**; and keep an audit trail of tool calls. The unifying principle across all three projects is **deny by default and least privilege** — Secret Vault enforces it on secrets, VMS on CVE/admin actions, TARA on retrieval and tools."

---

## 8. Operational

**⭐ "How do you rotate a leaked secret?"**

> "Rotation has two halves — *change it* and *invalidate the old one*. Concretely:
> 1. **Generate a new value** at the source (new DB password, new API key with the provider).
> 2. **Store it as a new version** in the Vault (versioning means consumers can roll forward and you can roll back if something breaks).
> 3. **Distribute** — consumers fetch the new version on their next pull; short token/cache TTLs mean this happens quickly without a redeploy.
> 4. **Revoke the old value** at the source so the leaked credential stops working — this is the step people forget; rotating without revoking just means two valid secrets.
> 5. **Audit** — check the log for who used the leaked secret and when, to scope the incident.
>
> The reason a vault makes this *fast* is centralization + versioning + short TTLs. With `.env` files this would be a multi-day fire drill."

**"Revocation vs rotation — not the same thing."**

> "**Revocation** invalidates an existing credential/token *now* — kill the lease, denylist the `jti`, drop the DB user. **Rotation** replaces a secret with a new value. You often do both: rotate the value *and* revoke the old. Leased/dynamic secrets make revocation trivial because the vault owns the credential's lifecycle and can just delete it."

**⭐ "What's break-glass access?"**

> "Break-glass is the *emergency* path for when normal auth is unavailable — the IdP is down, or you need root access during an incident. It's a tightly controlled, **heavily audited** super-credential that's normally sealed: stored offline / in an HSM, requires multiple people to invoke (split knowledge), triggers loud alerts the moment it's used, and is rotated immediately after. The whole design is 'rarely usable, always noisy.' You want it to exist so you're not locked out, but using it should set off every alarm in the building."

**"Secret versioning — why?"**

> "Each write creates a new immutable version with metadata. Benefits: **safe rotation** (consumers migrate gradually), **rollback** if a bad value breaks prod, and **audit** (you can see exactly which version was read when). I keep N recent versions and purge older ones per a retention policy — which ties into Azure Key Vault's soft-delete model."

**⭐ "Zeroizing memory — what and why?"**

> "After you decrypt a secret or DEK, the plaintext sits in process memory and could surface in a **core dump, swap file, or heap inspection**. Zeroizing means overwriting that buffer with zeros the instant you're done, so the window of exposure is minimal. The caveat I'd flag in Python specifically: **Python strings and bytes are immutable and the GC may copy them**, so you can't reliably wipe them — `bytearray` is better since it's mutable, and for serious zeroization you drop to a library (or a Rust/C extension) with locked, wipeable memory. So I'd say 'I zeroize best-effort with `bytearray`, keep plaintext lifetimes short, and acknowledge that true zeroization in CPython has limits.' That nuance reads as senior."

**⭐ "Secrets in Docker and CI — what's the right way?"**

> "The cardinal rule: **never bake secrets into an image.** Images are layered and shareable — a secret in any layer (even one later 'deleted') is recoverable from history, and anyone who pulls the image gets it. So:
> - **Build time**: use Docker **BuildKit secrets** (`--mount=type=secret`) so a secret is available during build but never persisted to a layer. Never `ARG`/`ENV` a secret.
> - **Run time**: inject secrets at *runtime* from the vault — the container starts, authenticates to the Vault via its workload identity, and fetches what it needs. Or mount via the CSI Secrets Store driver.
> - **CI**: use the CI's protected secret store (GitHub Actions secrets, Azure DevOps secret variables), mask them in logs, and scope them to the minimum jobs. Don't `echo` them.
> - **`.env` files** stay out of the image and out of git (`.dockerignore`, `.gitignore`)."

**"Kubernetes Secrets vs a real vault — settle it."**

> "k8s Secrets: base64 (not encrypted by default), namespace-scoped RBAC, no rotation, weak audit — fine as a *delivery mechanism* if you enable etcd encryption-at-rest with a KMS provider. A real vault: encrypted, leased/dynamic secrets, strong audit, central rotation, fine-grained policy. Best practice is **both** — vault is the source of truth, and a sync mechanism (External Secrets Operator or the Secrets Store CSI driver) projects them into pods just-in-time, so the secret lives in the pod's memory, not permanently in etcd."

---

## 9. Azure mapping

**⭐ "The JD names Azure Key Vault. Map your design onto it."**

> "Azure Key Vault is the managed version of exactly what I built, so the mapping is clean:
> - **Three object types**: **Keys** (cryptographic keys, can be HSM-backed for wrap/unwrap — my KEK), **Secrets** (arbitrary values like passwords/connection strings — my secret values), and **Certificates** (TLS certs with lifecycle management — my cert-storage feature).
> - **Encryption at rest**: Azure backs keys with FIPS 140-2 validated HSMs; my AES-256-GCM envelope scheme is the self-hosted analogue.
> - **Auth without a stored secret**: **Managed Identities**. An Azure app (App Service, AKS pod, Function) is assigned a managed identity, and it fetches secrets from Key Vault by authenticating with that identity — **no credential is ever stored in the app**. That directly solves the chicken-and-egg bootstrap problem: identity comes from the platform, not a secret you have to protect.
> - **Authorization**: Key Vault **access policies** or the newer **Azure RBAC** model — my RBAC maps straight onto this, deny-by-default.
> - **Safety nets**: **soft-delete** (a deleted secret is recoverable for a retention window) and **purge protection** (even an admin can't permanently delete before the window expires) — these defend against accidental or *malicious* deletion. That's the managed equivalent of my versioning + retention.
> - **Audit**: Key Vault logs to **Azure Monitor / Log Analytics** — my append-only audit log.
>
> So in an interview I'd say: 'I understand Key Vault deeply because I built a self-hosted version of it — same primitives: keys/secrets/certs, managed identity instead of stored creds, RBAC, soft-delete, audit.'"

**"AWS equivalents (since the role says Azure/AWS)?"**

> "**AWS Secrets Manager** ↔ secrets with built-in rotation; **AWS KMS** ↔ the key-management / envelope-encryption layer (KMS generates and guards the KEK, returns wrapped DEKs); **IAM roles / instance profiles / IRSA** ↔ the managed-identity equivalent so EC2/EKS workloads authenticate without stored creds; **CloudTrail** ↔ the audit log. The patterns are identical; only the product names change."

---

## 10. Likely follow-up gauntlet

**⭐ "How would you store the master key?"**
> "Outside the application, in an HSM or KMS so the key material never touches the app's disk or the secrets database. Failing that, derive it at boot via Shamir-split unseal keys held by separate operators, keep it only in memory, and never co-locate it with the ciphertext it protects. In Azure I'd back it with Key Vault HSM keys; the app would unwrap DEKs via Key Vault using its managed identity. `[fill in: your actual approach]`."

**⭐ "How do apps authenticate to the vault without a chicken-and-egg secret?"**
> "**Platform/workload identity**, not a stored secret. On Azure, a **managed identity** — the platform vouches for the app and it gets a token. On AWS, the **instance role / IRSA**. On-prem or in k8s, **mTLS client certs** issued by an internal CA, or HashiCorp's AppRole/Kubernetes auth where the pod proves its service-account identity. The trust is bootstrapped from *hardware or platform identity*, so there's no secret-zero you have to protect by hand."

**⭐ "Encryption at rest vs field-level encryption — when each?"**
> "Disk/transparent encryption (TDE) protects against *stolen disks* but is transparent to anyone with a DB connection — it won't stop SQLi or a rogue DBA. **Field-level encryption** encrypts the sensitive *value* in the application before it hits the DB, so a full DB dump yields only ciphertext. For a secrets vault I do field-level (the whole point), and you can layer TDE underneath as defense-in-depth. Field-level costs you queryability — you can't index or search an encrypted column normally — which is fine for secrets (you look them up by path, not by value)."

**⭐ "How do you prevent an admin from reading all secrets?"**
> "This is the 'who watches the watchmen' problem and it's a great senior question. Several layers:
> 1. **Separation of duties** — split the role: a *Vault administrator* can manage the system (users, policies, backups) but is **not** granted *read* on secret values. Managing the vault and reading secrets are different permissions.
> 2. **Encryption keeps admins out by design** — secrets are encrypted with keys the OS/DB admin doesn't hold; a DBA dumping Postgres gets ciphertext + wrapped DEKs, useless without the KEK in the HSM.
> 3. **Break-glass + dual control** — emergency read requires multiple people (split knowledge / quorum), so no single admin can unilaterally exfiltrate.
> 4. **Audit everything** — even if an admin *can* read in an emergency, every access is logged tamper-evidently and alerts fire. You make it *detectable* even where you can't make it *impossible*.
> 5. Azure's **purge protection** is the same philosophy for deletion — even an admin can't destroy evidence.
>
> The honest framing: you can't make it *cryptographically impossible* for someone who controls the KMS and the policy engine, so you defend with **separation of duties, least privilege, dual control, and unforgeable audit** — make abuse require collusion and guarantee it leaves a trail."

**"What if the whole Postgres DB is exfiltrated?"**
> "The attacker gets: encrypted secret values, wrapped DEKs, hashed passwords (Argon2id, salted), and the audit log. They get **no plaintext secrets** because the KEK lives in the HSM/KMS, not the DB. The passwords resist offline cracking due to the slow memory-hard hash (and a pepper if used). The main residual exposure is *metadata* — secret paths and access patterns — which is why even the audit log is access-controlled."

**"How do you handle a secret that's needed by 50 services and you must rotate it?"**
> "Versioned rotation with overlap: publish the new version, let services pick it up on their next short-TTL fetch (no coordinated redeploy), confirm via audit that traffic has moved to the new version, *then* revoke the old. For credentials the provider supports, **dual-credential rotation** — two valid keys briefly — gives zero-downtime cutover."

**"Why FastAPI for a security service?"**
> "Type hints + Pydantic give strong request **validation** at the edge, which kills a class of injection/parsing bugs; the dependency-injection system makes **auth a clean, reusable `Depends(...)`** I attach to every protected route (you saw that in the snippet); it's async for I/O-bound vault calls; and OpenAPI docs are generated automatically. The same stack underpins TARA and VMS, so I get consistency across all three."

---

## Rapid-fire cheat sheet

| Prompt | One-liner answer |
|---|---|
| Encryption at rest algo | **AES-256-GCM** (authenticated / AEAD) |
| Why GCM | Confidentiality **+** integrity in one; tamper = decrypt fails |
| GCM golden rule | **Never reuse a nonce** with the same key |
| Key hierarchy | **DEK** per secret, wrapped by **KEK** (master) = envelope encryption |
| Why envelope | Cheap rotation (re-wrap DEKs, not data); KEK can live in HSM/KMS |
| Master key home | **HSM / KMS**, never beside the ciphertext |
| Seal/unseal | Shamir split unseal keys *or* auto-unseal via KMS/managed identity |
| In transit | **TLS 1.2+**; **mTLS** for service-to-service identity |
| Encoding | Base64 = reversible, **not security** |
| Encryption | Reversible **with a key** (use for secret values) |
| Hashing | **One-way** (use for passwords) |
| Password hash | **Argon2id** (or bcrypt) — slow, salted, memory-hard |
| Salt vs pepper | Salt = per-user, public, in DB; pepper = global, secret, **not** in DB |
| Not SHA-256 for pw | Too **fast** → billions of guesses/sec; no salt |
| AuthN vs AuthZ | Who you are vs what you may do |
| Tokens | **Scoped + short-lived/leased**; dynamic secrets best |
| RBAC vs ABAC | Roles (simple, default) vs attributes (flexible, complex) |
| Authz posture | **Deny by default** (fail closed) |
| JWT revocation | Short TTL + `jti` denylist + key rotation |
| SQLi defense | **Parameterized queries / ORM**, never string-concat |
| XSS defense | React escaping, CSP, HttpOnly+Secure+SameSite cookies |
| CSRF defense | SameSite cookies, anti-CSRF tokens, bearer-in-header |
| Audit log | Who/what/which-secret/when/where; **never the value**; append-only + hash-chain |
| Rotate leaked secret | New value → new version → distribute → **revoke old** → audit |
| Break-glass | Sealed emergency cred, dual control, loud alerts, rotate after |
| Zeroize | Overwrite plaintext buffers ASAP (`bytearray`); CPython is best-effort |
| Secrets in Docker | **Never bake into image**; BuildKit secrets at build, vault fetch at runtime |
| k8s Secrets | Base64, not encrypted by default; use vault + ESO/CSI sync |
| Azure mapping | Key Vault: keys/secrets/certs, **managed identity**, RBAC, soft-delete/purge protection |
| Admin can't read all | Separation of duties + encryption + dual control + audit |
| OWASP #1 | **Broken Access Control** → deny-by-default RBAC |

---

## Traps & gotchas

> Things interviewers fish for. Don't fall in.

- **"Is Base64 encryption?"** — No. It's encoding, fully reversible, zero security. Saying yes is an instant red flag.
- **GCM nonce reuse** — If asked "what's the one thing you must never do with AES-GCM?", the answer is **reuse a nonce under the same key**. It breaks both confidentiality and the auth tag. Fresh random 96-bit nonce every time.
- **"Just hash the secret"** — Secrets must be **retrievable**, so they're **encrypted**, not hashed. Hashing is for passwords (verify-only). Don't mix these up under pressure.
- **SHA-256 for passwords** — Wrong: too fast, unsalted. Argon2id/bcrypt. SHA-256 *is* right for the **audit hash-chain** and HMACs — know the difference.
- **"Encrypt with the master key directly"** — Misses envelope encryption. Always mention DEK/KEK and that it makes rotation cheap.
- **Storing the master key in the DB / env / image** — The KEK must never live next to the ciphertext or in an image layer. HSM/KMS/managed identity.
- **Chicken-and-egg secret-zero** — If you propose "store a bootstrap secret in the container," you've reintroduced the problem. The answer is **platform/workload identity** (managed identity, IAM role, mTLS), not a stored secret.
- **JWT "just expires"** — Be ready for "how do you revoke early?" Short TTL + `jti` denylist. Don't claim stateless JWTs are instantly revocable; they aren't.
- **Allow-by-default authz** — That's broken access control. Always **deny by default**.
- **Logging secrets** — Verbose error handlers and stack traces that dump request bodies leak secrets. Redact; generic error messages in prod; never log the value.
- **String-concatenated SQL** — Even in a "quick" example. Always parameterize, or you've demoed an injection.
- **k8s Secrets = secure** — Base64 ≠ encrypted. Mention etcd encryption-at-rest and vault-sync.
- **Zeroizing in Python** — Don't overclaim. CPython can't reliably wipe immutable `str`/`bytes`; say "best-effort with `bytearray`, short lifetimes, real wiping needs native code." That honesty reads as senior.
- **TDE solves everything** — No: transparent to any DB connection. SQLi/rogue DBA still win. You need **field-level** encryption for the values.
- **Forgetting to revoke after rotation** — Rotating without revoking the old credential = two live secrets. Always pair rotate **and** revoke.
- **"Admins are trusted"** — The good answer is separation of duties + dual control + audit; never just "we trust admins."
- **Inventing crypto** — Never claim a novel/custom cipher. Use standard, vetted primitives (AES-GCM, Argon2, TLS) via the `cryptography`/`passlib` libraries. "Don't roll your own crypto" is itself a senior signal.
- **Confusing AuthN and AuthZ** — Keep them crisp: 401 = unauthenticated, 403 = unauthorized.

---

*End of file 03 — Secret Vault. Substitute every `[fill in: …]` with your real implementation detail before the interview, and keep the crypto claims exactly as standard as written here.*
