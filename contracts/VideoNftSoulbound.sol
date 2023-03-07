// conracts/VideoNftSoulbound.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

error VideoNftSoulbound__NoTransferAllowed();

contract VideoNftSoulbound is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("VideoSBT", "VSBT") {}

    function mintNft() public {
        _safeMint(msg.sender, _tokenIdCounter.current());
        _tokenIdCounter.increment();
    }

    function approve(address to, uint256 tokenId) public virtual override {
        revert VideoNftSoulbound__NoTransferAllowed();
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert VideoNftSoulbound__NoTransferAllowed();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        revert VideoNftSoulbound__NoTransferAllowed();
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override {
        revert VideoNftSoulbound__NoTransferAllowed();
    }
}
