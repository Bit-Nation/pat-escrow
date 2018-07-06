pragma solidity ^0.4.23;

contract EIP20Interface {
    /* This is a slight change to the ERC20 base standard.
    function totalSupply() constant returns (uint256 supply);
    is replaced with:
    uint256 public totalSupply;
    This automatically creates a getter function for the totalSupply.
    This is moved to the base contract since public getter functions are not
    currently recognised as an implementation of the matching abstract
    function by the compiler.
    */
    /// total amount of tokens
    uint256 public totalSupply;

    /// @param _owner The address from which the balance will be retrieved
    /// @return The balance
    function balanceOf(address _owner) public view returns (uint256 balance);

    /// @notice send `_value` token to `_to` from `msg.sender`
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transfer(address _to, uint256 _value) public returns (bool success);

    /// @notice send `_value` token to `_to` from `_from` on the condition it is approved by `_from`
    /// @param _from The address of the sender
    /// @param _to The address of the recipient
    /// @param _value The amount of token to be transferred
    /// @return Whether the transfer was successful or not
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success);

    /// @notice `msg.sender` approves `_spender` to spend `_value` tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @param _value The amount of tokens to be approved for transfer
    /// @return Whether the approval was successful or not
    function approve(address _spender, uint256 _value) public returns (bool success);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view returns (uint256 remaining);

    // solhint-disable-next-line no-simple-event-func-name
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
}

contract ERC20TokenEscrow {

    EIP20Interface public tradedToken;
    uint256 public uponAgreedEther;
    uint256 public uponAgreedTokens;
    address public creator;
    address public tradePartner;
    bool    public withdrawled;

    constructor(EIP20Interface _tradedToken, uint256 _uponAgreedEther, uint256 _uponAgreedTokens, address _tradePartner) payable public {

        require(_uponAgreedEther > 0);
        require(_uponAgreedTokens > 0);

        // make sure sender send enouth ether if we want to buy tokens
        require(msg.value == _uponAgreedEther);

        // state initialisation
        tradedToken = _tradedToken;
        uponAgreedEther = _uponAgreedEther;
        uponAgreedTokens = _uponAgreedTokens;
        creator = msg.sender;
        tradePartner = _tradePartner;
        withdrawled = false;

    }

    modifier onlyTrader() {
        require(msg.sender == creator || msg.sender == tradePartner);
        _;
    }

    function drain() onlyTrader public {
        // send tokens back to trade partner
        require(tradedToken.transfer(tradePartner, tradedToken.balanceOf(this)));
        // send ether back to creator
        creator.transfer(address(this).balance);
    }

    function withdrawal() public {

        require(address(this).balance == uponAgreedEther);
        require(tradedToken.balanceOf(address(this)) >= uponAgreedTokens);

        // send ether to trade partner
        tradePartner.transfer(address(this).balance);
        // send tokens to creator partner
        require(tradedToken.transfer(creator, tradedToken.balanceOf(this)));

        withdrawled = true;
    }

}
