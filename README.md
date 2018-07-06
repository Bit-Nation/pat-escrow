# pat-escrow

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> PAT Escrow contract

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contribute](#contribute)
- [License](#license)

## Install

```
```

## Usage

Look at the API how to use this contract.

You can check if this contract is ready for a `withdrawal` by checking if the token
balance is greater or equal `uponAgreedTokens`. `withdrawled` must be false as well. 

You can check if the value has been drained by checking if the balance of the contract is not equal `uponAgreedEther`
and `withdrawled` is false.

## API

__drain__
Drain will send back the tokens back to `tradePartner`
and ether back to the `creator`

__withdrawal__
Withdrawal will send the ether to the `tradePartner` and the tokens to the `creator`.

__uponAgreedEther__
The amount of ether that is needed for this escrow.

__uponAgreedTokens__
The amount of tokens agreed on for this escrow.

__creator__
The creator of this contract.

__tradePartner__
The tradePartner is the partner you are trading with.

__withdrawled__
is true after a successful withdrawl

## Maintainers

[@florianlenz](https://github.com/florianlenz)

## Contribute



Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

MIT © 2018 Bitnation
