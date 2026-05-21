from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def mock_resend():
    with patch("resend.Emails.send", return_value={"id": "test-id"}):
        yield
