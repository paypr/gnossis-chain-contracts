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

import '../mediator/MediatorImpl.sol';
import './TokenMediatorImpl.sol';

contract TokenMediatorInit {
  struct TokenMediatorInitData {
    address bridge;
    uint256 requestGasLimit;
    address remoteMediator;
    bytes32 remoteChainId;
    MediatedTokenInfo[] tokens;
  }

  struct MediatedTokenInfo {
    address localToken;
    address remoteToken;
    bool mintAndBurn;
  }

  function initialize(TokenMediatorInitData calldata initData) external {
    MediatorImpl.setBridge(initData.bridge);

    TokenMediatorImpl.setRequestGasLimit(initData.requestGasLimit);

    if (initData.remoteMediator != address(0)) {
      TokenMediatorImpl.setRemoteMediator(initData.remoteMediator);
      MediatorImpl.addAllowedSender(initData.remoteMediator, initData.remoteChainId);
    }

    for (uint256 index = 0; index < initData.tokens.length; index++) {
      MediatedTokenInfo memory tokenInfo = initData.tokens[index];
      TokenMediatorImpl.setRemoteToken(tokenInfo.localToken, tokenInfo.remoteToken);
      TokenMediatorImpl.setShouldMintAndBurnToken(tokenInfo.localToken, tokenInfo.mintAndBurn);
    }
  }

  function setRequestGasLimit(uint256 requestGasLimit) external {
    TokenMediatorImpl.setRequestGasLimit(requestGasLimit);
  }

  function setRemoteMediator(address remoteMediator, bytes32 remoteChainId) external {
    TokenMediatorImpl.setRemoteMediator(remoteMediator);
    MediatorImpl.addAllowedSender(remoteMediator, remoteChainId);
  }

  function addMediatedToken(MediatedTokenInfo calldata tokenInfo) external {
    TokenMediatorImpl.setRemoteToken(tokenInfo.localToken, tokenInfo.remoteToken);
    TokenMediatorImpl.setShouldMintAndBurnToken(tokenInfo.localToken, tokenInfo.mintAndBurn);
  }
}
