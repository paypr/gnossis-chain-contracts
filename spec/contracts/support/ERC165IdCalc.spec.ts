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

import { Erc165InterfaceId } from '@paypr/ethereum-contracts/dist/src/contracts/erc165';
import {
  AMB_INFORMATION_RECEIVER_INTERFACE_ID,
  TOKEN_MEDIATOR_INTERFACE_ID,
} from '../../../src/contracts/erc165InterfaceIds';
import { ERC165IdCalc, ERC165IdCalc__factory } from '../../../types/contracts';
import { INITIALIZER } from '../../helpers/Accounts';

export const deployERC165IdCalcContract = () => new ERC165IdCalc__factory(INITIALIZER).deploy();

type InterfaceTest = [string, Erc165InterfaceId, (ERC165IdCalc) => Promise<Erc165InterfaceId>];

const interfaceTests: InterfaceTest[] = [
  [
    'AMBInformationReceiver',
    AMB_INFORMATION_RECEIVER_INTERFACE_ID,
    (idCalc) => idCalc.calcAMBInformationReceiverInterfaceId(),
  ],
  ['TokenMediator', TOKEN_MEDIATOR_INTERFACE_ID, (idCalc) => idCalc.calcTokenMediatorInterfaceId()],
];

describe('calculations', () => {
  test.each(interfaceTests)(
    'should match %s interface id',
    async (
      interfaceName: string,
      interfaceId: Erc165InterfaceId,
      calcInterfaceId: (idCalc: ERC165IdCalc) => Promise<Erc165InterfaceId>,
    ) => {
      const idCalc = await deployERC165IdCalcContract();

      expect<string>(await calcInterfaceId(idCalc)).toEqual(interfaceId);
    },
  );

  it('should not have any duplicates', () => {
    const interfaceIds = interfaceTests.map((it) => it[1]);
    const interfaceSet = new Set(interfaceIds);

    expect<number>(interfaceIds.length).toEqual(interfaceSet.size);
  });
});
