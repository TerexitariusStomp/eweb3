import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Test payloads - cycle through them
const testPayloads = [
  {
    event_type: "transaction.created",
    timestamp: new Date().toISOString(),
    transaction: {
      id: Math.floor(Math.random() * 1000000000),
      type: "credit",
      amount: Math.random() * 100 + 0.01,
      empresa_id: 131,
      parceiro_negocio_id: 1043,
      celular_id: 1043,
      celular_debito_id: Math.floor(Math.random() * 1000000),
      moeda_id: 1,
      plataforma_id: 1,
      transacao_tipo_id: 21,
      status: "confirmed",
      created_at: new Date().toISOString(),
      table: "transacao_credito",
      operation: "INSERT",
      schema: "MONEYCLIP_OFICIAL",
      transaction_id_origem: Math.floor(Math.random() * 100000000),
      mensagem: null,
      data_controle: new Date().toISOString(),
      uuid: uuidv4(),
      versao: "V1"
    }
  },
  {
    event_type: "transaction.created",
    timestamp: new Date().toISOString(),
    transaction: {
      id: Math.floor(Math.random() * 1000000000),
      type: "debit",
      amount: -(Math.random() * 50 + 0.01),
      empresa_id: 131,
      parceiro_negocio_id: 1043,
      celular_id: 1043,
      celular_debito_id: Math.floor(Math.random() * 1000000),
      moeda_id: 1,
      plataforma_id: 1,
      transacao_tipo_id: 21,
      status: "confirmed",
      created_at: new Date().toISOString(),
      table: "transacao_debito",
      operation: "INSERT",
      schema: "MONEYCLIP_OFICIAL",
      transaction_id_origem: Math.floor(Math.random() * 100000000),
      mensagem: null,
      data_controle: new Date().toISOString(),
      uuid: uuidv4(),
      versao: "V1"
    }
  },
  {
    event_type: "transaction.created",
    timestamp: new Date().toISOString(),
    transaction: {
      id: Math.floor(Math.random() * 1000000000),
      type: "fee",
      amount: Math.random() * 10 + 0.01,
      empresa_id: 131,
      parceiro_negocio_id: 1043,
      celular_id: 1043,
      celular_debito_id: Math.floor(Math.random() * 1000000),
      moeda_id: 1,
      plataforma_id: 1,
      transacao_tipo_id: 25,
      status: "confirmed",
      created_at: new Date().toISOString(),
      table: "transacao_taxatarifa",
      operation: "INSERT",
      schema: "MONEYCLIP_OFICIAL",
      transaction_id_origem: Math.floor(Math.random() * 100000000),
      mensagem: null,
      data_controle: new Date().toISOString(),
      uuid: uuidv4(),
      versao: "V1"
    }
  }
];

let payloadIndex = 0;

async function sendTestWebhook() {
  const payload = testPayloads[payloadIndex % testPayloads.length];
  payloadIndex++;

  try {
    const response = await axios.post('http://localhost:3000/webhook/transaction', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`[${new Date().toISOString()}] Test webhook sent successfully:`, {
      type: payload.transaction.type,
      amount: payload.transaction.amount,
      uuid: payload.transaction.uuid,
      status: response.status,
      blockchainId: response.data.data?.blockchainId
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Test webhook failed:`, {
      type: payload.transaction.type,
      amount: payload.transaction.amount,
      uuid: payload.transaction.uuid,
      error: error.message,
      status: error.response?.status
    });
  }
}

// Send first payload immediately
sendTestWebhook();

// Send every 3 minutes (180000 ms)
setInterval(sendTestWebhook, 180000);

console.log('Test webhook started. Sending payloads every 3 minutes to http://localhost:3000/webhook/transaction');