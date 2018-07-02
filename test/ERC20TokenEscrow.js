const ERC20TokenEscrow = artifacts.require("./ERC20TokenEscrow.sol");
const ERC20Token = artifacts.require("./ERC20Token.sol");

const tokenFactory = () => ERC20Token.new(10000, "TEST TOKEN", 2, "TT");
const escrowFactory = (tokenAddress, ether, tokens, tradePartner, wantEther, params) => ERC20TokenEscrow.new(tokenAddress, ether, tokens, tradePartner, wantEther, params || null);

const assertEvent = (contract, filter) => {
    return new Promise((resolve, reject) => {
        const event = contract[filter.event]();
        event.watch();
        event.get((error, logs) => {
            const log = _.filter(logs, filter);
            if (log) {
                resolve(log);
            } else {
                throw Error("Failed to find filtered event for " + filter.event);
            }
        });
        event.stopWatching();
    });
};

contract('ERC20TokenEscrow - constructor', function (accounts) {

    it('creator should be msg.sender', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                assert.equal(creator, await escrow.creator());

            });

    });

    it('tradedToken should be the given _tradedToken', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                assert.equal(sampleToken.address, await escrow.tradedToken());

            });
    });

    it('tradePartner should be the given trade partner', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                assert.equal(tradePartner, await escrow.tradePartner());

            });
    });

    it('uponAgreedEther must equal to _uponAgreedEther', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                assert.equal(100, await escrow.uponAgreedEther());

            });
    });

    it('uponAgreedTokens must equal to _uponAgreedTokens', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                assert.equal(50, await escrow.uponAgreedTokens());

            });
    });

    it(`must throw if creator doesn't send enough ether`, async function () {
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 40})
            .then(async function (escrow) {

                // contract deploy should fail since the creator need to have enough ether
                assert.fail(`didn't fail to deploy contract`)

            })
            .catch(async function (e) {
                assert.equal("VM Exception while processing transaction: revert", e.message);
            })
    });

    it('must throw if creator has not enough tokens', async function () {
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {from: accounts[4]})
            .then(async function (escrow) {

                // contract deploy should fail since the creator need to have enough ether
                assert.fail(`didn't fail to deploy contract`)

            })
            .catch(async function (e) {
                assert.equal("VM Exception while processing transaction: revert", e.message);
            })
    });

    it('_uponAgreedEther && _uponAgreedTokens must be great than zero', async function () {
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return Promise.all([
            escrowFactory(sampleToken.address, 0, 0, tradePartner, false, {value: 1})
                .then(async function (escrow) {

                    // contract deploy should fail since the creator need to have enough ether
                    assert.fail(`didn't fail to deploy contract`)

                })
                .catch(function (e) {
                    // expect to revert since token & ether amount is invalid
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }),
            escrowFactory(sampleToken.address, 1, 0, tradePartner, false, {value: 1})
                .then(async function (escrow) {

                    // contract deploy should fail since the creator need to have enough ether
                    assert.fail(`didn't fail to deploy contract`)

                })
                .catch(async function (e) {
                    // expect to revert since token & ether amount is invalid
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }),
            escrowFactory(sampleToken.address, 0, 1, tradePartner, false, {value: 1})
                .then(async function (escrow) {

                    // contract deploy should fail since the creator need to have enough ether
                    assert.fail(`didn't fail to deploy contract`)

                })
                .catch(async function (e) {
                    // expect to revert since token & ether amount is invalid
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                })
        ]);

    });

    it('must send _uponAgreedEther to contract', async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        await escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                // eth balance must be 100 wei
                const escrowETHBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(`100`, escrowETHBalance);

                // token balance must be 0 since a creator can not send ether and tokens
                const escrowTokenBalance = await sampleToken.balanceOf(escrow.address);
                assert.equal(`0`, escrowTokenBalance);

            })
    });

});

