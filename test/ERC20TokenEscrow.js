const ERC20TokenEscrow = artifacts.require("./ERC20TokenEscrow.sol");
const ERC20Token = artifacts.require("./ERC20Token.sol");

const tokenFactory = () => ERC20Token.new(10000, "TEST TOKEN", 2, "TT");
const escrowFactory = (tokenAddress, ether, tokens, tradePartner, wantEther) => ERC20TokenEscrow.new(sampleToken.address, 100, 0, tradePartner, wantEther);

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

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                assert.equal(creator, escrow.creator);

            });

    });

    it('tradedToken should be the given _tradedToken', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                assert.equal(sampleToken.address, escrow.tradedToken);

            });
    });

    it('tradePartner should be the given trade partner', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                assert.equal(tradePartner, escrow.tradePartner);

            });
    });

    it('uponAgreedEther must equal to _uponAgreedEther', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                assert.equal(100, escrow.uponAgreedEther);

            });
    });

    it('uponAgreedTokens must equal to _uponAgreedTokens', async function () {
        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                assert.equal(50, escrow.uponAgreedTokens);

            });
    });

    it(`must throw if creator has not enough ether`, async function () {
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
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

        return ERC20TokenEscrow.new(sampleToken.address, 100, 50, tradePartner, false, {from: accounts[4]})
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

        await escrowFactory(sampleToken.address, 0, 0, tradePartner, false)
            .then(async function (escrow) {

                // contract deploy should fail since the creator need to have enough ether
                assert.fail(`didn't fail to deploy contract`)

            })
            .catch(async function (e) {
                // expect to revert since token & ether amount is invalid
                assert.equal("VM Exception while processing transaction: revert", e.message);
            });

        await escrowFactory(sampleToken.address, 1, 0, tradePartner, false)
            .then(async function (escrow) {

                // contract deploy should fail since the creator need to have enough ether
                assert.fail(`didn't fail to deploy contract`)

            })
            .catch(async function (e) {
                // expect to revert since token & ether amount is invalid
                assert.equal("VM Exception while processing transaction: revert", e.message);
            });

        await escrowFactory(sampleToken.address, 0, 1, tradePartner, false)
            .then(async function (escrow) {

                // contract deploy should fail since the creator need to have enough ether
                assert.fail(`didn't fail to deploy contract`)

            })
            .catch(async function (e) {
                // expect to revert since token & ether amount is invalid
                assert.equal("VM Exception while processing transaction: revert", e.message);
            });

    });

    it('must send _uponAgreedEther to contract', async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        await escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                // eth balance must be 100 wei
                const escrowETHBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(`100`, escrowETHBalance);

                // token balance must be 0 since a creator can not send ether and tokens
                const escrowTokenBalance = await sampleToken.balance(escrow.address);
                assert.equal(`0`, escrowTokenBalance);

            })
    });

    it(`must send _uponAgreedTokens to contract`, async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        // make sure creator has tokens
        let creatorTokenBalance = await sampleToken.balance(accounts[0]);
        assert.equal(`100000`, creatorTokenBalance);

        await escrowFactory(sampleToken.address, 100, 50, tradePartner, true)
            .then(async function (escrow) {

                // make sure escrow has no ether since we should send in tokens
                // and creator can't send tokens & ether
                const escrowBalance = await web3.eth.getBalance(escrow.address);
                assert.equal(`0`, escrowBalance);

                // token balance must be 50 since the creator send in tokens
                const escrowTokenBalance = await sampleToken.balance(escrow.address);
                assert.equal(`50`, escrowTokenBalance);

            })

    })

});

