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

import { toErc165InterfaceId } from '@paypr/ethereum-contracts/dist/src/contracts/erc165InterfaceIds';

export const AMB_INFORMATION_RECEIVER_INTERFACE_ID = toErc165InterfaceId(0xf534de5b);
export const TOKEN_MEDIATOR_INTERFACE_ID = toErc165InterfaceId(0x3756c9a5);
