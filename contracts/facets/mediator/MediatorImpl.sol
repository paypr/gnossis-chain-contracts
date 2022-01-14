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

import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/Strings.sol';
import '@paypr/ethereum-contracts/contracts/facets/context/ContextSupport.sol';
import './IAMB.sol';

library MediatorImpl {
  using EnumerableSet for EnumerableSet.AddressSet;

  bytes32 internal constant ETH_CALL_REQUEST_SELECTOR =
    0x88b6c755140efe88bff94bfafa4a7fdffe226d27d92bd45385bb0cfa90986650;

  bytes32 private constant MEDIATOR_STORAGE_POSITION = keccak256('paypr.gnossisChain.mediator.storage');

  struct RemoteCallResponse {
    bool status;
    bytes result;
  }

  struct MediatorStorage {
    address bridgeAddress;
    mapping(bytes32 => EnumerableSet.AddressSet) allowedSenders;
    mapping(bytes32 => bytes32) informationRequestTypes;
    mapping(bytes32 => RemoteCallResponse) remoteCallResponses;
  }

  //noinspection NoReturn
  function _mediatorStorage() private pure returns (MediatorStorage storage ds) {
    bytes32 position = MEDIATOR_STORAGE_POSITION;
    // solhint-disable-next-line no-inline-assembly
    assembly {
      ds.slot := position
    }
  }

  function checkSenderAllowed() internal view returns (IAMB) {
    IAMB _bridge = checkBridge();
    checkSenderAllowed(_bridge.messageSender(), _bridge.messageSourceChainId());
    return _bridge;
  }

  function checkBridge() internal view returns (IAMB) {
    address _bridgeAddress = ContextSupport.msgSender();
    require(
      _bridgeAddress == bridgeAddress(),
      string(abi.encodePacked('Mediator: bridge not allowed: ', Strings.toHexString(uint160(_bridgeAddress))))
    );

    return IAMB(_bridgeAddress);
  }

  function bridge() internal view returns (IAMB) {
    return IAMB(bridgeAddress());
  }

  function bridgeAddress() internal view returns (address) {
    return _mediatorStorage().bridgeAddress;
  }

  function setBridge(address _bridgeAddress) internal {
    require(_bridgeAddress != address(0), 'Mediator: bridge cannot be the zero address');
    _mediatorStorage().bridgeAddress = _bridgeAddress;
  }

  function checkSenderAllowed(address sender, bytes32 chainId) internal view {
    require(
      isSenderAllowed(sender, chainId),
      string(
        abi.encodePacked(
          'Mediator: sender ',
          Strings.toHexString(uint160(sender)),
          ' not allowed for chain ',
          Strings.toHexString(uint256(chainId))
        )
      )
    );
  }

  function isSenderAllowed(address sender, bytes32 chainId) internal view returns (bool) {
    return allowedSendersForChain(chainId).contains(sender);
  }

  function allowedSendersForChain(bytes32 chainId) internal view returns (EnumerableSet.AddressSet storage) {
    return _mediatorStorage().allowedSenders[chainId];
  }

  function addAllowedSender(address sender, bytes32 chainId) internal {
    allowedSendersForChain(chainId).add(sender);
  }

  function removeAllowedSender(address sender, bytes32 chainId) internal {
    allowedSendersForChain(chainId).remove(sender);
  }

  function sendRemoteTx(
    address _contract,
    bytes memory data,
    uint256 gas
  ) internal returns (bytes32) {
    require(_contract != address(0), 'Mediator: contract cannot be the zero address');
    return bridge().requireToPassMessage(_contract, data, gas);
  }

  function callRemote(address _contract, bytes memory callData) internal returns (bytes32) {
    require(_contract != address(0), 'Mediator: contract cannot be the zero address');
    require(callData.length > 0, 'Mediator: call data cannot be empty');
    bytes32 messageId = bridge().requireToGetInformation(ETH_CALL_REQUEST_SELECTOR, abi.encode(_contract, callData));
    _mediatorStorage().informationRequestTypes[messageId] = ETH_CALL_REQUEST_SELECTOR;
    return messageId;
  }

  function remoteCallResponse(bytes32 messageId) internal view returns (bool, bytes storage) {
    require(messageId != bytes32(0), 'Mediator: messageId cannot be zero');
    _checkMessageInformationRequestType(messageId, ETH_CALL_REQUEST_SELECTOR, 'eth_call');
    RemoteCallResponse storage response = _mediatorStorage().remoteCallResponses[messageId];
    return (response.status, response.result);
  }

  function setRemoteCallResponse(
    bytes32 messageId,
    bool status,
    bytes calldata result
  ) internal {
    require(messageId != bytes32(0), 'Mediator: messageId cannot be zero');
    _checkMessageInformationRequestType(messageId, ETH_CALL_REQUEST_SELECTOR, 'eth_call');
    _mediatorStorage().remoteCallResponses[messageId] = RemoteCallResponse(status, result);
  }

  function _checkMessageInformationRequestType(
    bytes32 messageId,
    bytes32 expectedTypeId,
    string memory expectedTypeName
  ) private view {
    require(
      messageInformationRequestType(messageId) == expectedTypeId,
      string(
        abi.encodePacked(
          'Mediator: messageId ',
          Strings.toHexString(uint256(messageId)),
          ' was not ',
          expectedTypeName,
          ': ',
          Strings.toHexString(uint256(messageInformationRequestType(messageId)))
        )
      )
    );
  }

  function isMessageInformationRequestType(bytes32 messageId, bytes32 requestTypeId) internal view returns (bool) {
    return messageInformationRequestType(messageId) == requestTypeId;
  }

  function messageInformationRequestType(bytes32 messageId) internal view returns (bytes32) {
    return _mediatorStorage().informationRequestTypes[messageId];
  }
}
