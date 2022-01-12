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
import { toByte32String } from '@paypr/ethereum-contracts/dist/src/contracts/fixedBytes';
import { MINTER_ROLE } from '@paypr/ethereum-contracts/dist/src/contracts/roles';
import { BigNumber } from 'ethers';
import { ContractTransaction } from 'ethers/lib/ethers';
import { TOKEN_MEDIATOR_INTERFACE_ID } from '../../../../src/contracts/erc165InterfaceIds';
import { PLAYER1, PLAYER2 } from '../../../helpers/Accounts';
import { deployDiamond } from '../../../helpers/DiamondHelper';
import { shouldSupportInterface } from '../../../helpers/ERC165Helper';
import { asAccessControl } from '../../../helpers/facets/AccessControlFacetHelper';
import { asConsumableMint, createConsumable } from '../../../helpers/facets/ConsumableFacetHelper';
import { asErc165, deployErc165Facet } from '../../../helpers/facets/ERC165FacetHelper';
import {
  createTestBridge,
  findTestAMBPassMessageEvent,
  PRIMARY_CHAIN_ID,
  SECONDARY_CHAIN_ID,
} from '../../../helpers/facets/MediatorFacetHelper';
import {
  createPrimaryAndSecondaryTokenMediators,
  deployTokenMediatorFacet,
} from '../../../helpers/facets/TokenMediatorFacetHelper';

describe('supportsInterface', () => {
  const createDiamondForErc165 = async () =>
    asErc165(
      await deployDiamond([
        buildDiamondFacetCut(await deployErc165Facet()),
        buildDiamondFacetCut(await deployTokenMediatorFacet()),
      ]),
    );

  shouldSupportInterface('TokenMediator', createDiamondForErc165, TOKEN_MEDIATOR_INTERFACE_ID);
});

describe('sendTokens', () => {
  it('should send tokens to the same address on other side', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);
    await primaryConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    const transactionReceipt = await (
      await primaryMediator.connect(PLAYER1).sendTokens(primaryConsumable.address, 100)
    ).wait();

    const passMessageEvent = findTestAMBPassMessageEvent(primaryBridge, transactionReceipt)!.args;

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(900);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(100);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);

    expect<string>(passMessageEvent.messageId).toEqual(toByte32String(1));
    expect<string>(passMessageEvent.sourceChainId).toEqual(PRIMARY_CHAIN_ID);
    expect<BigNumber>(passMessageEvent.gas).toEqBN(100000);
    expect<string>(passMessageEvent.sender).toEqual(primaryMediator.address);
    expect<string>(passMessageEvent._contract).toEqual(secondaryMediator.address);
    expect<string>(passMessageEvent.data).toEqual(
      secondaryMediator.interface.encodeFunctionData('receiveTokens', [
        primaryConsumable.address,
        secondaryConsumable.address,
        PLAYER1.address,
        PLAYER1.address,
        100,
      ]),
    );
  });

  it('should burn tokens if mintAndBurn true', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asAccessControl(secondaryConsumable).grantRole(MINTER_ROLE, secondaryMediator.address);

    await asConsumableMint(secondaryConsumable).mint(PLAYER1.address, 1000);
    await secondaryConsumable.connect(PLAYER1).approve(secondaryMediator.address, 100);

    const transactionReceipt = await (
      await secondaryMediator.connect(PLAYER1).sendTokens(secondaryConsumable.address, 100)
    ).wait();

    const passMessageEvent = findTestAMBPassMessageEvent(secondaryBridge, transactionReceipt)!.args;

    expect<BigNumber>(await secondaryConsumable.balanceOf(PLAYER1.address)).toEqBN(900);
    expect<BigNumber>(await secondaryConsumable.balanceOf(secondaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await secondaryConsumable.totalSupply()).toEqBN(900);

    expect<string>(passMessageEvent.messageId).toEqual(toByte32String(1));
    expect<string>(passMessageEvent.sourceChainId).toEqual(SECONDARY_CHAIN_ID);
    expect<BigNumber>(passMessageEvent.gas).toEqBN(100000);
    expect<string>(passMessageEvent.sender).toEqual(secondaryMediator.address);
    expect<string>(passMessageEvent._contract).toEqual(primaryMediator.address);
    expect<string>(passMessageEvent.data).toEqual(
      primaryMediator.interface.encodeFunctionData('receiveTokens', [
        secondaryConsumable.address,
        primaryConsumable.address,
        PLAYER1.address,
        PLAYER1.address,
        100,
      ]),
    );
  });

  it('should fail if sender did not approve enough token to send', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendTokens(primaryConsumable.address, 100),
    ).toBeRevertedWith('transfer amount exceeds allowance');

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });

  it('should fail if sender does not have enough token to send', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await primaryConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendTokens(primaryConsumable.address, 100),
    ).toBeRevertedWith('transfer amount exceeds balance');

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });

  it('should fail to send unknown tokens', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);

    const anotherConsumable = await createConsumable();
    await asConsumableMint(anotherConsumable).mint(PLAYER1.address, 1000);
    await anotherConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendTokens(anotherConsumable.address, 100),
    ).toBeRevertedWith('token not found');

    expect<BigNumber>(await anotherConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await anotherConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });
});

