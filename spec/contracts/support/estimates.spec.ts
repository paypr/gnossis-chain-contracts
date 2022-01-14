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

import {
  buildDiamondFacetCut,
  DiamondConstructorParams,
  emptyDiamondInitFunction,
} from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { Diamond__factory } from '@paypr/ethereum-contracts/dist/types/contracts';
import { BigNumber } from 'ethers';
import { buildMediatorInitSetBridgeFunction } from '../../../src/contracts/mediator';
import { buildTokenMediatorInitInitializeFunction } from '../../../src/contracts/tokenMediator';
import { INITIALIZER } from '../../helpers/Accounts';
import { createConsumable } from '../../helpers/facets/ConsumableFacetHelper';
import {
  deployAMBInformationReceiverFacet,
  deployMediatorInit,
  deployTestAMB,
} from '../../helpers/facets/MediatorFacetHelper';
import { deployTokenMediatorFacet, deployTokenMediatorInit } from '../../helpers/facets/TokenMediatorFacetHelper';

const baseDiamondEstimate = 1282807;
const singleFunctionFacetEstimate = 97847;

type EstimateTest = [string, () => Promise<DiamondConstructorParams> | DiamondConstructorParams, number];
const estimateTests: EstimateTest[] = [
  [
    'AMBInformationReceiverFacet',
    async () => ({
      diamondCuts: [buildDiamondFacetCut(await deployAMBInformationReceiverFacet())],
      initFunction: emptyDiamondInitFunction,
    }),
    singleFunctionFacetEstimate,
  ],
  [
    'AMBInformationReceiverFacet with bridge',
    async () => ({
      diamondCuts: [buildDiamondFacetCut(await deployAMBInformationReceiverFacet())],
      initFunction: buildMediatorInitSetBridgeFunction(await deployMediatorInit(), await deployTestAMB()),
    }),
    125330,
  ],
  [
    'TokenMediatorFacet',
    async () => ({
      diamondCuts: [buildDiamondFacetCut(await deployTokenMediatorFacet())],
      initFunction: emptyDiamondInitFunction,
    }),
    146343,
  ],
  [
    'TokenMediatorFacet with initialize single token',
    async () => ({
      diamondCuts: [buildDiamondFacetCut(await deployTokenMediatorFacet())],
      initFunction: buildTokenMediatorInitInitializeFunction(await deployTokenMediatorInit(), {
        bridge: await deployTestAMB(),
        remoteMediator: await deployTokenMediatorFacet(),
        requestGasLimit: 100000,
        tokens: [
          {
            localToken: (await createConsumable()).address,
            remoteToken: (await createConsumable()).address,
            mintAndBurn: true,
          },
        ],
      }),
    }),
    337714,
  ],
];

describe('estimates', () => {
  it('base diamond without cuts', async () => {
    const deployTransaction = new Diamond__factory(INITIALIZER).getDeployTransaction({
      diamondCuts: [],
      initFunction: emptyDiamondInitFunction,
    });

    const estimate = await INITIALIZER.estimateGas(deployTransaction);
    expect<BigNumber>(estimate).toEqBN(baseDiamondEstimate);
  });

  test.each(estimateTests)(
    '%s estimate',
    async (
      name: string,
      buildConstructorParams: () => Promise<DiamondConstructorParams> | DiamondConstructorParams,
      differenceFromBase: number,
    ) => {
      const deployTransaction = new Diamond__factory(INITIALIZER).getDeployTransaction(await buildConstructorParams());

      const estimate = await INITIALIZER.estimateGas(deployTransaction);
      console.log(`Total estimate for ${name}: ${estimate.toNumber()}`);
      const estimateDiff = estimate.sub(baseDiamondEstimate);
      expect<BigNumber>(estimateDiff).toBeLteBN(1000 + differenceFromBase);
      expect<BigNumber>(estimateDiff).toBeGteBN(differenceFromBase - 1000);
    },
  );
});
