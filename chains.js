export const CHAINS = {
  97: {
    name: "BNB Testnet",
    nativeSymbol: "BNB",
    rpcUrls: [
      "https://bsc-testnet.drpc.org",
      "https://rpc.ankr.com/bsc_testnet_chapel",
      "https://bsc-testnet-rpc.publicnode.com",
      "https://bsc-testnet-dataseed1.binance.org",
      "https://bsc-testnet.bnbchain.org",
    ],
    factory: "0xbc389c697272B375FbE0f6917D3B4327391a74ec",
    usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
    usdc: "0x64544969ed7EBf5f083679233325356EbE738930",
    explorerAddr: (a) => `https://testnet.bscscan.com/address/${a}`,
    explorerTx: (h) => `https://testnet.bscscan.com/tx/${h}`,
    oracleMode: "SAFE",
  },

  84532: {
    name: "Base Sepolia",
    nativeSymbol: "ETH",
    rpcUrls: [
      "https://sepolia.base.org",
      "https://base-sepolia.publicnode.com",
      "https://rpc.ankr.com/base_sepolia",
    ],
    factory: "0xf4cf3C25F45Aa66cD7130a98788c907d44855761",
    usdt: "0xa08C5B0A5F8Daf0E5231cC7EbEF4fD3A65C3D2C5",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorerAddr: (a) => `https://base-sepolia.blockscout.com/address/${a}`,
    explorerTx: (h) => `https://base-sepolia.blockscout.com/tx/${h}`,
    oracleMode: "UMA",
    umaOoV3Address: "0x0F7fC5E6482f096380db6158f978167b57388deE",
  },
};
