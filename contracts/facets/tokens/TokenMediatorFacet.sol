/*
 * Copyright (c) 2021 The Paypr Company, LLC
 *
 * This file is part of Gnossis Chain Contracts.
 *
 * Gnossis Chain Contracts is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Gnossis Chain Contracts is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Gnossis Chain Contracts.  If not, see <https://www.gnu.org/licenses/>.
 */

// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.4;

import '@paypr/ethereum-contracts/contracts/facets/context/ContextSupport.sol';
import '../mediator/MediatorImpl.sol';
import './ITokenMediator.sol';
import './TokenMediatorImpl.sol';

contract TokenMediatorFacet is ITokenMediator {
  function sendTokens(address token, uint256 amount) external {
    address sender = ContextSupport.msgSender();
    TokenMediatorImpl.sendTokens(token, sender, sender, amount);
  }

  function sendAndTransferTokens(
    address token,
    address recipient,
    uint256 amount
  ) external {
    address sender = ContextSupport.msgSender();
    TokenMediatorImpl.sendTokens(token, sender, recipient, amount);
  }

  function receiveTokens(
    address remoteToken,
    address token,
    address sender,
    address recipient,
    uint256 amount
  ) external {
    IAMB bridge = MediatorImpl.checkSenderAllowed();
    TokenMediatorImpl.receiveTokens(remoteToken, token, sender, recipient, amount, bridge.messageId());
  }
}
