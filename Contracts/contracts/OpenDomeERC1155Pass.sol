// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OpenDomeERC1155Pass
 * @dev Ultra-scalable ERC1155 contract for General Admission tickets and reusable passes.
 * Uses native ERC1155 fungibility to handle massive volumes.
 * - Single-Use Event Ticket: Represented by 1 token. Scanning burns 1 token.
 * - Reusable Pass (e.g., 10-use pass): Represented by N tokens. Scanning burns 1 token per use.
 */
contract OpenDomeERC1155Pass is ERC1155, AccessControl {
    bytes32 public constant SCANNER_ROLE = keccak256("SCANNER_ROLE");
    bytes32 public constant EVENT_MANAGER_ROLE = keccak256("EVENT_MANAGER_ROLE");

    enum TicketType { NONE, SINGLE_EVENT, REUSABLE_PASS }

    struct TicketSeries {
        TicketType tType;
        uint256 maxPerWallet; // 0 means unlimited
    }

    // ID => TicketSeries config
    mapping(uint256 => TicketSeries) public ticketRegistry;

    event TicketSeriesCreated(uint256 indexed id, TicketType tType, uint256 maxPerWallet);

    // Events for tracking scans at the venue level
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

    /**
     * @dev Register a new ticket series before minting.
     * Use maxPerWallet = 0 for unlimited/general admission multi-entry, or maxPerWallet = 1 for strict unique entry.
     */
    function createTicketSeries(uint256 id, TicketType tType, uint256 maxPerWallet) external onlyRole(EVENT_MANAGER_ROLE) {
        require(ticketRegistry[id].tType == TicketType.NONE, "Series already exists");
        ticketRegistry[id] = TicketSeries(tType, maxPerWallet);
        emit TicketSeriesCreated(id, tType, maxPerWallet);
    }

    /**
     * @dev Mint tickets for a specific event or pass type to a user.
     * Enforces wallet limits if set in the registry.
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyRole(EVENT_MANAGER_ROLE) {
        TicketSeries memory series = ticketRegistry[id];
        require(series.tType != TicketType.NONE, "Ticket series not registered");
        
        if (series.maxPerWallet > 0) {
            require(balanceOf(to, id) + amount <= series.maxPerWallet, "Exceeds max per wallet limit");
        }
        
        _mint(to, id, amount, data);
    }

    /**
     * @dev Batch mint multiple different ticket tiers to a single user.
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external onlyRole(EVENT_MANAGER_ROLE) {
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            TicketSeries memory series = ticketRegistry[id];
            require(series.tType != TicketType.NONE, "Ticket series not registered");
            
            if (series.maxPerWallet > 0) {
                require(balanceOf(to, id) + amounts[i] <= series.maxPerWallet, "Exceeds max per wallet limit");
            }
        }
        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev The backend bridge calls this to scan/consume tickets.
     * Because this is called by the trusted scanner (bridge), it can burn the user's ticket without requiring prior approval.
     */
    function scanPass(address account, uint256 id, uint256 amount) external onlyRole(SCANNER_ROLE) {
        uint256 balance = balanceOf(account, id);
        if (balance < amount) {
            revert("Insufficient ticket balance");
        }
        
        _burn(account, id, amount);
        emit PassesScanned(account, id, amount);
    }

    /**
     * @dev Process a massive batch of scans at the venue gate.
     * Gracefully skips users who don't have enough balance, allowing the rest of the queue to process.
     */
    function scanPassBatch(
        address[] calldata accounts, 
        uint256[] calldata ids, 
        uint256[] calldata amounts
    ) external onlyRole(SCANNER_ROLE) {
        require(accounts.length == ids.length && ids.length == amounts.length, "Length mismatch");
        
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            
            if (balanceOf(account, id) < amount) {
                // Graceful skip so one bad scan doesn't block the queue
                emit BatchScanFailed(account, id, "Insufficient Balance");
                continue;
            }
            
            _burn(account, id, amount);
            emit PassesScanned(account, id, amount);
        }
    }

    /**
     * @dev Restricts transfers to only authorized roles (Soulbound for regular users).
     * The merchant (EVENT_MANAGER_ROLE) can transfer tokens if needed (e.g., refunds, reassignments).
     * Minting (from address 0) and burning (to address 0) are allowed.
     */
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override {
        // Allow minting
        if (from == address(0)) {
            super._update(from, to, ids, values);
            return;
        }
        
        // Allow burning
        if (to == address(0)) {
            super._update(from, to, ids, values);
            return;
        }

        // Restrict normal transfers to EVENT_MANAGER_ROLE
        if (!hasRole(EVENT_MANAGER_ROLE, _msgSender())) {
            revert("Tickets are soulbound: transfers restricted to merchant");
        }

        super._update(from, to, ids, values);
    }

    /**
     * @dev Allows the admin to set a new URI for all token types.
     */
    function setURI(string memory newuri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(newuri);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
