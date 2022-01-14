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
import { TypedEvent } from '@typechain/ethers-v5/static/common';
import { BytesLike, Contract, ContractReceipt } from 'ethers';
import { buildMediatorInitSetBridgeFunction, toByte32String } from '../../../src/contracts/mediator';
import {
  AMBInformationAccessFacet__factory,
  AMBInformationReceiverFacet__factory,
  IAMB,
  IAMBInformationAccess__factory,
  IAMBInformationReceiver__factory,
  MediatorInit__factory,
  TestAMB__factory,
  TestAMBInformationRequesterFacet__factory,
} from '../../../types/contracts';
import { GetInformationEvent, PassMessageEvent, TestAMBInterface } from '../../../types/contracts/TestAMB';
import { INITIALIZER } from '../Accounts';
import { combineExtensibleDiamondOptions, createDiamond, ExtensibleDiamondOptions } from '../DiamondHelper';

export const PRIMARY_CHAIN_ID = toByte32String(1001);
export const SECONDARY_CHAIN_ID = toByte32String(2001);

export const asAMBInformationReceiver = (contract: Contract) =>
  IAMBInformationReceiver__factory.connect(contract.address, INITIALIZER);

export const asAMBInformationAccess = (contract: Contract) =>
  IAMBInformationAccess__factory.connect(contract.address, INITIALIZER);

export const asTestAMBInformationRequester = (contract: Contract) =>
  TestAMBInformationRequesterFacet__factory.connect(contract.address, INITIALIZER);

export const createAMBInformationReceiver = async (bridge: IAMB, options: ExtensibleDiamondOptions = {}) =>
  asAMBInformationReceiver(
    await createDiamond(
      combineExtensibleDiamondOptions(
        {
          additionalCuts: [
            buildDiamondFacetCut(await deployAMBInformationReceiverFacet()),
            buildDiamondFacetCut(await deployTestAMBInformationRequesterFacet()),
            buildDiamondFacetCut(await deployAMBInformationAccessFacet()),
          ],
          additionalInits: [buildMediatorInitSetBridgeFunction(await deployMediatorInit(), bridge)],
        },
        options,
      ),
    ),
  );

export const findTestAMBPassMessageEvent = (bridge: IAMB, contractReceipt: ContractReceipt) =>
  findTestAMBEvent<PassMessageEvent>(
    bridge,
    contractReceipt,
    'PassMessage(address,bytes32,address,bytes,uint256,bytes32)',
  );

export const getTestAMBGetInformationEventMessageId = (bridge: IAMB, contractReceipt: ContractReceipt) =>
  findTestAMBGetInformationEvent(bridge, contractReceipt)!.args.messageId;

export const findTestAMBGetInformationEvent = (bridge: IAMB, contractReceipt: ContractReceipt) =>
  findTestAMBEvent<GetInformationEvent>(
    bridge,
    contractReceipt,
    'GetInformation(address,bytes32,bytes32,bytes,bytes32,bool,bytes)',
  );

const findTestAMBEvent = <E extends TypedEvent<any>>(
  bridge: IAMB,
  contractReceipt: ContractReceipt,
  eventName: keyof TestAMBInterface['events'],
): E | undefined => {
  const factoryInterface = TestAMB__factory.createInterface();

  const eventFragment = factoryInterface.events[eventName];
  const eventTopic = factoryInterface.getEventTopic(eventFragment);

  const eventLog = contractReceipt.logs
    .filter((log) => log.topics.includes(eventTopic))
    .filter((log) => log.address && log.address.toLowerCase() === bridge.address.toLowerCase())[0];

  if (!eventLog) {
    return undefined;
  }

  return factoryInterface.parseLog(eventLog) as unknown as E;
};

export interface TestBridgeOptions {
  sourceChainId?: BytesLike;
  destinationChainId?: BytesLike;
}

export const createTestBridge = async (options: TestBridgeOptions = {}) => {
  const bridge = await deployTestAMB();
  await bridge.setSourceChainId(options.sourceChainId || PRIMARY_CHAIN_ID);
  await bridge.setDestinationChainId(options.destinationChainId || SECONDARY_CHAIN_ID);
  return bridge;
};

export const deployAMBInformationAccessFacet = () => new AMBInformationAccessFacet__factory(INITIALIZER).deploy();
export const deployAMBInformationReceiverFacet = () => new AMBInformationReceiverFacet__factory(INITIALIZER).deploy();
export const deployTestAMBInformationRequesterFacet = () =>
  new TestAMBInformationRequesterFacet__factory(INITIALIZER).deploy();
export const deployMediatorInit = () => new MediatorInit__factory(INITIALIZER).deploy();
export const deployTestAMB = () => new TestAMB__factory(INITIALIZER).deploy();
