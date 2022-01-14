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
  AccessRole,
  AccessRoleMembers,
  buildAccessControlAddMembersInitFunction,
  buildAccessControlInitAdminsInitFunction,
} from '@paypr/ethereum-contracts/dist/src/contracts/access';
import { DiamondInitFunction } from '@paypr/ethereum-contracts/dist/src/contracts/diamonds';
import { SUPER_ADMIN_ROLE } from '@paypr/ethereum-contracts/dist/src/contracts/roles';
import {
  AccessControlCheckFacet__factory,
  AccessControlFacet__factory,
  AccessControlInit__factory,
  IAccessCheck__factory,
  IAccessControl__factory,
} from '@paypr/ethereum-contracts/dist/types/contracts';
import { Contract, Signer } from 'ethers';
import { INITIALIZER } from '../Accounts';

export const asAccessCheck = (contract: Contract, signer: Signer = INITIALIZER) =>
  IAccessCheck__factory.connect(contract.address, signer);
export const asAccessControl = (contract: Contract, signer: Signer = INITIALIZER) =>
  IAccessControl__factory.connect(contract.address, signer);

export const deployAccessControlCheckFacet = () => new AccessControlCheckFacet__factory(INITIALIZER).deploy();
export const deployAccessControlFacet = () => new AccessControlFacet__factory(INITIALIZER).deploy();
export const deployAccessControlInit = () => new AccessControlInit__factory(INITIALIZER).deploy();

export type AccessControlInitOptions =
  | {
      additionalRoles?: AccessRole[];
    }
  | {
      additionalRoleMembers?: AccessRoleMembers[];
    };

export const buildAccessControlInitFunction = async (
  options: AccessControlInitOptions,
): Promise<DiamondInitFunction> => {
  const accessControlInit = await deployAccessControlInit();
  if ('additionalRoleMembers' in options && options.additionalRoleMembers && options.additionalRoleMembers.length > 0) {
    return buildAccessControlAddMembersInitFunction(accessControlInit, options.additionalRoleMembers);
  }

  const initRoles = [SUPER_ADMIN_ROLE, ...(('additionalRoles' in options && options.additionalRoles) || [])];
  return buildAccessControlInitAdminsInitFunction(accessControlInit, initRoles);
};
