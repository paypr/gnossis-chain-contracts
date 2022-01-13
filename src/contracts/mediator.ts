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
import ContractAddress from '@paypr/ethereum-contracts/dist/src/contracts/ContractAddress';
import { toByte32String } from '@paypr/ethereum-contracts/dist/src/contracts/fixedBytes';
import { DiamondInitFunction } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { LikeInterface } from '@paypr/ethereum-contracts/dist/src/contracts/interfaces';
import { IAMB, MediatorInit } from '../../types/contracts';
import { Hexable } from 'ethers/lib/utils';

export type ChainId = string;

export const toChainId = (value: BytesLike | Hexable | number): ChainId => toByte32String(value);

export const ZERO_CHAIN_ID = toChainId(0);

export type AMBLike = LikeInterface<IAMB>;

export const buildMediatorInitSetBridgeFunction = (
  mediatorInit: MediatorInit,
  bridge: AMBLike,
): DiamondInitFunction => ({
  initAddress: mediatorInit.address,
  callData: encodeMediatorInitSetBridgeCallData(mediatorInit, bridge),
});

export const encodeMediatorInitSetBridgeCallData = (mediatorInit: MediatorInit, bridge: AMBLike) =>
  mediatorInit.interface.encodeFunctionData('setBridge', [bridge.address]);

export const buildMediatorAddAllowedSenderFunction = (
  mediatorInit: MediatorInit,
  sender: ContractAddress,
  chainId: BytesLike,
): DiamondInitFunction => ({
  initAddress: mediatorInit.address,
  callData: encodeMediatorInitAddAllowedSenderCallData(mediatorInit, sender, chainId),
});

export const encodeMediatorInitAddAllowedSenderCallData = (
  mediatorInit: MediatorInit,
  sender: ContractAddress,
  chainId: BytesLike,
) => mediatorInit.interface.encodeFunctionData('addAllowedSender', [sender, chainId]);
