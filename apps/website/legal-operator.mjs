// SPDX-License-Identifier: AGPL-3.0-only
/** Build-only legal projection. Never import this module into client code. */
export const fixtureOperator = Object.freeze({
  schemaVersion: 1, operatorId: 'fixture', publisherName: 'Example publisher',
  legalName: 'EXAMPLE — NOT A PUBLICATION OPERATOR',
  postalAddress: { streetAddress: 'Example street 1', postalCode: '00000', locality: 'Example', countryName: 'Example' },
  contacts: { legal: 'legal@example.invalid', privacy: 'privacy@example.invalid', impressum: 'impressum@example.invalid' },
  contactStanding: 'fixture',
  additionalDirectContact: { label: 'Example contact form', href: 'https://example.invalid/contact', standing: 'fixture' },
});

/** Validate only the admitted projection; diagnostics never include private input. */
export function legalOperator(env = process.env) {
  const publication = env.DIFFDEVIL_WEBSITE_PUBLICATION === '1';
  let value = fixtureOperator;
  if (env.WOLFSBLVT_LEGAL_OPERATOR_B64) {
    try { value = JSON.parse(Buffer.from(env.WOLFSBLVT_LEGAL_OPERATOR_B64, 'base64').toString('utf8')); }
    catch { throw new Error('Invalid legal-operator projection.'); }
  }
  const required = [value?.legalName, value?.postalAddress?.streetAddress, value?.postalAddress?.postalCode,
    value?.postalAddress?.locality, value?.postalAddress?.countryName,
    ...['impressum', 'legal', 'privacy'].map(key => value?.contacts?.[key])];
  if (value?.schemaVersion !== 1 || required.some(field => typeof field !== 'string' || !field.trim())) {
    throw new Error('Incomplete legal-operator projection.');
  }
  if (publication) {
    let contact;
    try { contact = new URL(value.additionalDirectContact?.href); } catch { /* Refuse below. */ }
    if (value.operatorId === 'fixture' || value.contactStanding !== 'provisioned' ||
      required.some(field => /example|fixture|placeholder/iu.test(field)) ||
      value.additionalDirectContact?.standing !== 'provisioned' || !value.additionalDirectContact?.label ||
      contact?.protocol !== 'https:' || contact.hostname.endsWith('.invalid')) {
      throw new Error('Publication requires the real operator and provisioned email and additional direct-contact route.');
    }
  }
  return value;
}
