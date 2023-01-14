// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "hardhat/console.sol";

error RandomIpfsNft__AlreadyInitialized();
error RandomIpfsNft__NeedMoreETHSent();
error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__TransferFailed();

contract RandomIpfsNft is ERC721URIStorage, VRFConsumerBaseV2, Ownable {
   // Types
   enum Dots {
      DOT1,
      DOT2,
      DOT3
   }

   // Chainlink VRF Variables
   VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
   uint64 private immutable i_subscriptionId;
   bytes32 private immutable i_gasLane;
   uint32 private immutable i_callbackGasLimit;
   uint16 private constant REQUEST_CONFIRMATIONS = 3;
   uint32 private constant NUM_WORDS = 1;

   // NFT Variables
   uint256 private immutable i_mintFee;
   uint256 private s_tokenCounter;
   uint256 internal constant MAX_CHANCE_VALUE = 100;
   string[] internal s_NFT_TokenUris;
   bool private s_initialized;

   // VRF Helpers
   mapping(uint256 => address) public s_requestIdToSender;

   // Events
   event NftRequested(uint256 indexed requestId, address requester);
   event NftMinted(Dots dot, address minter);

   constructor(
      address vrfCoordinatorV2,
      uint64 subscriptionId,
      bytes32 gasLane, // keyHash
      uint256 mintFee,
      uint32 callbackGasLimit,
      string[3] memory TokenUris
   ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
      i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
      i_subscriptionId = subscriptionId;
      i_gasLane = gasLane;
      i_mintFee = mintFee;
      i_callbackGasLimit = callbackGasLimit;
      _initializeContract(TokenUris);
      s_tokenCounter = 0;
   }

   function requestNft() public payable returns (uint256 requestId) {
      if (msg.value < i_mintFee) {
         revert RandomIpfsNft__NeedMoreETHSent();
      }
      requestId = i_vrfCoordinator.requestRandomWords(
         i_gasLane,
         i_subscriptionId,
         REQUEST_CONFIRMATIONS,
         i_callbackGasLimit,
         NUM_WORDS
      );

      s_requestIdToSender[requestId] = msg.sender;
      emit NftRequested(requestId, msg.sender);
   }

   function fulfillRandomWords(
      uint256 requestId,
      uint256[] memory randomWords
   ) internal override {
      address NFTOwner = s_requestIdToSender[requestId];
      uint256 newItemId = s_tokenCounter;
      s_tokenCounter = s_tokenCounter + 1;
      uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
      Dots NFTdots = getProbability(moddedRng);
      _safeMint(NFTOwner, newItemId);
      _setTokenURI(newItemId, s_NFT_TokenUris[uint256(NFTdots)]);
      emit NftMinted(NFTdots, NFTOwner);
   }

   function getChanceArray() public pure returns (uint256[3] memory) {
      return [10, 40, MAX_CHANCE_VALUE];
   }

   function _initializeContract(string[3] memory dotTokenUris) private {
      if (s_initialized) {
         revert RandomIpfsNft__AlreadyInitialized();
      }
      s_NFT_TokenUris = dotTokenUris;
      s_initialized = true;
   }

   function getProbability(uint256 moddedRng) public pure returns (Dots) {
      uint256 cumulativeSum = 0;
      uint256[3] memory chanceArray = getChanceArray();
      for (uint256 i = 0; i < chanceArray.length; i++) {
         if (moddedRng >= cumulativeSum && moddedRng <= chanceArray[i]) {
            return Dots(i);
         }
         cumulativeSum = chanceArray[i];
      }
      revert RandomIpfsNft__RangeOutOfBounds();
   }

   function withdraw() public onlyOwner {
      uint256 amount = address(this).balance;
      (bool success, ) = payable(msg.sender).call{value: amount}("");
      if (!success) {
         revert RandomIpfsNft__TransferFailed();
      }
   }

   function getMintFees() public view returns (uint256) {
      return i_mintFee;
   }

   function getInitialized() public view returns (bool) {
      return s_initialized;
   }

   function getVrfCoordinator()
      public
      view
      returns (VRFCoordinatorV2Interface)
   {
      return i_vrfCoordinator;
   }

   function getSubscriptionId() public view returns (uint256) {
      return i_subscriptionId;
   }

   function getGasLane() public view returns (bytes32) {
      return i_gasLane;
   }

   function getMintFee() public view returns (uint256) {
      return i_mintFee;
   }

   function getCallbackGasLimit() public view returns (uint32) {
      return i_callbackGasLimit;
   }

   function getTokenCounter() public view returns (uint256) {
      return s_tokenCounter;
   }

   function getNFTOwner(uint256 index) public view returns (address) {
      return s_requestIdToSender[index];
   }
}
