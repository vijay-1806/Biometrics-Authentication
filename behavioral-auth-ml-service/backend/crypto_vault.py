"""
Cryptographic Secret Vault for BioAuth BaaS
Handles AES-128/256-CBC/GCM or Fernet-authenticated encryption for API keys,
webhook signing secrets, and sensitive credentials.
Raw keys are encrypted at rest using a cluster master secret.
"""

import os
import hashlib
import secrets
from typing import Optional
from cryptography.fernet import Fernet

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)
MASTER_KEY_FILE = os.path.join(DATA_DIR, ".master_key")


def _get_or_create_master_key() -> bytes:
    """Retrieve or generate persistent cluster master encryption key."""
    if os.path.exists(MASTER_KEY_FILE):
        try:
            with open(MASTER_KEY_FILE, "rb") as f:
                key = f.read().strip()
                if len(key) == 44:  # standard base64 Fernet key length
                    return key
        except Exception:
            pass

    new_key = Fernet.generate_key()
    try:
        with open(MASTER_KEY_FILE, "wb") as f:
            f.write(new_key)
        # On POSIX set 0600 permissions
        try:
            os.chmod(MASTER_KEY_FILE, 0o600)
        except Exception:
            pass
    except Exception:
        pass
    return new_key


_cipher = Fernet(_get_or_create_master_key())


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a secret string into an authenticated ciphertext string."""
    if not plain_text:
        return ""
    encrypted = _cipher.encrypt(plain_text.encode("utf-8"))
    return encrypted.decode("ascii")


def decrypt_secret(cipher_text: str) -> Optional[str]:
    """Decrypt an authenticated ciphertext string back to plaintext."""
    if not cipher_text:
        return None
    try:
        decrypted = _cipher.decrypt(cipher_text.encode("ascii"))
        return decrypted.decode("utf-8")
    except Exception:
        return None


def hash_secret(plain_text: str) -> str:
    """Generate SHA-256 hash of a key for fast constant-time lookup."""
    return hashlib.sha256(plain_text.strip().encode("utf-8")).hexdigest()


def mask_key(key_str: str) -> str:
    """Mask key preserving environment prefix and last 4 characters."""
    if not key_str:
        return ""
    if len(key_str) <= 16:
        return key_str[:8] + "••••••••"
    return f"{key_str[:12]}••••••••••••••••{key_str[-4:]}"
