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
import { ContractTransaction } from 'ethers';
import { AMB_INFORMATION_RECEIVER_INTERFACE_ID } from '../../../../src/contracts/erc165InterfaceIds';
import { PLAYER1 } from '../../../helpers/Accounts';
import { deployDiamond } from '../../../helpers/DiamondHelper';
import { shouldSupportInterface } from '../../../helpers/ERC165Helper';
import { asConsumableMint, createConsumable } from '../../../helpers/facets/ConsumableFacetHelper';
import { asErc165, deployErc165Facet } from '../../../helpers/facets/ERC165FacetHelper';
import {
  asAMBInformationAccess,
  asTestAMBInformationRequester,
  createAMBInformationReceiver,
  createTestBridge,
  deployAMBInformationReceiverFacet,
  getTestAMBGetInformationEventMessageId,
  PRIMARY_CHAIN_ID,
} from '../../../helpers/facets/MediatorFacetHelper';

describe('supportsInterface', () => {
  const createDiamondForErc165 = async () =>
    asErc165(
      await deployDiamond([
        buildDiamondFacetCut(await deployErc165Facet()),
        buildDiamondFacetCut(await deployAMBInformationReceiverFacet()),
      ]),
    );

  shouldSupportInterface('AMBInformationReceiver', createDiamondForErc165, AMB_INFORMATION_RECEIVER_INTERFACE_ID);
});

describe('onInformationReceived', () => {
  it('should save the remote call response data', async () => {
    const bridge = await createTestBridge();

    const ambInformationReceiver = await createAMBInformationReceiver(bridge);

    const consumable = await createConsumable();
    await asConsumableMint(consumable).mint(PLAYER1.address, 100);

    const transactionResponse = await asTestAMBInformationRequester(ambInformationReceiver).callRemote(
      consumable.address,
      consumable.interface.encodeFunctionData('balanceOf', [PLAYER1.address]),
    );
    const messageId = getTestAMBGetInformationEventMessageId(bridge, await transactionResponse.wait());

    await bridge.executeGetInformationRequest({
      messageId,
      requester: ambInformationReceiver.address,
      sourceChainId: PRIMARY_CHAIN_ID,
      success: true,
      result: '0x1234',
    });

    const [success, result] = await asAMBInformationAccess(ambInformationReceiver).remoteCallResponse(messageId);
    expect<boolean>(success).toBeTruthy();
    expect(result).toBe('0x1234');
  });

  it('should return false before the remote call completes', async () => {
    const bridge = await createTestBridge();

    const ambInformationReceiver = await createAMBInformationReceiver(bridge);

    const consumable = await createConsumable();
    await asConsumableMint(consumable).mint(PLAYER1.address, 100);

    const transactionResponse = await asTestAMBInformationRequester(ambInformationReceiver).callRemote(
      consumable.address,
      consumable.interface.encodeFunctionData('balanceOf', [PLAYER1.address]),
    );
    const messageId = getTestAMBGetInformationEventMessageId(bridge, await transactionResponse.wait());

    const [success, result] = await asAMBInformationAccess(ambInformationReceiver).remoteCallResponse(messageId);
    expect<boolean>(success).toBeFalsy();
    expect(result).toBe('0x');
  });

  it('should save multiple remote call response data', async () => {
    const bridge = await createTestBridge();

    const ambInformationReceiver = await createAMBInformationReceiver(bridge);

    const consumable = await createConsumable();

    const transactionResponse1 = await asTestAMBInformationRequester(ambInformationReceiver).callRemote(
      consumable.address,
      consumable.interface.encodeFunctionData('balanceOf', [PLAYER1.address]),
    );
    const messageId1 = getTestAMBGetInformationEventMessageId(bridge, await transactionResponse1.wait());

    await bridge.executeGetInformationRequest({
      messageId: messageId1,
      requester: ambInformationReceiver.address,
      sourceChainId: PRIMARY_CHAIN_ID,
      success: false,
      result: '0x1234',
    });

    const transactionResponse2 = await asTestAMBInformationRequester(ambInformationReceiver).callRemote(
      consumable.address,
      consumable.interface.encodeFunctionData('balanceOf', [PLAYER1.address]),
    );
    const messageId2 = getTestAMBGetInformationEventMessageId(bridge, await transactionResponse2.wait());

    await bridge.executeGetInformationRequest({
      messageId: messageId2,
      requester: ambInformationReceiver.address,
      sourceChainId: PRIMARY_CHAIN_ID,
      success: true,
      result: '0x5678',
    });

    const [success1, result1] = await asAMBInformationAccess(ambInformationReceiver).remoteCallResponse(messageId1);
    expect<boolean>(success1).toBeFalsy();
    expect(result1).toBe('0x1234');

    const [success2, result2] = await asAMBInformationAccess(ambInformationReceiver).remoteCallResponse(messageId2);
    expect<boolean>(success2).toBeTruthy();
    expect(result2).toBe('0x5678');
  });

  it('should fail if not called by the appropriate bridge', async () => {
    const bridge = await createTestBridge();
    const bridge2 = await createTestBridge();

    const ambInformationReceiver = await createAMBInformationReceiver(bridge);

    const consumable = await createConsumable();
    await asConsumableMint(consumable).mint(PLAYER1.address, 100);

    const transactionResponse = await asTestAMBInformationRequester(ambInformationReceiver).callRemote(
      consumable.address,
      consumable.interface.encodeFunctionData('balanceOf', [PLAYER1.address]),
    );
    const messageId = getTestAMBGetInformationEventMessageId(bridge, await transactionResponse.wait());

    await expect<Promise<ContractTransaction>>(
      bridge2.executeGetInformationRequest({
        messageId,
        requester: ambInformationReceiver.address,
        sourceChainId: PRIMARY_CHAIN_ID,
        success: true,
        result: '0x1234',
      }),
    ).toBeRevertedWith('Mediator: bridge not allowed');
  });
});
