// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureOperator, legalOperator } from './legal-operator.mjs';

test('ordinary builds use an explicit fixture; publication refuses missing or unprovisioned operator data', () => {
  assert.equal(legalOperator({}), fixtureOperator);
  assert.throws(() => legalOperator({ DIFFDEVIL_WEBSITE_PUBLICATION: '1' }), /Publication requires/u);
  assert.throws(() => legalOperator({ WOLFSBLVT_LEGAL_OPERATOR_B64: 'broken' }), /Invalid legal/u);
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64');
  const admitted = { ...fixtureOperator, operatorId: 'qualification', legalName: 'Qualification Person',
    postalAddress: { streetAddress: 'Test street 1', postalCode: '12345', locality: 'Test town', countryName: 'Test country' },
    contacts: { legal: 'legal@test.test', privacy: 'privacy@test.test', impressum: 'impressum@test.test' },
    contactStanding: 'provisioned', additionalDirectContact: { label: 'Contact', href: 'https://test.test/contact', standing: 'provisioned' } };
  const env = value => ({ DIFFDEVIL_WEBSITE_PUBLICATION: '1', WOLFSBLVT_LEGAL_OPERATOR_B64: encoded(value) });
  assert.equal(legalOperator(env(admitted)).operatorId, 'qualification');
  assert.throws(() => legalOperator(env({ ...admitted, contactStanding: 'adopted-unperformed' })), /Publication requires/u);
  assert.throws(() => legalOperator(env({ ...admitted, additionalDirectContact: undefined })), /Publication requires/u);
  assert.throws(() => legalOperator(env({ ...admitted, contacts: {} })), /Incomplete legal/u);
});
