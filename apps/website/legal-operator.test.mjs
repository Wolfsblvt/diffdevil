// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixtureOperator, legalOperator } from './legal-operator.mjs';

const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64');
const publication = value => ({ DIFFDEVIL_WEBSITE_PUBLICATION: '1', WOLFSBLVT_LEGAL_OPERATOR_B64: encoded(value) });
// Fictional boundary specimen, never a production operator or live-contact proof.
const admitted = {
  schemaVersion: 1, operatorId: 'qualification', publisherName: 'Qualification publisher', legalName: 'Qualification Person',
  postalAddress: { streetAddress: 'Test street 1', postalCode: '12345', locality: 'Test town', countryName: 'Test country' },
  contacts: { legal: 'legal@test.test', privacy: 'legal@test.test', impressum: 'impressum@test.test' },
  contactStanding: 'provisioned', additionalDirectContact: { label: 'Contact', href: 'https://test.test/contact', standing: 'provisioned' },
};

test('ordinary builds use an explicit fixture; publication refuses missing or unprovisioned operator data', () => {
  assert.equal(legalOperator({}), fixtureOperator);
  assert.throws(() => legalOperator({ DIFFDEVIL_WEBSITE_PUBLICATION: '1' }), /Publication requires/u);
  assert.throws(() => legalOperator({ WOLFSBLVT_LEGAL_OPERATOR_B64: 'broken' }), /Invalid legal/u);
  assert.throws(() => legalOperator(publication(fixtureOperator)), /Publication requires/u);
  assert.throws(() => legalOperator(publication({ ...admitted, contactStanding: 'adopted-unperformed' })), /Publication requires/u);
  assert.throws(() => legalOperator(publication({ ...admitted, contacts: {} })), /Incomplete legal/u);
});

test('provisioned aliases alone do not admit publication; the additional contact needs its own standing', () => {
  for (const additionalDirectContact of [undefined, { ...admitted.additionalDirectContact, standing: 'adopted-unperformed' },
    { ...admitted.additionalDirectContact, href: 'mailto:legal@test.test' },
    { ...admitted.additionalDirectContact, href: 'http://test.test/contact' },
    { ...admitted.additionalDirectContact, href: 'https://example.invalid/contact' }]) {
    assert.throws(() => legalOperator(publication({ ...admitted, additionalDirectContact })), /Publication requires/u);
  }
  // Privacy may intentionally share the legal mailbox; separate aliases are not a requirement.
  assert.deepEqual(legalOperator(publication(admitted)), admitted);
});

test('each legal route needs its canonical email and complete operator address', () => {
  for (const key of ['impressum', 'legal', 'privacy']) {
    assert.throws(() => legalOperator(publication({ ...admitted, contacts: { ...admitted.contacts, [key]: '' } })), /Incomplete legal/u);
  }
  for (const key of ['streetAddress', 'postalCode', 'locality', 'countryName']) {
    assert.throws(() => legalOperator(publication({ ...admitted, postalAddress: { ...admitted.postalAddress, [key]: ' ' } })), /Incomplete legal/u);
  }
  assert.throws(() => legalOperator(publication({ ...admitted, schemaVersion: 2 })), /Incomplete legal/u);
});

test('rejected private projections never appear in validation diagnostics', () => {
  const marker = 'PRIVATE_PAYLOAD_SENTINEL';
  for (const payload of [JSON.stringify({ ...admitted, legalName: marker, contactStanding: 'not-provisioned' }),
    JSON.stringify({ legalName: marker }), `{"legalName":"${marker}"`]) {
    assert.throws(() => legalOperator({ DIFFDEVIL_WEBSITE_PUBLICATION: '1', WOLFSBLVT_LEGAL_OPERATOR_B64: Buffer.from(payload).toString('base64') }),
      error => !String(error).includes(marker) && /legal-operator|Publication requires/u.test(String(error)));
  }
});
