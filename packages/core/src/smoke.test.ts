import { expect, test } from 'vitest';
import { CORE_VERSION } from './index';

test('workspace pipeline runs', () => {
  expect(CORE_VERSION).toBe('0.2.0');
});
