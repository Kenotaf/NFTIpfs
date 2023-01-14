const { network, ethers } = require("hardhat");
const {
   developmentChains,
   networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const {
   storeImages,
   storeTokenUriMetadata,
} = require("../utils/uploadToPinata.js");

const FUND_AMOUNT = "1000000000000000000000";
const imagesLocation = "./images/NFTrandom/";

const metadataTemplate = {
   name: "",
   description: "",
   atrebutes: [
      {
         value: "100",
      },
   ],
};

let tokenURIs = [
   "Ipfs:// QmafnHWgEkhJC2nL51jtLP9ZKK4gE1AVZLa4vFNJzDQjYU",
   "Ipfs:// QmVbtrGUdpWBhwzVCJ5o2yrNu5D6GwjDGDcspUcnYDRqg3",
   "Ipfs:// QmVgJbbreCfQQCGtDVKUsUWg4pU9ga93eXCZH4qmtZM8Aj",
];

module.exports = async ({ getNamedAccounts, deployments }) => {
   const { deploy, log } = deployments;
   const { deployer } = await getNamedAccounts();
   const chainId = network.config.chainId;
   let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

   if (process.env.UPLOAD_TO_PINATA == "true") {
      tokenURIs = await handleTokenUris();
   }

   if (developmentChains.includes(network.name)) {
      // create VRFV2 Subscription
      vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
      vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
      console.log("Create subscription...");
      const tx = await vrfCoordinatorV2Mock.createSubscription();
      const txReceipt = await tx.wait(1);
      subscriptionId = txReceipt.events[0].args.subId;
      console.log("Fund subscription...");
      await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
   } else {
      console.log("");
      vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
      subscriptionId = networkConfig[chainId].subscriptionId;
   }

   log("----------------------------------------------------");
   await storeImages(imagesLocation);
   arguments = [
      vrfCoordinatorV2Address,
      subscriptionId,
      networkConfig[chainId]["gasLane"],
      networkConfig[chainId]["mintFee"],
      networkConfig[chainId]["callbackGasLimit"],
      tokenURIs,
   ];
   const randomIpfsNft = await deploy("RandomIpfsNft", {
      from: deployer,
      args: arguments,
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1,
   });
   log("----------------------------------------------------");

   if (chainId == 31337) {
      console.log("Adding consumer...");
      await vrfCoordinatorV2Mock.addConsumer(
         subscriptionId.toNumber(),
         randomIpfsNft.address
      );
   }
};

async function handleTokenUris() {
   //Store image in IPFS
   //Store metadatain IPFS
   tokenURIs = [];
   const { responses: imageUploadResponses, files } = await storeImages(
      imagesLocation
   );
   for (imageUploadResponseIndex in imageUploadResponses) {
      // console.log(imageUploadResponses);
      //create metadata
      //upload the metadata
      let tokenUriMetadata = { ...metadataTemplate };
      tokenUriMetadata.name = files[imageUploadResponseIndex].replace(
         ".png",
         ""
      );
      tokenUriMetadata.description = `#Dot ${imageUploadResponseIndex}`;
      tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
      console.log(`Upload ${tokenUriMetadata.name}...`);
      //
      const metadataUploadResponse = await storeTokenUriMetadata(
         tokenUriMetadata
      );
      tokenURIs.push(`Ipfs:// ${metadataUploadResponse.IpfsHash}`);
   }
   console.log("Token URIs uploaded! They are:");
   console.log(tokenURIs);
   return tokenURIs;
}

module.exports.tags = ["all", "randomipfs", "main"];