// the drain function lets the creator drain the money
// form a escrow.
contract('ERC20TokenEscrow - drain', function (accounts) {

    it(`must only be callable by creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        let escrowContract = await escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100});
        await escrowContract.drain();

        // must not be callable by trade partner
        escrowContract = await escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100});
        try {
            await escrowContract.drain.call({
                from: tradePartner
            });
        } catch (e) {
            assert.equal("VM Exception while processing transaction: revert", e.message);
        }

        // must not be callable by random address
        escrowContract = await escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100});
        try {
            await escrowContract.drain.call({
                from: accounts[7]
            });
        } catch(e){
            assert.equal("VM Exception while processing transaction: revert", e.message);
        }

    });

    it(`must send ether held by contract back to creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, '1000000000000000000', 50, tradePartner, false, {value: '1000000000000000000'})
            .then(async function (escrow) {

                const oldBalanceCreator = await web3.eth.getBalance(creator);

                await escrow.drain();

                const newBalanceCreator = await web3.eth.getBalance(creator);

                // after drain the creator should have ~one ether more
                assert.isTrue(newBalanceCreator.gt(oldBalanceCreator));

                const balanceEscrow = await web3.eth.getBalance(escrow.address);
                assert.equal("0", balanceEscrow.toString())

            })
    });

    it(`must send tokens held by contract back to creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await ERC20Token.new(10000, "TEST TOKEN", 18, "TT");

        return ERC20TokenEscrow.new(sampleToken.address, 100, 50, tradePartner, true)
            .then(async function (escrow) {

                // send tokens to contract
                await sampleToken.transfer(escrow.address, 50, {
                    from: creator
                });

                // escrow balance should be 50 tokens
                const tokenBalanceEscrow = await sampleToken.balanceOf(escrow.address);
                assert.equal("50", tokenBalanceEscrow.toString());

                await escrow.drain();

                const creatorTokenBalance = await sampleToken.balanceOf(creator);

                assert.equal("10000", creatorTokenBalance.toString())

            })

    });

});

contract(`ERC20TokenEscrow - close`, function (accounts) {

    it(`close must revert when _uponAgreedEther is not in contract`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = ERC20Token.new(10000, "TEST TOKEN", 2, "TT", {
            from: tradePartner,
        });

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, true, {})
            .then(async function (escrow) {

                try {
                    await escrow.close({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                    return;
                }

                assert.fail("expected to revert");

            })

    });

    it(`close revert when _uponAgreedTokens are not in the contract`, async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                try {
                    await escrow.close({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                    return;
                }

                assert.fail("expected to revert");

            })

    });

    it(`close must transfer ether to trade partner when he sends in tokens`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        // the token sender is another address that will send in the
        const tokenSender = accounts[2];
        const sampleToken = await ERC20Token.new(10000, "TEST TOKEN", 2, "TT", {
            from: tokenSender,
        });

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false, {value: 100})
            .then(async function (escrow) {

                const oldBalanceTradePartner = await web3.eth.getBalance(tradePartner);

                await sampleToken.transfer(escrow.address, 50, {
                    from: tokenSender
                });

                let escrowEthBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(100, escrowEthBalance.toString());

                let escrowTokenBalance = await sampleToken.balanceOf(escrow.address);
                assert.equal(50, escrowTokenBalance.toString());

                await escrow.close();

                escrowEthBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(0, escrowEthBalance.toString());

                escrowTokenBalance = await sampleToken.balanceOf(escrow.address);
                assert.equal(0, escrowTokenBalance.toString());

                // creator must now have 50 tokens more
                const tokenBalanceCreator = await sampleToken.balanceOf(creator);
                assert.equal("50", tokenBalanceCreator.toString());

                // trade partner must now have 100 wei more
                const newBalanceTradePartner = await web3.eth.getBalance(tradePartner);
                assert.equal(oldBalanceTradePartner.plus(100).toString(), newBalanceTradePartner.toString())

            })

    });

    it(`must transfer tokens to trade partner when he sends in ether`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, true, {})
            .then(async function (escrow) {

                const oldCreatorEthBalance = web3.eth.getBalance(creator);

                // send in tokens to escrow
                await sampleToken.transfer(escrow.address, 50);

                // make sure contract has tokens
                const tokenBalanceContract = await sampleToken.balanceOf(escrow.address);
                assert.equal(50, tokenBalanceContract.toString());

                await escrow.close({from: tradePartner, value: 100});

                // escrow must have no ether after send call
                let b = await web3.eth.getBalance(escrow.address);
                assert.equal("0", b.toString());

                // trade partner must no have 50 tokens since he sent in the ether
                const tradePartnerBalance = await sampleToken.balanceOf(tradePartner);
                assert.equal(50, tradePartnerBalance.toString());

                // creator must now have 100 wei more
                const creatorEthBalance = await web3.eth.getBalance(creator);
                assert.equal(oldCreatorEthBalance.plus(100).toString(), creatorEthBalance.toString());

            })

    });

});
