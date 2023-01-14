const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const {
   developmentChains,
   networkConfig,
} = require("../helper-hardhat-config");
!developmentChains.includes(network.name)
   ? describe.skip
   : describe("Random IPFS NFT", function () {
        let RandomIpfsNft,
           vrfCoordinatorV2Mock,
           randomIpfsNft,
           mintFee,
           deployer;

        beforeEach(async () => {
           accounts = await ethers.getSigners(); // could also do with getNamedAccounts
           deployer = accounts[0];

           await deployments.fixture(["all", "mocks"]); // Deploys modules with the tags "mocks" and "raffle"
           vrfCoordinatorV2Mock = await ethers.getContract(
              "VRFCoordinatorV2Mock"
           );
           randomIpfsNft = await ethers.getContract("RandomIpfsNft"); // Returns a new connection to the Raffle contract
        });

        describe("Constructor", function () {
           it("Initializes vrfCoordinatorV2 correctly", async () => {
              const vrfCoordinatorV2 = await randomIpfsNft.getVrfCoordinator();
              assert.equal(
                 vrfCoordinatorV2,
                 networkConfig[network.config.chainId]["vrfCoordinatorV2"]
              );
           });
           //   it("Initializes SubscriptionId correctly", async () => {
           //      const SubscriptionId = await randomIpfsNft
           //         .getSubscriptionId()
           //         .toString();
           //      assert.equal(
           //         SubscriptionId,
           //         networkConfig[network.config.chainId]["subscriptionId"]
           //      );
           //   });
           it("Initializes GasLane correctly", async () => {
              const gasLane = await randomIpfsNft.getGasLane();
              assert.equal(
                 gasLane,
                 networkConfig[network.config.chainId]["gasLane"]
              );
           });
           it("Initializes MintFee correctly", async () => {
              mintFee = await randomIpfsNft.getMintFee();
              assert.equal(
                 mintFee,
                 networkConfig[network.config.chainId]["mintFee"]
              );
           });
           it("Initializes CallbackGasLimit correctly", async () => {
              const callbackGasLimit =
                 await randomIpfsNft.getCallbackGasLimit();
              assert.equal(
                 callbackGasLimit,
                 networkConfig[network.config.chainId]["callbackGasLimit"]
              );
           });
           //   it("Initializes TokenCounter correctly", async () => {
           //      const tokenCounter = await randomIpfsNft.getTokenCounter();
           //      assert.equal(tokenCounter, "0");
           //   });
        });
        describe("Request NFT", function () {
           it("Fails if payment isn't sent with the request", async function () {
              await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                 "RandomIpfsNft__NeedMoreETHSent"
              );
           });
           it("Reverts if payment amount is less than the mint fee", async function () {
              const fee = await randomIpfsNft.getMintFee();
              await expect(
                 randomIpfsNft.requestNft({
                    value: fee.sub(ethers.utils.parseEther("0.001")),
                 })
              ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent");
           });
           it("Emits an event after random request", async function () {
              const fee = await randomIpfsNft.getMintFee();
              await expect(
                 randomIpfsNft.requestNft({ value: fee.toString() })
              ).to.emit(randomIpfsNft, "NftRequested");
           });
        });
        describe("FulfillRandomWords", function () {
           it("Set tokenURIs", async function () {
              await new Promise(async (resolve, reject) => {
                 randomIpfsNft.once("NftMinted", async () => {
                    try {
                       const tokenUri = await randomIpfsNft.tokenURI("0");

                       assert.equal(
                          tokenUri.toString().includes("Ipfs://"),
                          true
                       );
                       resolve();
                    } catch (e) {
                       console.log(e);
                       reject(e);
                    }
                 });
              });
           });
           it("Update tokenCounter", async function () {
              await new Promise(async (resolve, reject) => {
                 randomIpfsNft.once("NftMinted", async () => {
                    try {
                       const tokenCounter =
                          await randomIpfsNft.getTokenCounter();

                       assert.equal(tokenCounter.toString(), "1");
                       resolve();
                    } catch (e) {
                       console.log(e);
                       reject(e);
                    }
                 });
              });
           });
        });
        describe("GetProbability", function () {
           it("Returns Dot 1 if Probability < 10", async () => {
              const value = await randomIpfsNft.getProbability(5);
              assert.equal(value, 0);
           });
           it("Returns Dot 2 if Probability 10 < x < 40", async () => {
              const value = await randomIpfsNft.getProbability(39);
              assert.equal(value, 1);
           });
           it("Returns Dot 3 if Probability 40 < x < 100", async () => {
              const value = await randomIpfsNft.getProbability(41);
              assert.equal(value, 2);
           });
           it("Reverts when out of range", async () => {
              await expect(
                 randomIpfsNft.getProbability(101)
              ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds");
           });
        });
     });
