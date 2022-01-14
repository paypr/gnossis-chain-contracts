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

import './MediatorImpl.sol';

contract MediatorInit {
  function setBridge(address bridge) external {
    MediatorImpl.setBridge(bridge);
  }

  function addAllowedSender(address sender, bytes32 chainId) external {
    MediatorImpl.addAllowedSender(sender, chainId);
  }

  function addAllowedChainSenders(bytes32 chainId, address[] calldata senders) external {
    for (uint256 index = 0; index < senders.length; index++) {
      address sender = senders[index];
      MediatorImpl.addAllowedSender(sender, chainId);
    }
  }

  function removeAllowedSender(address sender, bytes32 chainId) external {
    MediatorImpl.removeAllowedSender(sender, chainId);
  }

  function removeAllowedChainSenders(bytes32 chainId, address[] calldata senders) external {
    for (uint256 index = 0; index < senders.length; index++) {
      address sender = senders[index];
      MediatorImpl.removeAllowedSender(sender, chainId);
    }
  }
}
