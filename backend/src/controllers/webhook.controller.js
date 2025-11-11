import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import blockchainService from '../services/blockchain.service.js';
import logger from '../utils/logger.js';
import { ERROR_MESSAGES } from '../utils/constants.js';

/**
 * Process webhook transaction
 * Main entry point for EDN webhook events
 */
export const processWebhook = async (req, res) => {
  try {
    const { event_type, timestamp, transaction } = req.body;

    logger.info('Webhook received', {
      event_type,
      transactionId: transaction?.id,
      uuid: transaction?.uuid,
      type: transaction?.type,
      amount: transaction?.amount
    });

    // Validate required fields
    if (!event_type || !transaction) {
      logger.warn('Invalid webhook payload structure', { body: req.body });
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid webhook payload',
        details: { validation: 'missing_fields' }
      });
    }

    // Normalize event type
    const normalizedEventType = event_type.replace('_', '.');
    if (normalizedEventType !== 'transaction.created') {
      logger.warn('Unsupported event type', { event_type, normalized: normalizedEventType });
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Unsupported event type',
        details: { event_type }
      });
    }

    // Normalize status
    if (transaction.status === 'completed') {
      transaction.status = 'confirmed';
    }

    // Basic validation
    if (!transaction.id || !transaction.uuid) {
      logger.warn('Missing required transaction fields', {
        hasId: !!transaction.id,
        hasUuid: !!transaction.uuid
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Transaction must have id and uuid',
        details: { validation: 'required_fields' }
      });
    }

    // Record transaction to blockchain
    const result = await blockchainService.recordTransaction(transaction);

    logger.info('Webhook processed successfully', {
      uuid: transaction.uuid,
      blockchainTx: result.transactionHash,
      blockchainId: result.blockchainId
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
      message: 'Transaction recorded on blockchain'
    });

  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Handle specific blockchain errors
    if (error.message.includes('already recorded')) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Transaction already recorded',
        details: { error: 'duplicate_transaction' }
      });
    }

    if (error.message.includes('Insufficient balance')) {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        message: 'Blockchain service temporarily unavailable',
        details: { error: 'insufficient_funds' }
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      details: { 
        error: error.message,
        code: error.message.includes('already recorded') ? 'DUPLICATE' : 'BLOCKCHAIN_ERROR'
      }
    });
  }
};