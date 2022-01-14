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
  DiamondCutFacet__factory,
  DiamondInit__factory,
  DiamondLoupeFacet__factory,
} from '@paypr/ethereum-contracts/dist/types/contracts';
import { Contract, Signer } from 'ethers';
import { DIAMOND_CUTTER, INITIALIZER } from '../Accounts';

export const asDiamondCut = (contract: Contract, signer: Signer = DIAMOND_CUTTER) =>
  DiamondCutFacet__factory.connect(contract.address, signer);

export const deployDiamondCutFacet = () => new DiamondCutFacet__factory(INITIALIZER).deploy();
export const deployDiamondLoupeFacet = () => new DiamondLoupeFacet__factory(INITIALIZER).deploy();
export const deployDiamondInit = () => new DiamondInit__factory(INITIALIZER).deploy();
