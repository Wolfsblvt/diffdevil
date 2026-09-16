// SPDX-License-Identifier: AGPL-3.0-only

const form = document.querySelector('#analyze-form');
const input = document.querySelector('#pull-request-url');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const resultTitle = document.querySelector('#result-title');
const pullRequestLink = document.querySelector('#pull-request-link');
const metricGrid = document.querySelector('#metric-grid');
const evidenceSummary = document.querySelector('#evidence-summary');
const filesSummary = document.querySelector('#files-summary');
const filesBody = document.querySelector('#files-body');
const projection = document.querySelector('#projection');

function measurementText(measurement) {
  if (!measurement) return 'Unavailable';
  if (measurement.status === 'exact') return new Intl.NumberFormat().format(measurement.value);
  if (measurement.status === 'bounded') return `${new Intl.NumberFormat().format(measurement.lower)}–${new Intl.NumberFormat().format(measurement.upper)} (bounded)`;
  if (measurement.status === 'unknown') {
    if (measurement.lower !== undefined && measurement.upper !== undefined) return `${measurement.lower}–${measurement.upper} (unknown)`;
    if (measurement.lower !== undefined) return `≥ ${measurement.lower} (unknown)`;
    if (measurement.upper !== undefined) return `≤ ${measurement.upper} (unknown)`;
    return 'Unknown';
  }
  return 'Unmeasurable';
}

function metric(label, measurement, note) {
  const card = document.createElement('article');
  card.className = 'metric-card';
  const title = document.createElement('h3');
  title.textContent = label;
  const value = document.createElement('p');
  value.className = 'metric-value';
  value.textContent = measurementText(measurement);
  const detail = document.createElement('p');
  detail.className = 'metric-note';
  detail.textContent = note;
  card.append(title, value, detail);
  return card;
}

function evidenceText(analysis) {
  const statusText = analysis.measurement.status === 'exact'
    ? 'The included comparison is exact.'
    : `The comparison is ${analysis.measurement.status}; diffdevil has not invented a convenient exact number.`;
  const completeness = analysis.fileSet.complete
    ? 'GitHub returned the complete file set.'
    : `GitHub reported more material than this response could prove completely (${measurementText(analysis.fileSet.total)} files).`;
  const reasons = analysis.measurement.reasons?.map(reason => reason.message ?? reason.code).filter(Boolean) ?? [];
  return [statusText, completeness, ...reasons].join(' ');
}

function appendCell(row, text, className) {
  const cell = document.createElement('td');
  cell.textContent = text;
  if (className) cell.className = className;
  row.append(cell);
}

function render(data) {
  const analysis = data.analysis;
  resultTitle.textContent = `${analysis.source.repository} #${analysis.source.pullRequest}`;
  pullRequestLink.href = data.canonicalUrl;
  metricGrid.replaceChildren(
    metric('Changed lines', analysis.totals.lines.changed, 'Replacement-aware'),
    metric('Raw churn', analysis.totals.raw.churn, 'Additions + deletions'),
    metric('Modified lines', analysis.totals.lines.modified, 'Paired replacements'),
    metric('Files', analysis.fileSet.total, analysis.fileSet.complete ? 'Complete file set' : 'Incomplete file set')
  );
  evidenceSummary.textContent = evidenceText(analysis);

  filesBody.replaceChildren();
  for (const file of analysis.files) {
    const row = document.createElement('tr');
    const path = file.oldPath ? `${file.oldPath} → ${file.path}` : file.path;
    appendCell(row, path, 'path-cell');
    appendCell(row, `${file.changeType} · ${file.kind}`);
    appendCell(row, measurementText(file.lines.changed), 'number-cell');
    appendCell(row, measurementText(file.raw.churn), 'number-cell');
    appendCell(row, file.measurement.status);
    filesBody.append(row);
  }

  const omitted = analysis.filesOmitted > 0 ? ` ${analysis.filesOmitted} additional files are omitted from this compact projection.` : '';
  filesSummary.textContent = `${analysis.files.length} file records shown.${omitted}`;
  projection.textContent = JSON.stringify(analysis, null, 2);
  result.hidden = false;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  result.hidden = true;
  status.className = 'status working';
  status.textContent = 'Reading the current pull-request comparison…';
  form.querySelector('button').disabled = true;

  try {
    const response = await fetch(`/api/analyze?url=${encodeURIComponent(input.value)}`, { headers: { accept: 'application/json' } });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error?.message ?? `Analysis failed with HTTP ${response.status}.`);
    render(data);
    status.className = 'status success';
    status.textContent = 'Analysis complete. No provider effects were applied.';
  } catch (error) {
    status.className = 'status error';
    status.textContent = error instanceof Error ? error.message : 'Analysis failed.';
  } finally {
    form.querySelector('button').disabled = false;
  }
});
