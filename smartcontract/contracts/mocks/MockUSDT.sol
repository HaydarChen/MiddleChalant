// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @notice A mock USDT token for testing purposes
 */
contract MockUSDT is ERC20 {
    uint8 private _decimals;

    constructor() ERC20("Mock USDT", "USDT") {
        _decimals = 6; // USDT uses 6 decimals
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
