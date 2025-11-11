export default [
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