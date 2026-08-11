// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OpenDomeERC1155Pass
 * @dev Minimal ERC-1155 pass contract.
 * Business rules (who gets what, quotas, ticket IDs) live in the Admin App.
 * On-chain we only enforce roles:
 *   - EVENT_MANAGER (merchant): mint / transfer
 *   - SCANNER: burn on entry
 * Tokens are soulbound for end users.
 */
contract OpenDomeERC1155Pass is ERC1155, AccessControl {
    bytes32 public constant SCANNER_ROLE = keccak256("SCANNER_ROLE");
    bytes32 public constant EVENT_MANAGER_ROLE = keccak256("EVENT_MANAGER_ROLE");

    event PassesScanned(address indexed account, uint256 indexed id, uint256 amount);
    event BatchScanFailed(address indexed account, uint256 indexed id, string reason);

    constructor(
        string memory uri,
        address defaultAdmin,
        address initialScanner
    ) ERC1155(uri) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(EVENT_MANAGER_ROLE, defaultAdmin);
        _grantRole(SCANNER_ROLE, initialScanner);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyRole(EVENT_MANAGER_ROLE) {
        _mint(to, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(EVENT_MANAGER_ROLE) {
        _mintBatch(to, ids, amounts, data);
    }

    function scanPass(
        address account,
        uint256 id,
        uint256 amount
    ) external {
        require(
            hasRole(SCANNER_ROLE, _msgSender()) || hasRole(EVENT_MANAGER_ROLE, _msgSender()),
            "Not scanner or merchant"
        );
        require(balanceOf(account, id) >= amount, "Insufficient ticket balance");
        _burn(account, id, amount);
        emit PassesScanned(account, id, amount);
    }

    function scanPassBatch(
        address[] calldata accounts,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(
            hasRole(SCANNER_ROLE, _msgSender()) || hasRole(EVENT_MANAGER_ROLE, _msgSender()),
            "Not scanner or merchant"
        );
        require(
            accounts.length == ids.length && ids.length == amounts.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < accounts.length; i++) {
            if (balanceOf(accounts[i], ids[i]) < amounts[i]) {
                emit BatchScanFailed(accounts[i], ids[i], "Insufficient Balance");
                continue;
            }
            _burn(accounts[i], ids[i], amounts[i]);
            emit PassesScanned(accounts[i], ids[i], amounts[i]);
        }
    }

    /// @dev Soulbound for users — only merchant can reassign.
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, ids, values);
            return;
        }
        if (!hasRole(EVENT_MANAGER_ROLE, _msgSender())) {
            revert("Tickets are soulbound: transfers restricted to merchant");
        }
        super._update(from, to, ids, values);
    }

    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
