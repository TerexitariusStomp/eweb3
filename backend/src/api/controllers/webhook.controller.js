import validationService from '../../services/validation.service.js';
import blockchainService from '../../services/blockchain.service.js';
import logger from '../../utils/logger.js';
import { StatusCodes, ReasonPhrases } from 'http-status-codes';
import { formatBlockchainError } from '../../utils/formatter.js';

/**
 * Webhook Controller
 * Handles EDN webhook requests for transaction recording
 */

/**
 * Process incoming webhook transaction
 * Validates payload and records to blockchain
 */
export const processWebhook = async (req, res) => {
  try {
    logger.info('Webhook received', {
      eventType: req.body.event_type,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Validate webhook payload
    const validatedData = validationService.validateWebhookTransaction(req.body);

    // Extract transaction data
    const transactionData = validatedData.transaction;

    logger.info('Processing transaction webhook', {
      uuid: transactionData.uuid,
      type: transactionData.type,
      amount: transactionData.amount,
      empresaId: transactionData.empresa_id
    });

    // Record to blockchain
    const blockchainResult = await blockchainService.recordTransaction(validatedData);

    // Log successful processing
    logger.info('Transaction successfully recorded to blockchain', {
      uuid: transactionData.uuid,
      txHash: blockchainResult.transactionHash,
      blockNumber: blockchainResult.blockNumber,
      explorerUrl: blockchainResult.explorerUrl
    });

    // Return success response
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: {
        uuid: transactionData.uuid,
        blockchainId: blockchainResult.blockchainId,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        gasUsed: blockchainResult.gasUsed,
        confirmations: blockchainResult.confirmations,
        explorerUrl: blockchainResult.explorerUrl,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Handle validation errors
    if (error.message.includes('Validation failed')) {
      logger.warn('Webhook validation error', {
        uuid: req.body.transaction?.uuid,
        errors: error.message
      });
      return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
        success: false,
        message: 'Invalid webhook payload',
        details: { validation: true, error: error.message }
      });
    }

    // Handle blockchain errors
    if (error.message.includes('Blockchain') || error.message.includes('already recorded')) {
      logger.error('Blockchain recording failed for webhook', {
        uuid: req.body.transaction?.uuid,
        error: error.message
      });
      
      const statusCode = error.message.includes('already recorded') 
        ? StatusCodes.CONFLICT 
        : StatusCodes.SERVICE_UNAVAILABLE;
      
      const message = error.message.includes('already recorded')
        ? 'Transaction already recorded'
        : 'Blockchain service temporarily unavailable';
      
      return res.status(statusCode).json({
        success: false,
        message,
        details: { 
          blockchain: true, 
          originalError: formatBlockchainError(error),
          retryable: statusCode === StatusCodes.SERVICE_UNAVAILABLE
        }
      });
    }

    // Handle insufficient balance
    if (error.message.includes('insufficient balance')) {
      logger.error('Insufficient balance for webhook transaction', {
        uuid: req.body.transaction?.uuid
      });
      return res.status(StatusCodes.PAYMENT_REQUIRED).json({
        success: false,
        message: 'Insufficient wallet balance for gas fees',
        details: { wallet: true, action: 'fund_wallet' }
      });
    }

    // Generic error
    logger.error('Unexpected webhook processing error', {
      uuid: req.body.transaction?.uuid,
      error: error.message,
      stack: error.stack
    });

    // Re-throw to be caught by global error handler
    throw error;
  }
};