describe('sendAndTransferTokens', () => {
  it('should send tokens to the same address on other side', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);
    await primaryConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    const transactionReceipt = await (
      await primaryMediator.connect(PLAYER1).sendAndTransferTokens(primaryConsumable.address, PLAYER1.address, 100)
    ).wait();

    const passMessageEvent = findTestAMBPassMessageEvent(primaryBridge, transactionReceipt)!.args;

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(900);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(100);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);

    expect<string>(passMessageEvent.messageId).toEqual(toByte32String(1));
    expect<string>(passMessageEvent.sourceChainId).toEqual(PRIMARY_CHAIN_ID);
    expect<BigNumber>(passMessageEvent.gas).toEqBN(100000);
    expect<string>(passMessageEvent.sender).toEqual(primaryMediator.address);
    expect<string>(passMessageEvent._contract).toEqual(secondaryMediator.address);
    expect<string>(passMessageEvent.data).toEqual(
      secondaryMediator.interface.encodeFunctionData('receiveTokens', [
        primaryConsumable.address,
        secondaryConsumable.address,
        PLAYER1.address,
        PLAYER1.address,
        100,
      ]),
    );
  });

  it('should send tokens to a different address on other side', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);
    await primaryConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    const transactionReceipt = await (
      await primaryMediator.connect(PLAYER1).sendAndTransferTokens(primaryConsumable.address, PLAYER2.address, 100)
    ).wait();

    const passMessageEvent = findTestAMBPassMessageEvent(primaryBridge, transactionReceipt)!.args;

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(900);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(100);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);

    expect<string>(passMessageEvent.messageId).toEqual(toByte32String(1));
    expect<string>(passMessageEvent.sourceChainId).toEqual(PRIMARY_CHAIN_ID);
    expect<BigNumber>(passMessageEvent.gas).toEqBN(100000);
    expect<string>(passMessageEvent.sender).toEqual(primaryMediator.address);
    expect<string>(passMessageEvent._contract).toEqual(secondaryMediator.address);
    expect<string>(passMessageEvent.data).toEqual(
      secondaryMediator.interface.encodeFunctionData('receiveTokens', [
        primaryConsumable.address,
        secondaryConsumable.address,
        PLAYER1.address,
        PLAYER2.address,
        100,
      ]),
    );
  });

  it('should burn tokens if mintAndBurn true', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asAccessControl(secondaryConsumable).grantRole(MINTER_ROLE, secondaryMediator.address);

    await asConsumableMint(secondaryConsumable).mint(PLAYER1.address, 1000);
    await secondaryConsumable.connect(PLAYER1).approve(secondaryMediator.address, 100);

    const transactionReceipt = await (
      await secondaryMediator.connect(PLAYER1).sendAndTransferTokens(secondaryConsumable.address, PLAYER2.address, 100)
    ).wait();

    const passMessageEvent = findTestAMBPassMessageEvent(secondaryBridge, transactionReceipt)!.args;

    expect<BigNumber>(await secondaryConsumable.balanceOf(PLAYER1.address)).toEqBN(900);
    expect<BigNumber>(await secondaryConsumable.balanceOf(secondaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await secondaryConsumable.totalSupply()).toEqBN(900);

    expect<string>(passMessageEvent.messageId).toEqual(toByte32String(1));
    expect<string>(passMessageEvent.sourceChainId).toEqual(SECONDARY_CHAIN_ID);
    expect<BigNumber>(passMessageEvent.gas).toEqBN(100000);
    expect<string>(passMessageEvent.sender).toEqual(secondaryMediator.address);
    expect<string>(passMessageEvent._contract).toEqual(primaryMediator.address);
    expect<string>(passMessageEvent.data).toEqual(
      primaryMediator.interface.encodeFunctionData('receiveTokens', [
        secondaryConsumable.address,
        primaryConsumable.address,
        PLAYER1.address,
        PLAYER2.address,
        100,
      ]),
    );
  });

  it('should fail if sender did not approve enough token to send', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendAndTransferTokens(primaryConsumable.address, PLAYER2.address, 100),
    ).toBeRevertedWith('transfer amount exceeds allowance');

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });

  it('should fail if sender does not have enough token to send', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await primaryConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendTokens(primaryConsumable.address, 100),
    ).toBeRevertedWith('transfer amount exceeds balance');

    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });

  it('should fail to send unknown tokens', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(PLAYER1.address, 1000);

    const anotherConsumable = await createConsumable();
    await asConsumableMint(anotherConsumable).mint(PLAYER1.address, 1000);
    await anotherConsumable.connect(PLAYER1).approve(primaryMediator.address, 100);

    await expect<Promise<ContractTransaction>>(
      primaryMediator.connect(PLAYER1).sendAndTransferTokens(anotherConsumable.address, PLAYER2.address, 100),
    ).toBeRevertedWith('token not found');

    expect<BigNumber>(await anotherConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await anotherConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
  });
});

