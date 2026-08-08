"""Unit tests for app/services/booking_code.py — pure generation logic, no DB."""

import re

from app.services.booking_code import BOOKING_CODE_ALPHABET, generate_booking_code

_FORMAT_RE = re.compile(r"^ERP-[A-Z2-9]{4}-[A-Z2-9]{4}$")
_AMBIGUOUS_CHARS = "O0I1"
_SAMPLE_SIZE = 5000


def _code_to_int(code: str) -> int:
    _, group_a, group_b = code.split("-")
    value = 0
    for char in group_a + group_b:
        value = value * len(BOOKING_CODE_ALPHABET) + BOOKING_CODE_ALPHABET.index(char)
    return value


def test_format_matches_expected_pattern():
    code = generate_booking_code()
    assert _FORMAT_RE.match(code), code
    assert len(code) == 13


def test_format_holds_across_many_samples():
    for _ in range(_SAMPLE_SIZE):
        code = generate_booking_code()
        assert _FORMAT_RE.match(code), code


def test_alphabet_excludes_ambiguous_characters():
    for char in _AMBIGUOUS_CHARS:
        assert char not in BOOKING_CODE_ALPHABET
    assert len(BOOKING_CODE_ALPHABET) == 32
    assert len(set(BOOKING_CODE_ALPHABET)) == 32  # no duplicate symbols


def test_generated_codes_never_contain_ambiguous_characters():
    for _ in range(_SAMPLE_SIZE):
        code = generate_booking_code()
        for char in _AMBIGUOUS_CHARS:
            assert char not in code, code


def test_codes_are_not_sequential():
    codes = [generate_booking_code() for _ in range(200)]
    values = [_code_to_int(c) for c in codes]

    # A sequential/incrementing generator (e.g. a counter) produces the same
    # delta between every consecutive pair. secrets.choice-based generation
    # won't — this fails deterministically for a counter and passes for real
    # randomness.
    deltas = {b - a for a, b in zip(values, values[1:])}
    assert len(deltas) > 1

    # No two consecutively generated codes should be identical either.
    assert len(set(codes)) == len(codes)
