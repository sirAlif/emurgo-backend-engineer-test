import { createHash } from 'crypto';
import { Block } from '../models/block.model';

export function calculateBlockHash(block: Block): string {
  const txIds = block.transactions.map(tx => tx.id).join('');
  const data = block.height.toString() + txIds;
  return createHash('sha256').update(data).digest('hex');
}
