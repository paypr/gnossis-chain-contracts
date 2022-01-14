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

import { AccessRoleMembers } from '@paypr/ethereum-contracts/dist/src/contracts/access';
import {
  buildDiamondFacetCut,
  buildDiamondInitFunction,
  DiamondFacetCut,
  DiamondInitFunction,
  emptyDiamondInitFunction,
} from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import {
  buildErc165SetSupportedInterfacesDiamondInitFunction,
  Erc165InterfaceId,
} from '@paypr/ethereum-contracts/dist/src/contracts/erc165';
import { DIAMOND_CUTTER_ROLE } from '@paypr/ethereum-contracts/dist/src/contracts/roles';
import { Diamond__factory, DiamondInit } from '@paypr/ethereum-contracts/dist/types/contracts';
import { Contract } from 'ethers';
import { DIAMOND_CUTTER, INITIALIZER } from './Accounts';
import {
  AccessControlInitOptions,
  asAccessControl,
  buildAccessControlInitFunction,
  deployAccessControlCheckFacet,
  deployAccessControlFacet,
} from './facets/AccessControlFacetHelper';
import { asDiamondCut, deployDiamondCutFacet, deployDiamondInit } from './facets/DiamondFacetHelper';
import { deployErc165Facet, deployErc165Init } from './facets/ERC165FacetHelper';

export const deployDiamond = (
  diamondCuts: DiamondFacetCut[],
  initFunction: DiamondInitFunction = emptyDiamondInitFunction,
) =>
  new Diamond__factory(INITIALIZER).deploy({
    diamondCuts,
    initFunction,
  });

export interface CreateDiamondBaseOptions {
  additionalCuts?: DiamondFacetCut[];
  diamondInit?: DiamondInit;
  additionalInits?: DiamondInitFunction[];
  additionalInterfaceIds?: Erc165InterfaceId[];
}

export type CreateDiamondOptions = CreateDiamondBaseOptions & AccessControlInitOptions;

export const createDiamond = async (options: CreateDiamondOptions = {}) => {
  const additionalInterfaceIds = options.additionalInterfaceIds;

  const initFunction = await combineDiamondInitFunctions(
    [
      await buildAccessControlInitFunction(options),
      ...(additionalInterfaceIds
        ? [buildErc165SetSupportedInterfacesDiamondInitFunction(await deployErc165Init(), additionalInterfaceIds)]
        : []),
      ...(options.additionalInits || []),
    ],
    options.diamondInit,
  );

  const diamond = await deployDiamond(
    [
      buildDiamondFacetCut(await deployErc165Facet()),
      buildDiamondFacetCut(await deployAccessControlFacet()),
      buildDiamondFacetCut(await deployAccessControlCheckFacet()),
      buildDiamondFacetCut(await deployDiamondCutFacet()),
      ...(options.additionalCuts || []),
    ],
    initFunction,
  );

  await asAccessControl(diamond).grantRole(DIAMOND_CUTTER_ROLE, DIAMOND_CUTTER.address);

  return diamond;
};

export const cutDiamond = (
  diamond: Contract,
  diamondCuts: DiamondFacetCut[],
  initFunction: DiamondInitFunction = emptyDiamondInitFunction,
) => asDiamondCut(diamond).diamondCut(diamondCuts, initFunction);

export const combineDiamondInitFunctions = async (
  initFunctions: DiamondInitFunction[],
  diamondInit?: DiamondInit,
): Promise<DiamondInitFunction> => {
  if (initFunctions.length === 0) {
    return emptyDiamondInitFunction;
  }

  if (initFunctions.length === 1) {
    return initFunctions[0];
  }

  const diamondInitContract = diamondInit || (await deployDiamondInit());

  return buildDiamondInitFunction(diamondInitContract, initFunctions);
};

export interface ExtensibleDiamondOptions {
  additionalCuts?: DiamondFacetCut[];
  additionalRoleMembers?: AccessRoleMembers[];
  additionalInits?: DiamondInitFunction[];
}

export const combineExtensibleDiamondOptions = (
  baseOptions: ExtensibleDiamondOptions,
  additionalOptions: ExtensibleDiamondOptions,
): ExtensibleDiamondOptions => ({
  additionalCuts: [...(baseOptions.additionalCuts || []), ...(additionalOptions.additionalCuts || [])],
  additionalRoleMembers: [
    ...(baseOptions.additionalRoleMembers || []),
    ...(additionalOptions.additionalRoleMembers || []),
  ],
  additionalInits: [...(baseOptions.additionalInits || []), ...(additionalOptions.additionalInits || [])],
});
