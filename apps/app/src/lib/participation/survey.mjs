// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The beta survey: product-owned questions and the one reader that turns a posted form into stored answers. Five
 * minutes, structured where structure helps, free text where it doesn't. Only "what did you use" needs an answer, so a
 * draft can become a completion; nothing asks for praise, scores sentiment or waits for approval. Hardly using
 * diffdevil, or disliking it, completes the survey exactly like enjoying it.
 */

const AREAS = [
  ['size-labels', 'Size labels on pull requests'],
  ['checks', 'The check and its policy result'],
  ['pr-message', 'The pull-request message and brief'],
  ['file-history', 'File history, the cloud and Turnover'],
  ['pr-history', 'Pull-request and repository history'],
  ['configuration', 'Configuring policies'],
  ['open-tools', 'The CLI, library or Actions']
];

export const TEXT_LIMIT = 4000;

export const SURVEYS = Object.freeze({
  'beta-v1': Object.freeze({
    id: 'beta-v1',
    minutes: 5,
    questions: Object.freeze([
      { id: 'used', kind: 'choices', required: true, label: 'What did you actually use diffdevil for?', hint: 'Everything that applies, even once.',
        options: [...AREAS, ['barely', 'I hardly used it'], ['other', 'Something else']], detail: { id: 'usedDetail', label: 'What, briefly (optional)' } },
      { id: 'useful', kind: 'choices', label: 'Which parts were most useful?', hint: 'Leave it empty if nothing was.',
        options: [...AREAS, ['nothing-yet', 'Nothing stood out yet']] },
      { id: 'friction', kind: 'choices', label: 'What was confusing, unreliable or missing?',
        options: [['setup', 'Setting it up'], ['numbers', 'Understanding the numbers'], ['configuration', 'Configuring policies'], ['delays', 'Results that were late or didn\'t appear'],
          ['wrong', 'Results that looked wrong'], ['missing', 'Something I needed wasn\'t there'], ['nothing', 'Nothing in particular']],
        detail: { id: 'frictionDetail', label: 'Tell us more (optional)' } },
      { id: 'keep', kind: 'text', label: 'What would make Pro worth keeping for you?', hint: 'Or what makes it not worth it. Both help equally.' },
      { id: 'ideas', kind: 'text', label: 'Anything else?', hint: 'Ideas, context, a pull request that surprised you. Optional.' }
    ])
  })
});

