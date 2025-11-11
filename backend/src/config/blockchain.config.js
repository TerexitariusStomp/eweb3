import { ethers } from 'ethers';
import ABI from './abi.js';

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x14535b85961E906B954fD436da454102F003Ea12';
const checksummedAddress = ethers.getAddress(CONTRACT_ADDRESS);

export const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org');
export const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '0xf03a4b02903a818de70014dc8b3358b8c780b1a600c61d0cf8f3f1d79074676e', provider);
export const contract = new ethers.Contract(checksummedAddress, ABI, wallet);

export const blockchainConfig = {
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  contractAddress: checksummedAddress,
  chainId: parseInt(process.env.CHAIN_ID) || 84532,
  explorerUrl: process.env.EXPLORER_URL || 'https://sepolia.basescan.org',
  basescanApiKey: process.env.BASESCAN_API_KEY || '',
  confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS) || 1,
  gasBufferPercent: parseInt(process.env.GAS_BUFFER_PERCENT) || 20
};

/**
 * Estimate gas for a contract method with buffer
 * Note: For struct methods like recordTransaction, args should be the object (no spread)
 * For simple methods, args should be array of parameters
 */
export async function estimateGasWithBuffer(method, args) {
  try {
    let gasEstimate;
    if (Array.isArray(args)) {
      gasEstimate = await contract[method].estimateGas(...args);
    } else {
      // Single parameter (struct/object)
      gasEstimate = await contract[method].estimateGas(args);
    }
    const buffer = (gasEstimate * BigInt(blockchainConfig.gasBufferPercent)) / 100n;
    return gasEstimate + buffer;
  } catch (error) {
    // Fallback to a safe gas limit if estimation fails
    console.warn(`Gas estimation failed for ${method}: ${error.message}. Using fallback gas limit.`);
    return 500000n; // Conservative fallback
  }
}

/**
 * Check if wallet has sufficient balance for gas
 */
export async function hasSufficientBalance(gasEstimate) {
  try {
    const balance = await provider.getBalance(wallet.address);
    const gasPrice = await provider.getFeeData();
    const gasCost = gasEstimate * BigInt(gasPrice.gasPrice || 20000000000n); // 20 gwei fallback
    return balance >= gasCost;
  } catch (error) {
    console.error('Failed to check balance:', error.message);
    return false;
  }
}

/**
 * Verify contract deployment and basic functionality
 */
export async function verifyContractDeployment() {
  try {
    // Check if contract exists at address
    const code = await provider.getCode(checksummedAddress);
    if (code === '0x') {
      throw new Error('No contract deployed at the specified address');
    }

    // Check transaction count
    const count = await contract.getTransactionCount();
    if (count < 0n) {
      throw new Error('Invalid transaction count from contract');
    }

    // Check if wallet is authorized (should be for deployer)
    const isAuthorized = await contract.isAuthorized(wallet.address);
    if (!isAuthorized) {
      console.warn('Wallet is not authorized on contract. Grant access if needed.');
    }

    return {
      status: 'verified',
      address: checksummedAddress,
      transactionCount: count.toString(),
      isAuthorized: isAuthorized,
      chainId: blockchainConfig.chainId
    };
  } catch (error) {
    throw new Error(`Contract verification failed: ${error.message}`);
  }
}