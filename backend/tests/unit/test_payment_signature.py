"""Unit tests for verify_webhook_signature.

The function is pure computation (HMAC-SHA256 + replay-window check).
No DB, no HTTP client, no mocks needed.

Contract: returns None on success, raises InvalidWebhookSignature on any failure.
"""

import hashlib
import hmac
import time

import pytest

from app.exceptions import InvalidWebhookSignature
from app.services.payment import verify_webhook_signature

# Must match MERCADOPAGO_WEBHOOK_SECRET set in pyproject.toml [tool.pytest.ini_options].
_SECRET = "fake-webhook-secret"


def _make_signature(
    data_id: str,
    ts: int,
    *,
    secret: str = _SECRET,
    x_request_id: str | None = None,
) -> str:
    """Build a well-formed x-signature header value using the same algorithm as production."""
    manifest_parts = [f"id:{data_id.lower()}"]
    if x_request_id:
        manifest_parts.append(f"request-id:{x_request_id}")
    manifest_parts.append(f"ts:{ts}")
    manifest = ";".join(manifest_parts) + ";"
    digest = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return f"ts={ts},v1={digest}"


# ---------------------------------------------------------------------------
# Happy paths
# ---------------------------------------------------------------------------

def test_valid_signature_without_request_id():
    ts = int(time.time())
    sig = _make_signature("12345", ts)
    verify_webhook_signature("12345", sig, None)  # must not raise


def test_valid_signature_with_request_id():
    ts = int(time.time())
    sig = _make_signature("12345", ts, x_request_id="req-abc-001")
    verify_webhook_signature("12345", sig, "req-abc-001")


def test_data_id_is_lowercased_before_signing():
    # The implementation lowercases data_id before building the manifest.
    # A caller passing an uppercase data_id must still verify correctly.
    ts = int(time.time())
    sig = _make_signature("abcdef", ts)  # signed with lowercase
    verify_webhook_signature("ABCDEF", sig, None)  # passed as uppercase → must pass


def test_x_request_id_none_omitted_from_manifest():
    # When x_request_id is None the manifest must NOT contain "request-id:None".
    # This test verifies that a signature built without the field is accepted
    # when x_request_id=None is passed.
    ts = int(time.time())
    sig = _make_signature("99999", ts, x_request_id=None)
    verify_webhook_signature("99999", sig, None)


# ---------------------------------------------------------------------------
# Missing / empty signature
# ---------------------------------------------------------------------------

def test_empty_signature_raises():
    with pytest.raises(InvalidWebhookSignature, match="Missing x-signature"):
        verify_webhook_signature("123", "", None)


def test_whitespace_signature_raises():
    # A string of spaces is falsy for `not x_signature` after strip — but the
    # implementation checks `if not x_signature` directly (no strip). Either
    # way, a whitespace-only header cannot produce a valid ts/v1 pair.
    with pytest.raises(InvalidWebhookSignature):
        verify_webhook_signature("123", "   ", None)


# ---------------------------------------------------------------------------
# Malformed header format
# ---------------------------------------------------------------------------

def test_malformed_missing_v1_raises():
    ts = int(time.time())
    with pytest.raises(InvalidWebhookSignature, match="Malformed"):
        verify_webhook_signature("123", f"ts={ts}", None)


def test_malformed_missing_ts_raises():
    with pytest.raises(InvalidWebhookSignature, match="Malformed"):
        verify_webhook_signature("123", "v1=deadbeef", None)


def test_non_integer_ts_raises():
    with pytest.raises(InvalidWebhookSignature, match="Non-integer"):
        verify_webhook_signature("123", "ts=notanumber,v1=deadbeef", None)


# ---------------------------------------------------------------------------
# Replay protection
# ---------------------------------------------------------------------------

def test_stale_timestamp_raises():
    # 200 s in the past — beyond the 120 s past window.
    ts = int(time.time()) - 200
    sig = _make_signature("123", ts)
    with pytest.raises(InvalidWebhookSignature, match="replay protection"):
        verify_webhook_signature("123", sig, None)


def test_future_timestamp_raises():
    # 700 s in the future — beyond the 600 s future window.
    ts = int(time.time()) + 700
    sig = _make_signature("123", ts)
    with pytest.raises(InvalidWebhookSignature, match="replay protection"):
        verify_webhook_signature("123", sig, None)


def test_timestamp_at_past_boundary_is_accepted():
    # 119 s in the past — just inside the 120 s window.
    ts = int(time.time()) - 119
    sig = _make_signature("123", ts)
    verify_webhook_signature("123", sig, None)  # must not raise


# ---------------------------------------------------------------------------
# Signature mismatch
# ---------------------------------------------------------------------------

def test_wrong_secret_raises():
    ts = int(time.time())
    sig = _make_signature("123", ts, secret="wrong-secret")
    with pytest.raises(InvalidWebhookSignature, match="mismatch"):
        verify_webhook_signature("123", sig, None)


def test_wrong_data_id_raises():
    # Signature built for "correct-id" must not validate against "tampered-id".
    ts = int(time.time())
    sig = _make_signature("correct-id", ts)
    with pytest.raises(InvalidWebhookSignature, match="mismatch"):
        verify_webhook_signature("tampered-id", sig, None)


def test_request_id_mismatch_raises():
    # Signature built with a request_id must not validate when a different one
    # (or no request_id) is passed.
    ts = int(time.time())
    sig = _make_signature("123", ts, x_request_id="req-aaa")
    with pytest.raises(InvalidWebhookSignature, match="mismatch"):
        verify_webhook_signature("123", sig, "req-bbb")


def test_request_id_present_vs_absent_raises():
    # Signature built without request_id must not validate when one is passed.
    ts = int(time.time())
    sig = _make_signature("123", ts, x_request_id=None)
    with pytest.raises(InvalidWebhookSignature, match="mismatch"):
        verify_webhook_signature("123", sig, "req-unexpected")
