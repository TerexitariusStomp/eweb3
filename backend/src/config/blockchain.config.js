import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// Load environment variables
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x577022B59D1c25323AB524fe78d2f6347b5C69f0';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CHAIN_ID = parseInt(process.env.CHAIN_ID) || 84532;
const EXPLORER_URL = process.env.EXPLORER_URL || 'https://sepolia.basescan.org';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';
const CONFIRMATION_BLOCKS = parseInt(process.env.CONFIRMATION_BLOCKS) || 1;
const GAS_BUFFER_PERCENT = parseInt(process.env.GAS_BUFFER_PERCENT) || 20;

// Validate required env vars
if (!PRIVATE_KEY || PRIVATE_KEY === 'your_private_key_here') {
  throw new Error('PRIVATE_KEY is required in .env file');
}
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x577022B59D1c25323AB524fe78d2f6347b5C69f0') {
  console.warn('Using default CONTRACT_ADDRESS. Update in .env for production.');
}

// Create provider
export const provider = new ethers.JsonRpcProvider(RPC_URL);

// Create wallet
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Load ABI - Note: Create backend/src/contracts/TransactionRegistry.json with the contract ABI
let ABI;
try {
  const abiPath = path.join(new URL('../contracts/TransactionRegistry.json', import.meta.url).pathname);
  ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
  logger.info('Contract ABI loaded successfully');
} catch (error) {
  logger.warn('Failed to load contract ABI - using placeholder for local development', {
    error: error.message
  });
  // Placeholder ABI for basic functions - replace with actual ABI
  ABI = [
    // Placeholder events
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "name": "transactionId", "type": "uint256" },
        { "indexed": true, "name": "empresaId", "type": "uint256" },
        { "indexed": false, "name": "transactionType", "type": "string" },
        { "indexed": false, "name": "amount", "type": "uint256" },
        { "indexed": false, "name": "timestamp", "type": "uint256" },
        { "indexed": false, "name": "uuid", "type": "string" }
      ],
      "name": "TransactionRecorded",
      "type": "event"
    },
    // Placeholder functions - add all actual functions from contract
    {
      "inputs": [
        { "name": "uuid", "type": "string" }
      ],
      "name": "getTransactionByUUID",
      "outputs": [
        { "name": "", "type": "tuple", "components": [
          // Define tuple structure based on contract
          { "name": "id", "type": "uint256" },
          { "name": "transactionType", "type": "string" },
          { "name": "amount", "type": "uint256" },
          // ... other fields
        ] }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "name": "_id", "type": "uint256" },
        { "name": "_transactionType", "type": "string" },
        { "name": "_amount", "type": "uint256" },
        { "name": "_empresaId", "type": "uint256" },
        { "name": "_parceiroNegocioId", "type": "uint256" },
        { "name": "_celularId", "type": "uint256" },
        { "name": "_moedaId", "type": "uint256" },
        { "name": "_plataformaId", "type": "uint256" },
        { "name": "_transacaoTipoId", "type": "uint256" },
        { "name": "_status", "type": "string" },
        { "name": "_createdAt", "type": "uint256" },
        { "name": "_tableName", "type": "string" },
        { "name": "_operation", "type": "string" },
        { "name": "_dataControle", "type": "string" },
        { "name": "_uuid", "type": "string" },
        { "name": "_versao", "type": "string" }
      ],
      "name": "recordTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    // Add more functions as needed: transactionCount, getTransaction, getTransactionsByEmpresa, isAuthorized, grantAccess, revokeAccess
    {
      "inputs": [],
      "name": "transactionCount",
      "outputs": [{ "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "name": "_empresaId", "type": "uint256" }],
      "name": "getTransactionsByEmpresa",
      "outputs": [{ "name": "", "type": "tuple[]", "components": [ /* tuple */ ] }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "name": "address", "type": "address" }],
      "name": "isAuthorized",
      "outputs": [{ "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "name": "_user", "type": "address" }],
      "name": "grantAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "name": "_user", "type": "address" }],
      "name": "revokeAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];
}

// Create contract instance
export const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// Configuration object
export const blockchainConfig = {
  rpcUrl: RPC_URL,
  contractAddress: CONTRACT_ADDRESS,
  chainId: CHAIN_ID,
  explorerUrl: EXPLORER_URL,
  basescanApiKey: BASESCAN_API_KEY,
  confirmationBlocks: CONFIRMATION_BLOCKS,
  gasBufferPercent: GAS_BUFFER_PERCENT
};

/**
 * Estimate gas with buffer
 */
export async function estimateGasWithBuffer(functionName, ...args) {
  try {
    const gasEstimate = await contract[functionName].estimateGas(...args, { from: wallet.address });
    const buffer = (gasEstimate * BigInt(blockchainConfig.gasBufferPercent)) / 100n;
    return gasEstimate + buffer;
  } catch (error) {
    console.error(`Gas estimation failed for ${functionName}:`, error.message);
    throw error;
  }
}

/**
 * Check sufficient balance for gas
 */
export async function hasSufficientBalance(gasEstimate) {
  try {
    const balance = await provider.getBalance(wallet.address);
    const gasPrice = await provider.getFeeData();
    const gasCost = gasEstimate * gasPrice.gasPrice;
    return balance > gasCost;
  } catch (error) {
    console.error('Balance check failed:', error.message);
    return false;
  }
}

/**
 * Verify contract deployment
 */
export async function verifyContractDeployment() {
  try {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      throw new Error('Contract not deployed at specified address');
    }
    const chainId = await provider.getNetwork().then(n => n.chainId);
    if (chainId !== CHAIN_ID) {
      console.warn(`Expected chain ID ${CHAIN_ID}, got ${chainId}`);
    }
    return {
      address: CONTRACT_ADDRESS,
      chainId: chainId,
      codeLength: code.length,
      status: 'verified'
    };
  } catch (error) {
    console.error('Contract verification failed:', error.message);
    throw error;
  }
}

export default { provider, wallet, contract, blockchainConfig, estimateGasWithBuffer, hasSufficientBalance, verifyContractDeployment };