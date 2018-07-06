const ERC20TokenEscrow = artifacts.require("./ERC20TokenEscrow.sol");
const ERC20Token = artifacts.require("./ERC20Token.sol");

const tokenFactory = () => ERC20Token.new(10000, "TEST TOKEN", 2, "TT");
const escrowFactory = (tokenAddress, ether, tokens, tradePartner, params) => ERC20TokenEscrow.new(tokenAddress, ether, tokens, tradePartner, params || null);

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

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                assert.equal(creator, await escrow.creator());

            });

    });

    it('tradedToken should be the given _tradedToken', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                assert.equal(sampleToken.address, await escrow.tradedToken());

            });
    });

    it('tradePartner should be the given trade partner', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                assert.equal(tradePartner, await escrow.tradePartner());

            });
    });

    it('uponAgreedEther must equal to _uponAgreedEther', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                assert.equal(100, await escrow.uponAgreedEther());

            });
    });

    it('uponAgreedTokens must equal to _uponAgreedTokens', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                assert.equal(50, await escrow.uponAgreedTokens());

            });
    });

    it(`must throw if creator doesn't send enough ether`, async function () {
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 40})
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
            escrowFactory(sampleToken.address, 0, 0, tradePartner, {value: 1})
                .then(async function (escrow) {

                    // contract deploy should fail since the creator need to have enough ether
                    assert.fail(`didn't fail to deploy contract`)

                })
                .catch(function (e) {
                    // expect to revert since token & ether amount is invalid
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }),
            escrowFactory(sampleToken.address, 1, 0, tradePartner, {value: 1})
                .then(async function (escrow) {

                    // contract deploy should fail since the creator need to have enough ether
                    assert.fail(`didn't fail to deploy contract`)

                })
                .catch(async function (e) {
                    // expect to revert since token & ether amount is invalid
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }),
            escrowFactory(sampleToken.address, 0, 1, tradePartner, {value: 1})
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

        await escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
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

    it(`must send values back to sender`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, '1000000000000000000', 50, tradePartner, {value: '1000000000000000000'})
            .then(async function (escrow) {

                // send tokens to escrow
                await sampleToken.transfer(escrow.address, '333');

                // make sure escrow has tokens
                assert.equal('333', await sampleToken.balanceOf(escrow.address));

                const oldBalanceCreator = await web3.eth.getBalance(creator);

                await escrow.drain();

                const newBalanceCreator = await web3.eth.getBalance(creator);

                // after drain the creator should have ~one ether more
                assert.isTrue(newBalanceCreator.gt(oldBalanceCreator));

                // after drain the trade parter should have his tokens back
                const b = await sampleToken.balanceOf(tradePartner);
                assert.equal('333', b.toString());

                // make sure that there is nothing left in escrow contract
                const balanceEscrow = await web3.eth.getBalance(escrow.address);
                assert.equal("0", balanceEscrow.toString());
                assert.equal('0', await sampleToken.balanceOf(escrow.address));

            })
    })

});

contract(`ERC20TokenEscrow - withdrawal`, function (accounts) {

    it(`withdrawal must revert when _uponAgreedEther is not in contract`, async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                // pull ether out of contract
                await escrow.drain();

                try {
                    await escrow.withdrawal({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                    return;
                }

                assert.fail("expected to revert");

            })

    });

    it(`withdrawal must revert when _uponAgreedTokens are not in the contract`, async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                try {
                    await escrow.withdrawal({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                    return;
                }

                assert.fail("expected to revert");

            })

    });

    it(`withdrawal must release ether to tradePartner and tokens to creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        // the token sender is another address that will send in the
        const tokenSender = accounts[2];
        const sampleToken = await ERC20Token.new(10000, "TEST TOKEN", 2, "TT", {
            from: tokenSender,
        });

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, {value: 100})
            .then(async function (escrow) {

                const oldBalanceTradePartner = await web3.eth.getBalance(tradePartner);

                await sampleToken.transfer(escrow.address, 50, {
                    from: tokenSender
                });

                let escrowEthBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(100, escrowEthBalance.toString());

                let escrowTokenBalance = await sampleToken.balanceOf(escrow.address);
                assert.equal(50, escrowTokenBalance.toString());

                await escrow.withdrawal();

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

});
