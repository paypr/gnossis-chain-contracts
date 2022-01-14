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

import '@paypr/ethereum-contracts/contracts/facets/consumable/IConsumable.sol';
import '@paypr/ethereum-contracts/contracts/facets/consumable/IConsumableMint.sol';
import './ITokenMediator.sol';
import '../mediator/MediatorImpl.sol';

library TokenMediatorImpl {
  bytes32 private constant TOKEN_MEDIATOR_STORAGE_POSITION = keccak256('paypr.gnossisChain.tokenMediator.storage');

  struct TokenMediatorStorage {
    uint256 requestGasLimit;
    address remoteMediator;
    mapping(address => address) remoteTokens;
    mapping(address => bool) mintAndBurnTokens;
  }

  //noinspection NoReturn
  function _tokenMediatorStorage() private pure returns (TokenMediatorStorage storage ds) {
    bytes32 position = TOKEN_MEDIATOR_STORAGE_POSITION;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := position
    }
  }

  function requestGasLimit() internal view returns (uint256) {
    return _tokenMediatorStorage().requestGasLimit;
  }

  function setRequestGasLimit(uint256 _requestGasLimit) internal {
    _tokenMediatorStorage().requestGasLimit = _requestGasLimit;
  }

  function remoteMediator() internal view returns (address) {
    return _tokenMediatorStorage().remoteMediator;
  }

  function setRemoteMediator(address mediator) internal {
    require(mediator != address(0), 'TokenMediator: mediator cannot be the zero address');
    _tokenMediatorStorage().remoteMediator = mediator;
  }

  function requireRemoteToken(address token) internal view returns (address) {
    address _remoteToken = remoteToken(token);
    require(
      _remoteToken != address(0),
      string(abi.encodePacked('TokenMediator: token not found: ', Strings.toHexString(uint160(token))))
    );
    return _remoteToken;
  }

  function remoteToken(address token) internal view returns (address) {
    return _tokenMediatorStorage().remoteTokens[token];
  }

  function setRemoteToken(address token, address _remoteToken) internal {
    require(token != address(0), 'TokenMediator: token cannot be the zero address');
    require(_remoteToken != address(0), 'TokenMediator: remoteToken cannot be the zero address');
    _tokenMediatorStorage().remoteTokens[token] = _remoteToken;
  }

  function shouldMintAndBurnToken(address token) internal view returns (bool) {
    return _tokenMediatorStorage().mintAndBurnTokens[token];
  }

  function setShouldMintAndBurnToken(address token, bool mintAndBurn) internal {
    _tokenMediatorStorage().mintAndBurnTokens[token] = mintAndBurn;
  }

  function sendTokens(
    address token,
    address sender,
    address recipient,
    uint256 amount
  ) internal {
    address _remoteToken = requireRemoteToken(token);

    address mediator = remoteMediator();

    IConsumable consumable = IConsumable(token);

    require(consumable.transferFrom(sender, address(this), amount), 'TokenMediator: transferFrom failed');

    bytes memory callData = abi.encodeWithSelector(
      ITokenMediator.receiveTokens.selector,
      token,
      _remoteToken,
      sender,
      recipient,
      amount
    );
    bytes32 messageId = MediatorImpl.sendRemoteTx(mediator, callData, requestGasLimit());

    if (shouldMintAndBurnToken(token)) {
      IConsumableMint consumableMint = IConsumableMint(token);
      consumableMint.burn(address(this), amount);
    }

    emit SendTokens(token, _remoteToken, sender, recipient, amount, messageId);
  }

  function receiveTokens(
    address _remoteToken,
    address token,
    address sender,
    address recipient,
    uint256 amount,
    bytes32 messageId
  ) internal {
    IConsumable consumable = IConsumable(token);

    if (shouldMintAndBurnToken(token)) {
      IConsumableMint consumableMint = IConsumableMint(token);
      consumableMint.mint(recipient, amount);
    } else {
      require(consumable.transfer(recipient, amount), 'TokenMediator: transfer failed');
    }

    emit ReceiveTokens(_remoteToken, token, sender, recipient, amount, messageId);
  }

  // have to redeclare here even though they are already declared in ITokenMediator
  event SendTokens(
    address token,
    address remoteToken,
    address indexed from,
    address indexed to,
    uint256 value,
    bytes32 messageId
  );
  event ReceiveTokens(
    address remoteToken,
    address token,
    address indexed from,
    address indexed to,
    uint256 value,
    bytes32 messageId
  );
}