// the drain function lets the creator drain the money
// form a escrow.
contract('ERC20TokenEscrow - drain', function (accounts) {

    it(`must only be callable by creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        await escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                await escrow.drain();

            });

        // must not be callable by trade partner
        await escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {
                return escrow.drain.call({
                    from: tradePartner
                });
            })
            .then((e) => {
                assert.equal("VM Exception while processing transaction: revert", e.message);
            });

        // must not be callable by random address
        await escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {
                return escrow.drain.call({
                    from: accounts[7]
                });
            })
            .then((e) => {
                assert.equal("VM Exception while processing transaction: revert", e.message);
            })

    });

    it(`must send ether held by contract back to creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, true)
            .then(async function (escrow) {

                const oldBalanceCreator = await web3.eth.getBalance(creator);

                await escrow.drain();

                const newBalanceCreator = await web3.eth.getBalance(creator);

                assert.true(oldBalanceCreator.add(100).equal(newBalanceCreator))

            })
            .then((error) => {
                assert.fail(error.message)
            });
    });

    it(`must send tokens held by contract back to creator`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                const oldBalanceCreator = await sampleToken.balance(creator);

                await escrow.drain();

                const newBalanceCreator = await web3.eth.getBalance(creator);

                assert.true(oldBalanceCreator.add(50).equal(newBalanceCreator))

            })

    });

});

contract(`ERC20TokenEscrow - send`, function (accounts) {

    it(`must revert when _uponAgreedEther is not in contract`, async function () {

        const creator = accounts[0];
        const tradePartner = accounts[1];

        const sampleToken = ERC20Token.new(10000, "TEST TOKEN", 2, "TT", {
            from: tradePartner,
        });

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, true)
            .then(async function (escrow) {

                // pull ether out of contract -> this will cause send to revert
                await escrow.drain();

                try {
                    await escrow.send.call({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }

            })

    });

    it(`must revert when _uponAgreedTokens are not in the contract`, async function () {

        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                // pull tokens out of contract
                await escrow.drain();

                try {
                    await escrow.send.call({from: tradePartner})
                } catch (e) {
                    assert.equal("VM Exception while processing transaction: revert", e.message);
                }

            })

    });

    it(`must transfer ether to trade partner when he sends in tokens`, async function () {

        const creator = [0];
        const tradePartner = accounts[1];

        // the token sender is another address that will send in the
        const tokenSender = accounts[2];
        const sampleToken = ERC20Token.new(10000, "TEST TOKEN", 2, "TT", {
            from: tokenSender,
        });

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, false)
            .then(async function (escrow) {

                const oldBalanceTradePartner = await web3.eth.getBalance(tradePartner);

                await escrow.send.call({from: tokenSender});

                // should have no ether after send call
                assert.equal(0, await web3.eth.getBalance(escrow.address));

                // creator must now have 50 tokens more
                const tokenBalanceCreator = await sampleToken.balance(creator);
                assert.equal(50, tokenBalanceCreator.toString());

                // creator must now have 100 tokens more
                const newBalanceTradePartner = await web3.eth.getBalance(tradePartner);
                assert.equal(oldBalanceTradePartner.add(100).toString(), newBalanceTradePartner.toString())

            })

    });

    it(`must transfer tokens to trade partner when he sends in ether`, async function () {

        const creator = [0];
        const tradePartner = accounts[1];

        const sampleToken = await tokenFactory();

        return escrowFactory(sampleToken.address, 100, 50, tradePartner, true)
            .then(async function (escrow) {

                // make sure contract has tokens
                const tokenBalanceContract = await sampleToken.balance(escrow.address);
                assert.equal(50, tokenBalanceContract.toString());

                await escrow.send.call({from: tradePartner});

                // escrow must have no ether after send call
                assert.equal(0, await web3.eth.getBalance(escrow.address));

                // creator must now have 100 wei more
                const tokenBalanceCreator = await sampleToken.balance(creator);
                assert.equal(50, tokenBalanceCreator.toString());

                // trade partner must no have 50 tokens since he sent in the ether
                const tradePartnerBalance = await sampleToken.balance(creator);
                assert.equal(50, tradePartnerBalance.toString());

            })

    });

});
