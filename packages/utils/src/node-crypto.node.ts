import type { BinaryLike } from 'node:crypto';
import { createHash } from 'node:crypto';

export function sha256sum(data: BinaryLike): string {
  return createHash('sha256').update(data).digest('hex');
}
