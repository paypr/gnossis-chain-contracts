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

interface ITokenMediator {
  /**
   * @notice Sends a token to the other chain
   */
  function sendTokens(address token, uint256 amount) external;

  /**
   * @notice Sends a token to the other chain with a particular recipient
   */
  function sendAndTransferTokens(
    address token,
    address recipient,
    uint256 amount
  ) external;

  /**
   * @notice Receives a token from the other chain with a particular recipient
   */
  function receiveTokens(
    address remoteToken,
    address token,
    address sender,
    address recipient,
    uint256 amount
  ) external;

  /**
   * @notice Emitted when `value` tokens are sent to a `remoteToken` on another chain.
   *
   * Note that `value` may be zero.
   */
  event SendTokens(
    address token,
    address remoteToken,
    address indexed from,
    address indexed to,
    uint256 value,
    bytes32 messageId
  );

  /**
   * @notice Emitted when `value` tokens are received from a `remoteToken` on another chain.
   *
   * Note that `value` may be zero.
   */
  event ReceiveTokens(
    address remoteToken,
    address token,
    address indexed from,
    address indexed to,
    uint256 value,
    bytes32 messageId
  );
}
