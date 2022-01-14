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
import { DiamondInitFunction } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { hexlify, zeroPad } from 'ethers/lib/utils';
import { IAMB, MediatorInit } from '../../types/contracts';

export const toByte32String = (value: number): string => hexlify(zeroPad(hexlify(value), 32));

export const ZERO_CHAIN_ID = toByte32String(0);

export const buildMediatorInitSetBridgeFunction = (mediatorInit: MediatorInit, bridge: IAMB): DiamondInitFunction => ({
  initAddress: mediatorInit.address,
  callData: encodeMediatorInitSetBridgeCallData(mediatorInit, bridge),
});

export const encodeMediatorInitSetBridgeCallData = (mediatorInit: MediatorInit, bridge: IAMB) =>
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
