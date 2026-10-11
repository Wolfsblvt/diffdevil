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

const TEXT_FIELDS = ['usedDetail', 'frictionDetail', 'keep', 'ideas'];

export function surveyOf(id) {
  const survey = SURVEYS[id];
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
export function hasText(answers) { return TEXT_FIELDS.some(field => typeof answers?.[field] === 'string' && answers[field].length > 0); }

/** The labelled answers, for the export and the person's own review of what they sent. */
export function describeAnswers(survey, answers) {
  if (!answers) return [];
  return survey.questions.map(question => {
    const labels = question.kind === 'choices' ? (answers[question.id] ?? []).map(value => question.options.find(([option]) => option === value)?.[1] ?? value) : [];
    return { question: question.label, choices: labels, text: question.kind === 'text' ? answers[question.id] ?? '' : (question.detail ? answers[question.detail.id] ?? '' : '') };
  });
}
