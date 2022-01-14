/*
 * Copyright (c) 2021 The Paypr Company, LLC
 *
 * This file is part of Paypr Ethereum Contracts.
 *
 * Paypr Ethereum Contracts is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Paypr Ethereum Contracts is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Paypr Ethereum Contracts.  If not, see <https://www.gnu.org/licenses/>.
 */

import { AccessRoleMembers } from '@paypr/ethereum-contracts/dist/src/contracts/access';
import { buildDiamondFacetCut, DiamondFacetCut } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { MINTER_ROLE, SUPER_ADMIN_ROLE } from '@paypr/ethereum-contracts/dist/src/contracts/roles';
import {
  IConsumableMint__factory,
  IConsumable__factory,
  ConsumableFacet__factory,
  ConsumableMintFacet__factory,
} from '@paypr/ethereum-contracts/dist/types/contracts';
import { Contract, Signer } from 'ethers';
import { CONSUMABLE_MINTER, INITIALIZER } from '../Accounts';
import { combineExtensibleDiamondOptions, createDiamond, ExtensibleDiamondOptions } from '../DiamondHelper';
import { ConsumableAmount, ConsumableAmountBN } from '@paypr/ethereum-contracts/dist/src/contracts/consumables';

export const asConsumable = (contract: Contract, signer: Signer = INITIALIZER) =>
  IConsumable__factory.connect(contract.address, signer);

export const asConsumableMint = (contract: Contract, signer: Signer = CONSUMABLE_MINTER) =>
  IConsumableMint__factory.connect(contract.address, signer);

export interface CreateConsumableOptions extends ExtensibleDiamondOptions {}

export const createConsumable = async (options: CreateConsumableOptions = {}) =>
  asConsumable(
    await createDiamond(
      combineExtensibleDiamondOptions(
        {
          additionalCuts: [
            buildDiamondFacetCut(await deployConsumableFacet()),
            buildDiamondFacetCut(await deployConsumableMintFacet()),
          ],
          additionalRoleMembers: [
            { role: SUPER_ADMIN_ROLE, members: [INITIALIZER.address] },
            { role: MINTER_ROLE, members: [CONSUMABLE_MINTER.address] },
          ],
        },
        options,
      ),
    ),
  );

export const combineConsumableAdditions = (...additions: ExtensibleDiamondOptions[]): ExtensibleDiamondOptions => {
  const additionalCuts: DiamondFacetCut[] = [];
  const additionalRoleMembers: AccessRoleMembers[] = [];

  additions.forEach((addition) => {
    addition.additionalCuts?.forEach((cut) => additionalCuts.push(cut));
    addition.additionalRoleMembers?.forEach((admins) => additionalRoleMembers.push(admins));
  });

  return { additionalCuts, additionalRoleMembers: additionalRoleMembers };
};

export const deployConsumableFacet = () => new ConsumableFacet__factory(INITIALIZER).deploy();
export const deployConsumableMintFacet = () => new ConsumableMintFacet__factory(INITIALIZER).deploy();

export const toConsumableAmount = (consumableAmount: ConsumableAmountBN): ConsumableAmount => {
  const { consumable, amount } = consumableAmount;
  return { consumable, amount: amount.toNumber() };
};

export const toConsumableAmountAsync = async (
  consumableAmount: Promise<ConsumableAmountBN> | ConsumableAmountBN,
): Promise<ConsumableAmount> => toConsumableAmount(await consumableAmount);