describe('receiveTokens', () => {
  it('should increase tokens for receiver', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(primaryMediator.address, 1000);

    await primaryBridge.executePassMessageRequest({
      messageId: toByte32String(1),
      sender: secondaryMediator.address,
      sourceChainId: SECONDARY_CHAIN_ID,
      _contract: primaryMediator.address,
      data: primaryMediator.interface.encodeFunctionData('receiveTokens', [
        secondaryConsumable.address,
        primaryConsumable.address,
        PLAYER1.address,
        PLAYER2.address,
        100,
      ]),
      gas: 100000,
    });

    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(900);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER2.address)).toEqBN(100);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);
  });

  it('should mint if mintAndBurn is true', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asAccessControl(secondaryConsumable).grantRole(MINTER_ROLE, secondaryMediator.address);

    await secondaryBridge.executePassMessageRequest({
      messageId: toByte32String(1),
      sender: primaryMediator.address,
      sourceChainId: PRIMARY_CHAIN_ID,
      _contract: secondaryMediator.address,
      data: secondaryMediator.interface.encodeFunctionData('receiveTokens', [
        primaryConsumable.address,
        secondaryConsumable.address,
        PLAYER1.address,
        PLAYER2.address,
        100,
      ]),
      gas: 100000,
    });

    expect<BigNumber>(await secondaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await secondaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await secondaryConsumable.balanceOf(PLAYER2.address)).toEqBN(100);
    expect<BigNumber>(await secondaryConsumable.totalSupply()).toEqBN(100);
  });

  it('should fail if mintAndBurn is false and not enough token to give', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await expect<Promise<ContractTransaction>>(
      primaryBridge.executePassMessageRequest({
        messageId: toByte32String(1),
        sender: secondaryMediator.address,
        sourceChainId: SECONDARY_CHAIN_ID,
        _contract: primaryMediator.address,
        data: primaryMediator.interface.encodeFunctionData('receiveTokens', [
          secondaryConsumable.address,
          primaryConsumable.address,
          PLAYER1.address,
          PLAYER2.address,
          100,
        ]),
        gas: 100000,
      }),
    ).toBeRevertedWith('transfer amount exceeds balance');

    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER2.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(0);
  });

  it('should fail if invalid bridge', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });
    const anotherBridge = await createTestBridge();

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(primaryMediator.address, 1000);

    await expect<Promise<ContractTransaction>>(
      anotherBridge.executePassMessageRequest({
        messageId: toByte32String(1),
        sender: secondaryMediator.address,
        sourceChainId: SECONDARY_CHAIN_ID,
        _contract: primaryMediator.address,
        data: primaryMediator.interface.encodeFunctionData('receiveTokens', [
          secondaryConsumable.address,
          primaryConsumable.address,
          PLAYER1.address,
          PLAYER2.address,
          100,
        ]),
        gas: 100000,
      }),
    ).toBeRevertedWith('bridge not allowed');

    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER2.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);
  });

  it('should fail if invalid sender', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(primaryMediator.address, 1000);

    await expect<Promise<ContractTransaction>>(
      primaryBridge.executePassMessageRequest({
        messageId: toByte32String(1),
        sender: PLAYER1.address,
        sourceChainId: SECONDARY_CHAIN_ID,
        _contract: primaryMediator.address,
        data: primaryMediator.interface.encodeFunctionData('receiveTokens', [
          secondaryConsumable.address,
          primaryConsumable.address,
          PLAYER1.address,
          PLAYER2.address,
          100,
        ]),
        gas: 100000,
      }),
    ).toBeRevertedWith('sender.*not allowed for chain');

    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER2.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);
  });

  it('should fail if invalid sender chain', async () => {
    const primaryBridge = await createTestBridge();
    const secondaryBridge = await createTestBridge({
      sourceChainId: SECONDARY_CHAIN_ID,
      destinationChainId: PRIMARY_CHAIN_ID,
    });

    const primaryConsumable = await createConsumable();
    const secondaryConsumable = await createConsumable();
    const { primaryMediator, secondaryMediator } = await createPrimaryAndSecondaryTokenMediators({
      primaryBridge: primaryBridge,
      primaryConsumable: primaryConsumable,
      secondaryBridge: secondaryBridge,
      secondaryConsumable: secondaryConsumable,
    });

    await asConsumableMint(primaryConsumable).mint(primaryMediator.address, 1000);

    await expect<Promise<ContractTransaction>>(
      primaryBridge.executePassMessageRequest({
        messageId: toByte32String(1),
        sender: secondaryMediator.address,
        sourceChainId: toByte32String(90101010),
        _contract: primaryMediator.address,
        data: primaryMediator.interface.encodeFunctionData('receiveTokens', [
          secondaryConsumable.address,
          primaryConsumable.address,
          PLAYER1.address,
          PLAYER2.address,
          100,
        ]),
        gas: 100000,
      }),
    ).toBeRevertedWith('sender.*not allowed for chain');

    expect<BigNumber>(await primaryConsumable.balanceOf(primaryMediator.address)).toEqBN(1000);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER1.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.balanceOf(PLAYER2.address)).toEqBN(0);
    expect<BigNumber>(await primaryConsumable.totalSupply()).toEqBN(1000);
  });
});
