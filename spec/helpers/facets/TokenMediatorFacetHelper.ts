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

import { buildDiamondFacetCut } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { IConsumable } from '@paypr/ethereum-contracts/dist/types/contracts';
import { BigNumberish, BytesLike, Contract } from 'ethers';
import {
  buildTokenMediatorInitInitializeFunction,
  buildTokenMediatorInitSetRemoteMediatorFunction,
  TokenMediatorInitData,
} from '../../../src/contracts/tokenMediator';
import {
  IAMB,
  ITokenMediator,
  ITokenMediator__factory,
  TokenMediatorFacet__factory,
  TokenMediatorInit__factory,
} from '../../../types/contracts';
import { INITIALIZER } from '../Accounts';
import { combineExtensibleDiamondOptions, createDiamond, cutDiamond, ExtensibleDiamondOptions } from '../DiamondHelper';
import { PRIMARY_CHAIN_ID, SECONDARY_CHAIN_ID } from './MediatorFacetHelper';

export const asTokenMediator = (contract: Contract) => ITokenMediator__factory.connect(contract.address, INITIALIZER);

export const createTokenMediator = async (initData: TokenMediatorInitData, options: ExtensibleDiamondOptions = {}) =>
  asTokenMediator(
    await createDiamond(
      combineExtensibleDiamondOptions(
        {
          additionalCuts: [buildDiamondFacetCut(await deployTokenMediatorFacet())],
          additionalInits: [buildTokenMediatorInitInitializeFunction(await deployTokenMediatorInit(), initData)],
        },
        options,
      ),
    ),
  );

export const setRemoteTokenMediator = async (
  tokenMediator: ITokenMediator,
  remoteMediator: ITokenMediator,
  chainId: BytesLike,
) => {
  await cutDiamond(
    tokenMediator,
    [],
    buildTokenMediatorInitSetRemoteMediatorFunction(await deployTokenMediatorInit(), remoteMediator, chainId),
  );
};

export interface PrimaryAndSecondaryTokenMediatorConfig {
  primaryBridge: IAMB;
  primaryConsumable: IConsumable;
  secondaryBridge: IAMB;
  secondaryConsumable: IConsumable;
  requestGasLimit?: BigNumberish;
  secondaryMintAndBurn?: boolean;
}

export const createPrimaryAndSecondaryTokenMediators = async ({
  primaryBridge,
  primaryConsumable,
  secondaryBridge,
  secondaryConsumable,
  requestGasLimit,
}: PrimaryAndSecondaryTokenMediatorConfig) => {
  const primaryMediator = await createTokenMediator({
    bridge: primaryBridge,
    requestGasLimit: requestGasLimit || 100000,
    tokens: [
      {
        localToken: primaryConsumable.address,
        remoteToken: secondaryConsumable.address,
        mintAndBurn: false,
      },
    ],
  });

  const secondaryMediator = await createTokenMediator({
    bridge: secondaryBridge,
    requestGasLimit: requestGasLimit || 100000,
    remoteMediator: primaryMediator,
    remoteChainId: PRIMARY_CHAIN_ID,
    tokens: [
      {
        localToken: secondaryConsumable.address,
        remoteToken: primaryConsumable.address,
        mintAndBurn: true,
      },
    ],
  });

  await setRemoteTokenMediator(primaryMediator, secondaryMediator, SECONDARY_CHAIN_ID);
  return { primaryMediator, secondaryMediator };
};

export const deployTokenMediatorFacet = () => new TokenMediatorFacet__factory(INITIALIZER).deploy();
export const deployTokenMediatorInit = () => new TokenMediatorInit__factory(INITIALIZER).deploy();
