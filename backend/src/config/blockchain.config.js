import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xdea4208e1e54197E26C5065047ECbF37d8Ea2bEB';
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
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0xdea4208e1e54197E26C5065047ECbF37d8Ea2bEB') {
  console.warn('Using default CONTRACT_ADDRESS. Update in .env for production.');
}

// Create provider
export const provider = new ethers.JsonRpcProvider(RPC_URL);

// Create wallet
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Load ABI - Note: Create backend/src/contracts/TransactionRegistry.json with the contract ABI
let ABI;
try {
  const abiPath = path.join(__dirname, '../contracts/TransactionRegistry.json');
  ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
  logger.info('Contract ABI loaded successfully');
} catch (error) {
  logger.warn('Failed to load contract ABI - using placeholder for local development', {
    error: error.message
  });
  // Full ABI from deployed contract
  ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "transactionId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "empresaId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "transactionType",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "uuid",
          "type": "string"
        }
      ],
      "name": "TransactionRecorded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "authorizedUsers",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_blockchainId",
          "type": "uint256"
        }
      ],
      "name": "getTransaction",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "transactionType",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "empresaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "parceiroNegocioId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularDebitoId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "moedaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "plataformaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "transacaoTipoId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "status",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "tableName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "operation",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dataControle",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "uuid",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "versao",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "recorder",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "blockchainId",
              "type": "uint256"
            }
          ],
          "internalType": "struct TransactionRegistry.Transaction",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_uuid",
          "type": "string"
        }
      ],
      "name": "getTransactionByUUID",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "transactionType",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "empresaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "parceiroNegocioId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularDebitoId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "moedaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "plataformaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "transacaoTipoId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "status",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "tableName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "operation",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dataControle",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "uuid",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "versao",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "recorder",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "blockchainId",
              "type": "uint256"
            }
          ],
          "internalType": "struct TransactionRegistry.Transaction",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTransactionCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_empresaId",
          "type": "uint256"
        }
      ],
      "name": "getTransactionsByEmpresa",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "transactionType",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "empresaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "parceiroNegocioId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularDebitoId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "moedaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "plataformaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "transacaoTipoId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "status",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "tableName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "operation",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dataControle",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "uuid",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "versao",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "recorder",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "blockchainId",
              "type": "uint256"
            }
          ],
          "internalType": "struct TransactionRegistry.Transaction[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "grantAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "isAuthorized",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "transactionType",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "empresaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "parceiroNegocioId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "celularDebitoId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "moedaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "plataformaId",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "transacaoTipoId",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "status",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "createdAt",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "tableName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "operation",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dataControle",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "uuid",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "versao",
              "type": "string"
            }
          ],
          "internalType": "struct TransactionRegistry.TransactionData",
          "name": "_data",
          "type": "tuple"
        }
      ],
      "name": "recordTransaction",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_user",
          "type": "address"
        }
      ],
      "name": "revokeAccess",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "transactionCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "transactions",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "id",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "transactionType",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "empresaId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "parceiroNegocioId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "celularId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "celularDebitoId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "moedaId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "plataformaId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "transacaoTipoId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "status",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "tableName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "operation",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "dataControle",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "uuid",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "versao",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "recorder",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "blockchainId",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "transactionsByEmpresa",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "uuidToId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
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
export async function estimateGasWithBuffer(functionName, argObject) {
  try {
    const gasEstimate = await contract[functionName].estimateGas(argObject, { from: wallet.address });
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