from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.domain.order_state_machine import (
    ensure_known_action,
    ensure_role_allowed,
    ensure_transition_allowed,
)


def test_known_action_validation() -> None:
    ensure_known_action('accept')

    with pytest.raises(HTTPException) as exc:
        ensure_known_action('not_real')

    assert exc.value.status_code == 400


def test_transition_validation() -> None:
    next_status = ensure_transition_allowed('accept', 'pending_acceptance')
    assert next_status == 'picking'

    with pytest.raises(HTTPException) as exc:
        ensure_transition_allowed('accept', 'matching')

    assert exc.value.status_code == 400


def test_role_validation() -> None:
    buyer = {'id': 'buyer_1', 'role': 'buyer'}
    supplier = {'id': 'supplier_1', 'role': 'supplier'}
    order = {'buyer_id': 'buyer_1', 'selected_supplier_id': 'supplier_1'}

    ensure_role_allowed('select_supplier', buyer, order)
    ensure_role_allowed('accept', supplier, order)

    with pytest.raises(HTTPException) as exc:
        ensure_role_allowed('courier_picked_up', supplier, order)

    assert exc.value.status_code == 403