/** Later contributions have independent responses and completion events, never answers reused from beta-v1. */
export const ACTIVITIES = Object.freeze({
  'return-v1': {
    name: 'Return journey thank-you', minutes: 8,
    reason: 'You completed the cancellation, funded end and explicit return journey and explained what happened to continuity, history, price and remaining benefits.',
    introduction: 'Describe your full cancellation → funded end → explicit return journey. Reviewing a quote is a separate contribution. A draft does not earn a reward.',
    questions: [
      { id: 'ending', kind: 'text', required: true, label: 'When did you cancel, and when did the funded term actually end?', hint: 'Describe the actual sequence, including what remained available after the end.' },
      { id: 'return', kind: 'text', required: true, label: 'When and how did you explicitly return?' },
      { id: 'continuity', kind: 'text', required: true, label: 'What happened to your history, price and remaining benefits when you returned?' },
      { id: 'friction', kind: 'text', label: 'What should be clearer about leaving and returning?' }
    ]
  },
  'walkthrough-v1': {
    name: 'Beta walkthrough thank-you', minutes: 8,
    reason: 'You completed an end-to-end diffdevil beta walkthrough and showed us where setup, analysis, explanation or trust became unclear.',
    introduction: 'Walk through a real setup and analysis, then explain what the result meant to you. Critical and positive accounts count equally; this is separate from the original beta survey.',
    questions: [
      { id: 'setup', kind: 'text', required: true, label: 'What did you set up, and where did setup become unclear?' },
      { id: 'analysis', kind: 'text', required: true, label: 'Which actual pull request or analysis did you follow through?' },
      { id: 'explanation', kind: 'text', required: true, label: 'What did its explanation help you understand, or leave unclear?' },
      { id: 'trust', kind: 'text', required: true, label: 'What made you trust or question the result?' }
    ]
  },
  'quote-review-v1': {
    name: 'Contributor price option', minutes: 5,
    reason: 'You reviewed a real continuation quote and helped us make its price, protection, next charge and alternatives clearer.',
    introduction: 'Review a real continuation or renewal quote at Works. This focused price review does not complete the separate leaving-and-returning journey. Earning an option does not acquire a protected price.',
    questions: [
      { id: 'quote', kind: 'text', required: true, label: 'Which actual quote did you review, and when?', hint: 'Describe it without copying payment details.' },
      { id: 'price', kind: 'text', required: true, label: 'How clearly did it explain the price basis and protection?' },
      { id: 'charge', kind: 'text', required: true, label: 'What did you understand about the next charge and alternatives?' }
    ]
  },
  'ongoing-v1': {
    name: 'Ongoing beta contributor', minutes: 6,
    reason: 'You returned after sustained ordinary use and explained what changed in practice, not only what happened in one session.',
    introduction: 'Return after ordinary use across time. Tell us what changed in practice, including anything that did not improve. The reward is 20% off six eligible future monthly Pro base renewals; Works owns its actual standing.',
    questions: [
      { id: 'period', kind: 'text', required: true, label: 'Over what actual period did you use diffdevil regularly?' },
      { id: 'practice', kind: 'text', required: true, label: 'What changed in your ordinary work across that period?' },
      { id: 'comparison', kind: 'text', required: true, label: 'What became more useful, stayed unclear, or stopped helping?' }
    ]
  },
  'organisation-v1': {
    name: 'Organisation setup thank-you', minutes: 6,
    reason: 'You connected and administered one genuine additional organisation scope and helped us improve authority, binding and capacity setup.',
    introduction: 'Connect and administer one genuine additional organisation scope. The thank-you funds Additional organisation capacity. An included slot or already-paid capacity does not stand in for that reward. The funded calendar continues while unbound.',
    questions: [
      { id: 'organisation', kind: 'text', required: true, label: 'Which additional organisation did you actually connect and administer?' },
      { id: 'authority', kind: 'text', required: true, label: 'What happened while confirming authority and binding or rebinding its capacity?' },
      { id: 'capacity', kind: 'text', required: true, label: 'What was clear or unclear about capacity, funded dates and usability?' }
    ]
  }
});

export function surveyOf(id) {
  const survey = Object.hasOwn(SURVEYS, id) ? SURVEYS[id] : Object.hasOwn(ACTIVITIES, id) ? { id, ...ACTIVITIES[id] } : null;
  if (!survey) throw new TypeError(`Unknown survey ${id}.`);
  return survey;
}

function text(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/gu, '\n').trim().slice(0, TEXT_LIMIT);
}

/** Stored answers from a posted form: only known options, bounded text, nothing else. */
export function readAnswers(survey, form) {
  const answers = {};
  for (const question of survey.questions) {
    if (question.kind === 'choices') {
      const known = new Set(question.options.map(([value]) => value));
      answers[question.id] = [...new Set(form.getAll(question.id).map(String))].filter(value => known.has(value));
    } else answers[question.id] = text(form.get(question.id));
    if (question.detail) answers[question.detail.id] = text(form.get(question.detail.id));
  }
  return answers;
}

/** The answers a completion needs: one answer to the first question. Everything else may stay empty. */
export function missingForCompletion(survey, answers) {
  return survey.questions.filter(question => question.required && (question.kind === 'choices' ? !(answers?.[question.id]?.length > 0) : !answers?.[question.id])).map(question => question.id);
}

/** Whether a stored response holds any free text: deletion is offered and confirmed on this. */
export function hasText(answers) { return Object.values(answers ?? {}).some(value => typeof value === 'string' && value.length > 0); }

/** The labelled answers, for the export and the person's own review of what they sent. */
export function describeAnswers(survey, answers) {
  if (!answers) return [];
  return survey.questions.map(question => {
    const labels = question.kind === 'choices' ? (answers[question.id] ?? []).map(value => question.options.find(([option]) => option === value)?.[1] ?? value) : [];
    return { question: question.label, choices: labels, text: question.kind === 'text' ? answers[question.id] ?? '' : (question.detail ? answers[question.detail.id] ?? '' : '') };
  });
}
