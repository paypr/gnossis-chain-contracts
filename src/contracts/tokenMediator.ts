/*
 * Copyright (c) 2022 The Paypr Company, LLC
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
 * along with Paypr Ethereum Contracts.  If not, see <https://www.gnu.org/licenses/>.
 */

import { BytesLike } from '@ethersproject/bytes';
import { ZERO_ADDRESS } from '@paypr/ethereum-contracts/dist/src/contracts/accounts';
import ContractAddress from '@paypr/ethereum-contracts/dist/src/contracts/ContractAddress';
import { DiamondInitFunction } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { BigNumberish } from 'ethers';
import { IAMB, ITokenMediator, TokenMediatorInit } from '../../types/contracts';
import { ZERO_CHAIN_ID } from './mediator';

export interface TokenMediatorInitData {
  bridge: IAMB;
  remoteMediator?: ITokenMediator;
  remoteChainId?: BytesLike;
  requestGasLimit: BigNumberish;
  tokens?: TokenMediatorTokenInfo[];
}

export interface TokenMediatorTokenInfo {
  localToken: ContractAddress;
  remoteToken: ContractAddress;
  mintAndBurn: boolean;
}

export const buildTokenMediatorInitInitializeFunction = (
  tokenMediatorInit: TokenMediatorInit,
  initData: TokenMediatorInitData,
): DiamondInitFunction => ({
  initAddress: tokenMediatorInit.address,
  callData: encodeTokenMediatorInitInitializeCallData(tokenMediatorInit, initData),
});

export const encodeTokenMediatorInitInitializeCallData = (
  mediatorInit: TokenMediatorInit,
  initData: TokenMediatorInitData,
) =>
  mediatorInit.interface.encodeFunctionData('initialize', [
    {
      bridge: initData.bridge.address,
      remoteMediator: initData.remoteMediator?.address || ZERO_ADDRESS,
      remoteChainId: initData.remoteChainId || ZERO_CHAIN_ID,
      requestGasLimit: initData.requestGasLimit,
      tokens: initData.tokens || [],
    },
  ]);

export const buildTokenMediatorInitSetRequestGasLimitFunction = (
  tokenMediatorInit: TokenMediatorInit,
  requestGasLimit: BigNumberish,
): DiamondInitFunction => ({
  initAddress: tokenMediatorInit.address,
  callData: encodeTokenMediatorInitSetRequestGasLimitCallData(tokenMediatorInit, requestGasLimit),
});

export const encodeTokenMediatorInitSetRequestGasLimitCallData = (
  mediatorInit: TokenMediatorInit,
  requestGasLimit: BigNumberish,
) => mediatorInit.interface.encodeFunctionData('setRequestGasLimit', [requestGasLimit]);

export const buildTokenMediatorInitSetRemoteMediatorFunction = (
  tokenMediatorInit: TokenMediatorInit,
  remoteMediator: ITokenMediator,
  remoteChainId: BytesLike,
): DiamondInitFunction => ({
  initAddress: tokenMediatorInit.address,
  callData: encodeTokenMediatorInitSetRemoteMediatorCallData(tokenMediatorInit, remoteMediator, remoteChainId),
});

export const encodeTokenMediatorInitSetRemoteMediatorCallData = (
  mediatorInit: TokenMediatorInit,
  remoteMediator: ITokenMediator,
  remoteChainId: BytesLike,
) => mediatorInit.interface.encodeFunctionData('setRemoteMediator', [remoteMediator.address, remoteChainId]);

export const buildTokenMediatorInitAddMediatedTokenFunction = (
  tokenMediatorInit: TokenMediatorInit,
  tokenInfo: TokenMediatorTokenInfo,
): DiamondInitFunction => ({
  initAddress: tokenMediatorInit.address,
  callData: encodeTokenMediatorInitAddMediatedTokenCallData(tokenMediatorInit, tokenInfo),
});

export const encodeTokenMediatorInitAddMediatedTokenCallData = (
  mediatorInit: TokenMediatorInit,
  tokenInfo: TokenMediatorTokenInfo,
) => mediatorInit.interface.encodeFunctionData('addMediatedToken', [tokenInfo]);
