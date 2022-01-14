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

import '@openzeppelin/contracts/utils/Counters.sol';
import '../IAMB.sol';
import '../MediatorImpl.sol';
import '../IAMBInformationReceiver.sol';

contract TestAMB is IAMB {
  using Counters for Counters.Counter;

  Counters.Counter private _messageIdCounter;

  address private _messageSender;
  uint256 private _maxGasPerTx;
  bytes32 private _transactionHash;
  bytes32 private _messageId;
  bytes32 private _messageSourceChainId;

  struct MessageCallData {
    bool messageCallStatus;
    bytes32 failedMessageDataHash;
    address failedMessageReceiver;
    address failedMessageSender;
  }

  mapping(bytes32 => MessageCallData) private _messageCallData;

  uint256 private _sourceChainId;
  uint256 private _destinationChainId;

  struct GetInformationRequest {
    bytes32 messageId;
    address requester;
    bytes32 sourceChainId;
    bool success;
    bytes result;
  }

  struct PassMessageRequest {
    bytes32 messageId;
    address sender;
    bytes32 sourceChainId;
    address _contract;
    bytes data;
    uint256 gas;
  }

  function messageSender() external view returns (address) {
    return _messageSender;
  }

  function setMessageSender(address __messageSender) external {
    _messageSender = __messageSender;
  }

  function maxGasPerTx() external view returns (uint256) {
    return _maxGasPerTx;
  }

  function setMaxGasPerTx(uint256 __maxGasPerTx) external {
    _maxGasPerTx = __maxGasPerTx;
  }

  function transactionHash() external view returns (bytes32) {
    return _transactionHash;
  }

  function setTransactionHash(bytes32 __transactionHash) external {
    _transactionHash = __transactionHash;
  }

  function messageId() external view returns (bytes32) {
    return _messageId;
  }

  function setMessageId(bytes32 __messageId) external {
    _messageId = __messageId;
  }

  function messageSourceChainId() external view returns (bytes32) {
    return _messageSourceChainId;
  }

  function setMessageSourceChainId(bytes32 __messageSourceChainId) external {
    _messageSourceChainId = __messageSourceChainId;
  }

  function messageCallStatus(bytes32 __messageId) external view returns (bool) {
    return _messageCallData[__messageId].messageCallStatus;
  }

  function failedMessageDataHash(bytes32 __messageId) external view returns (bytes32) {
    return _messageCallData[__messageId].failedMessageDataHash;
  }

  function failedMessageReceiver(bytes32 __messageId) external view returns (address) {
    return _messageCallData[__messageId].failedMessageReceiver;
  }

  function failedMessageSender(bytes32 __messageId) external view returns (address) {
    return _messageCallData[__messageId].failedMessageSender;
  }

  function setMessageCallData(bytes32 __messageId, MessageCallData calldata messageCallData) external {
    _messageCallData[__messageId] = messageCallData;
  }

  function requireToPassMessage(
    address _contract,
    bytes memory _data,
    uint256 _gas
  ) external returns (bytes32) {
    bytes32 __messageId = _nextMessageId();

    emit PassMessage(msg.sender, bytes32(_sourceChainId), _contract, _data, _gas, __messageId);
    return __messageId;
  }

  event PassMessage(
    address sender,
    bytes32 sourceChainId,
    address _contract,
    bytes data,
    uint256 gas,
    bytes32 messageId
  );

  function executePassMessageRequest(PassMessageRequest calldata passMessageRequest) external {
    _messageId = passMessageRequest.messageId;
    _messageSender = passMessageRequest.sender;
    _messageSourceChainId = passMessageRequest.sourceChainId;

    // solhint-disable-next-line avoid-low-level-calls
    (bool success, bytes memory error) = passMessageRequest._contract.call(passMessageRequest.data);
    if (!success) {
      if (error.length > 0) {
        // bubble up the error
        // solhint-disable-next-line no-inline-assembly
        assembly {
          let ptr := mload(0x40)
          let size := returndatasize()
          returndatacopy(ptr, 0, size)
          revert(ptr, size)
        }
      } else {
        revert('TestAMB: pass message reverted');
      }
    }
  }

  function requireToConfirmMessage(
    address _contract,
    bytes memory _data,
    uint256 _gas
  ) external returns (bytes32) {
    bytes32 __messageId = _nextMessageId();

    emit ConfirmMessage(msg.sender, bytes32(_sourceChainId), _contract, _data, _gas, __messageId);
    return __messageId;
  }

  event ConfirmMessage(
    address sender,
    bytes32 sourceChainId,
    address _contract,
    bytes data,
    uint256 gas,
    bytes32 messageId
  );

  function requireToGetInformation(bytes32 _requestSelector, bytes calldata _data) external returns (bytes32) {
    bytes32 __messageId = _nextMessageId();

    require(
      _requestSelector == MediatorImpl.ETH_CALL_REQUEST_SELECTOR,
      string(
        abi.encodePacked(
          'TestAMB: Invalid GetInformation request type: ',
          Strings.toHexString(uint256(_requestSelector))
        )
      )
    );

    (address _contract, bytes memory callData) = abi.decode(_data, (address, bytes));

    // solhint-disable-next-line avoid-low-level-calls
    (bool success, bytes memory result) = _contract.call(callData);

    emit GetInformation(msg.sender, bytes32(_sourceChainId), _requestSelector, _data, __messageId, success, result);

    return __messageId;
  }

  event GetInformation(
    address requester,
    bytes32 sourceChainId,
    bytes32 _requestSelector,
    bytes data,
    bytes32 messageId,
    bool success,
    bytes result
  );

  function executeGetInformationRequest(GetInformationRequest calldata getInformationRequest) external {
    _messageId = getInformationRequest.messageId;
    _messageSender = getInformationRequest.requester;
    _messageSourceChainId = getInformationRequest.sourceChainId;

    IAMBInformationReceiver(getInformationRequest.requester).onInformationReceived(
      getInformationRequest.messageId,
      getInformationRequest.success,
      getInformationRequest.result
    );
  }

  function sourceChainId() external view returns (uint256) {
    return _sourceChainId;
  }

  function setSourceChainId(uint256 __sourceChainId) external {
    _sourceChainId = __sourceChainId;
  }

  function destinationChainId() external view returns (uint256) {
    return _destinationChainId;
  }

  function setDestinationChainId(uint256 __destinationChainId) external {
    _destinationChainId = __destinationChainId;
  }

  function _nextMessageId() private returns (bytes32) {
    _messageIdCounter.increment();
    return bytes32(_messageIdCounter.current());
  }
}
