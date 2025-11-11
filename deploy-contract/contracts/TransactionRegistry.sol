pragma solidity ^0.8.19;

contract TransactionRegistry {
    struct Transaction {
        uint256 id;
        string transactionType;
        uint256 amount;
        uint256 empresaId;
        uint256 parceiroNegocioId;
        uint256 celularId;
        uint256 celularDebitoId;
        uint256 moedaId;
        uint256 plataformaId;
        uint256 transacaoTipoId;
        string status;
        uint256 createdAt;
        string tableName;
        string operation;
        string dataControle;
        string uuid;
        string versao;
        address recorder;
        uint256 blockchainId;
    }

    struct TransactionData {
        uint256 id;
        string transactionType;
        uint256 amount;
        uint256 empresaId;
        uint256 parceiroNegocioId;
        uint256 celularId;
        uint256 celularDebitoId;
        uint256 moedaId;
        uint256 plataformaId;
        uint256 transacaoTipoId;
        string status;
        uint256 createdAt;
        string tableName;
        string operation;
        string dataControle;
        string uuid;
        string versao;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(string => uint256) public uuidToId;
    mapping(uint256 => uint256[]) public transactionsByEmpresa;
    mapping(address => bool) public authorizedUsers;
    uint256 public transactionCount;

    event TransactionRecorded(
        uint256 indexed transactionId,
        uint256 indexed empresaId,
        string transactionType,
        uint256 amount,
        uint256 timestamp,
        string uuid
    );

    modifier onlyAuthorized() {
        require(authorizedUsers[msg.sender] || msg.sender == owner, "Unauthorized");
        _;
    }

    address public owner;

    constructor() {
        owner = msg.sender;
        authorizedUsers[msg.sender] = true;
    }

    function recordTransaction(
        TransactionData memory _data
    ) public onlyAuthorized returns (uint256) {
        require(bytes(_data.uuid).length > 0, "UUID required");
        require(uuidToId[_data.uuid] == 0, "Transaction already recorded");

        transactionCount++;
        uint256 blockchainId = transactionCount;

        transactions[blockchainId].id = _data.id;
        transactions[blockchainId].transactionType = _data.transactionType;
        transactions[blockchainId].amount = _data.amount;
        transactions[blockchainId].empresaId = _data.empresaId;
        transactions[blockchainId].parceiroNegocioId = _data.parceiroNegocioId;
        transactions[blockchainId].celularId = _data.celularId;
        transactions[blockchainId].celularDebitoId = _data.celularDebitoId;
        transactions[blockchainId].moedaId = _data.moedaId;
        transactions[blockchainId].plataformaId = _data.plataformaId;
        transactions[blockchainId].transacaoTipoId = _data.transacaoTipoId;
        transactions[blockchainId].status = _data.status;
        transactions[blockchainId].createdAt = _data.createdAt;
        transactions[blockchainId].tableName = _data.tableName;
        transactions[blockchainId].operation = _data.operation;
        transactions[blockchainId].dataControle = _data.dataControle;
        transactions[blockchainId].uuid = _data.uuid;
        transactions[blockchainId].versao = _data.versao;
        transactions[blockchainId].recorder = msg.sender;
        transactions[blockchainId].blockchainId = blockchainId;

        uuidToId[_data.uuid] = blockchainId;
        transactionsByEmpresa[_data.empresaId].push(blockchainId);

        emit TransactionRecorded(blockchainId, _data.empresaId, _data.transactionType, _data.amount, block.timestamp, _data.uuid);

        return blockchainId;
    }

    function getTransactionByUUID(string memory _uuid) public view returns (Transaction memory) {
        uint256 id = uuidToId[_uuid];
        require(id > 0, "Transaction not found");
        return transactions[id];
    }

    function getTransaction(uint256 _blockchainId) public view returns (Transaction memory) {
        return transactions[_blockchainId];
    }

    function getTransactionsByEmpresa(uint256 _empresaId) public view returns (Transaction[] memory) {
        uint256[] memory ids = transactionsByEmpresa[_empresaId];
        Transaction[] memory result = new Transaction[](ids.length);
        for(uint256 i = 0; i < ids.length; i++) {
            result[i] = transactions[ids[i]];
        }
        return result;
    }

    function isAuthorized(address _user) public view returns (bool) {
        return authorizedUsers[_user];
    }

    function grantAccess(address _user) public {
        require(msg.sender == owner, "Only owner can grant access");
        authorizedUsers[_user] = true;
    }

    function revokeAccess(address _user) public {
        require(msg.sender == owner, "Only owner can revoke access");
        require(_user != owner, "Cannot revoke owner");
        authorizedUsers[_user] = false;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactionCount;
    }
}