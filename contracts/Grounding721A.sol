// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Grounding721A__CurrentlyGrounding();
error Grounding721A__NotApprovedOrOwner();
error Grounding721A__GroundingClosed();
error Grounding721A__NotGrounded();

contract Grounding721A is ERC721A, Ownable {
  /////////////////////
  // State Variables //
  /////////////////////

  /**
   * @dev TESTING ONLY - remove before incorporating into an actual contract
   */
  uint256 private s_tokenCounter = 0;

  /**
   * @dev tokenId to grounding start time (0 = not grounding)
   */
  mapping(uint256 => uint256) private s_groundingStarted;

  /**
   * @dev Cumulative per-token grounding, excluding the current period
   */
  mapping(uint256 => uint256) private s_groundingTotal;

  /**
   * @dev MUST only be modified by safeTransferWhileGrounding(); if set
   * to 2 then the _beforeTokenTransfer() block while grounding is disabled.
   */
  uint256 private s_groundingTransfer = 1;

  /**
   * @notice Whether grounding is currently allowed.
   * @dev If false, grounding is blocked but ungrounding is always allowed.
   */
  bool public s_groundingOpen = false;

  /////////////////////
  // Events          //
  /////////////////////

  /**
   * @dev Emitted when a SpiritualBeing begins grounding.
   */
  event Grounded(uint256 indexed tokenId);

  /**
   * @dev Emitted when a SpiritualBeing stops grounding; either through
   * normal means or by expulsion.
   */
  event Ungrounded(uint256 indexed tokenId);

  /**
   * @dev Emitted when a SpiritualBeing is expelled from grounding.
   */
  event Expelled(uint256 indexed tokenId);

  /////////////////////
  // Modifiers       //
  /////////////////////

  /**
   * @notice Requires that msg.sender owns or is approved for the token.
   */
  modifier onlyApprovedOrOwner(uint256 tokenId) {
    if (
      _ownershipOf(tokenId).addr != msg.sender ||
      getApproved(tokenId) != msg.sender
    ) {
      revert Grounding721A__NotApprovedOrOwner();
    }
    _;
  }

  ////////////////////
  // Main Functions //
  ////////////////////

  /**
   * @dev TESTING ONLY - change as necessary
   */
  constructor(string memory name, string memory symbol) ERC721A(name, symbol) {}

  /**
   * @dev TESTING ONLY - remove before incorporating into an actual contract
   */
  function mintNft(uint256 quantity) external {
    _safeMint(msg.sender, quantity);
  }

  /**
   * @notice Toggles the 'groundingOpen' flag.
   */
  function setGroundingOpen(bool isOpen) external onlyOwner {
    s_groundingOpen = isOpen;
  }

  /**
   * @notice Transfer a token between addresses while the Spiritual
   * Being is grounding, thus not resetting the grouding period.
   */
  function safeTransferWhileGrounding(
    address from,
    address to,
    uint256 tokenId
  ) external onlyApprovedOrOwner(tokenId) {
    s_groundingTransfer = 2;
    safeTransferFrom(from, to, tokenId);
    s_groundingTransfer = 1;
  }

  /**
   * @dev Block transfers while grounding.
   */
  function _beforeTokenTransfers(
    address,
    address,
    uint256 startTokenId,
    uint256 quantity
  ) internal view override {
    uint256 tokenId = startTokenId;
    for (uint256 end = tokenId + quantity; tokenId < end; tokenId++) {
      if (!(s_groundingStarted[tokenId] == 0 || s_groundingTransfer == 2)) {
        revert Grounding721A__CurrentlyGrounding();
      }
    }
  }

  /**
   * @notice Changes the SpiritualBeing's grounding status.
   */
  function toggleGrounding(uint256 tokenId)
    internal
    onlyApprovedOrOwner(tokenId)
  {
    uint256 start = s_groundingStarted[tokenId];
    if (start == 0) {
      if (!s_groundingOpen) {
        revert Grounding721A__GroundingClosed();
      }
      s_groundingStarted[tokenId] = block.timestamp;
      emit Grounded(tokenId);
    } else {
      s_groundingTotal[tokenId] += block.timestamp - start;
      s_groundingStarted[tokenId] = 0;
      emit Ungrounded(tokenId);
    }
  }

  /**
   * @notice Changes the grounding status of one or more SpiritualBeing(s)
   */
  function toggleGrounding(uint256[] calldata tokenIds) external {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      toggleGrounding(tokenIds[i]);
    }
  }

  /**
   * @notice Admin/owner-only ability to expel a SpirtualBeing from grounding.
   * @dev As most sales listings use off-chain signatures, it's impossible
   * to detect someone who has grounded and then deliberately undercuts
   * the floor price in the knowledge that the sale can't proceed. This
   * function allows for monitoring of such practices and expulsion if
   * abuse is detected, allowing the undercutting SpiritualBeing to be
   * sold on the open market. Since OpenSea uses isApprovedForAll() in
   * its pre-listing checks, we can't block by that means becaue grounding
   * would then be all-or-nothing for all of a particular owner's
   * SpiritualBeings.
   */
  function expelFromGrounding(uint256 tokenId) external onlyOwner {
    if (s_groundingStarted[tokenId] == 0) {
      revert Grounding721A__NotGrounded();
    }
    s_groundingTotal[tokenId] += block.timestamp - s_groundingStarted[tokenId];
    s_groundingStarted[tokenId] = 0;
    emit Ungrounded(tokenId);
    emit Expelled(tokenId);
  }

  //////////////////////
  // Getter Functions //
  //////////////////////

  /**
   * @notice Returns the length of time (in seconds) that the Spiritual
   * Being has grounded.
   * @dev Grounding is tied to a specific SpirtualBeing, not to the
   * owner, so it doesn't reset upon sale
   * @return grounding Whether the SpiritualBeing is currently grounding.
   * May be true with zero current grounding if in the same black as
   * grounding began.
   * @return current Zero if not currently grounding, otherwise the length
   * of time since the most recent grounding began.
   * @return total Total period of time that the SpiritualBeing has grounded
   * across its life, including the current period.
   */
  function getGroundingPeriod(uint256 tokenId)
    external
    view
    returns (
      bool grounding,
      uint256 current,
      uint256 total
    )
  {
    uint256 start = s_groundingStarted[tokenId];
    if (start != 0) {
      grounding = true;
      current = block.timestamp - start;
    }
    total = current + s_groundingTotal[tokenId];
  }
}
