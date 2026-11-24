import fs from 'node:fs';
import path from 'node:path';

const RESULTS_PATH = path.resolve(
  process.cwd(),
  process.env.PW_JSON_REPORT || 'reports/results.json',
);
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  process.env.PR_SUMMARY_OUTPUT || 'reports/pr-comment.md',
);
const MARKER = '<!-- qa-automation-report -->';

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '0s';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function collectTests(suites = [], parentTitles = [], out = []) {
  for (const suite of suites) {
    const nextTitles = suite.title ? [...parentTitles, suite.title] : parentTitles;
    for (const spec of suite.specs || []) {
      const fullTitle = [...nextTitles, spec.title].join(' › ');
      for (const testItem of spec.tests || []) {
        out.push({
          title: fullTitle,
          file: spec.file || suite.file || 'unknown',
          line: spec.line || 0,
          project: testItem.projectName || 'default',
          status: testItem.status, // expected | unexpected | flaky | skipped
          results: testItem.results || [],
        });
      }
    }
    if (suite.suites?.length) {
      collectTests(suite.suites, nextTitles, out);
    }
  }
  return out;
}

function buildMarkdown(report) {
  const stats = report.stats || {};
  const tests = collectTests(report.suites);

  const passed = stats.expected ?? tests.filter((t) => t.status === 'expected').length;
  const failed = stats.unexpected ?? tests.filter((t) => t.status === 'unexpected').length;
  const flaky = stats.flaky ?? tests.filter((t) => t.status === 'flaky').length;
  const skipped = stats.skipped ?? tests.filter((t) => t.status === 'skipped').length;
  const total = passed + failed + flaky + skipped;
  const durationMs = stats.duration ?? 0;

  const isSuccess = failed === 0;
  const statusIcon = isSuccess ? '✅' : '❌';
  const statusLabel = isSuccess ? 'Passed' : 'Failed';

  const byProject = new Map();
  for (const t of tests) {
    if (!byProject.has(t.project)) {
      byProject.set(t.project, { passed: 0, failed: 0, flaky: 0, skipped: 0 });
    }
    const bucket = byProject.get(t.project);
    if (t.status === 'expected') bucket.passed += 1;
    else if (t.status === 'unexpected') bucket.failed += 1;
    else if (t.status === 'flaky') bucket.flaky += 1;
    else bucket.skipped += 1;
  }

  const runUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;

  const lines = [
    MARKER,
    `## ${statusIcon} Automated Test Report — ${statusLabel}`,
    '',
    '| Metric | Count |',
    '| --- | ---: |',
    `| **Total** | ${total} |`,
    `| ✅ Passed | ${passed} |`,
    `| ❌ Failed | ${failed} |`,
    `| ⚠️ Flaky | ${flaky} |`,
    `| ⏭️ Skipped | ${skipped} |`,
    `| ⏱️ Duration | ${formatDuration(durationMs)} |`,
    '',
  ];

  if (byProject.size > 0) {
    lines.push('### Breakdown by Project', '');
    lines.push('| Project | Passed | Failed | Flaky | Skipped |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const [project, counts] of byProject.entries()) {
      lines.push(
        `| \`${project}\` | ${counts.passed} | ${counts.failed} | ${counts.flaky} | ${counts.skipped} |`,
      );
    }
    lines.push('');
  }

  const failures = tests.filter((t) => t.status === 'unexpected');
  if (failures.length > 0) {
    lines.push('<details open>', `<summary>❌ Failed Tests (${failures.length})</summary>`, '');
    for (const f of failures.slice(0, 15)) {
      const lastResult = f.results[f.results.length - 1];
      const errMsg = stripAnsi(lastResult?.error?.message || 'Unknown error')
        .split('\n')
        .slice(0, 6)
        .join('\n');
      lines.push(`- **[\`${f.project}\`] ${f.title}** (\`${f.file}:${f.line}\`)`);
      lines.push('  ```text');
      lines.push(`  ${errMsg}`);
      lines.push('  ```');
    }
    if (failures.length > 15) {
      lines.push(
        `- _...and ${failures.length - 15} more failure(s). Check the HTML report artifact._`,
      );
    }
    lines.push('</details>', '');
  }

  if (runUrl) {
    lines.push(
      `📦 **Artifacts & Merged HTML Report:** [View Workflow Run #${process.env.GITHUB_RUN_NUMBER || ''}](${runUrl})`,
      '',
    );
  }

  lines.push(`<sub>Generated at ${new Date().toISOString()}</sub>`);
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error(`Playwright JSON report not found at: ${RESULTS_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(RESULTS_PATH, 'utf8');
  const report = JSON.parse(raw);
  const markdown = buildMarkdown(report);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf8');
  console.log(`Generated PR summary at ${OUTPUT_PATH}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, 'utf8');
  }
}

main();
