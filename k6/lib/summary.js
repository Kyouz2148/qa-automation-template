function formatNumber(val, decimals = 2) {
  if (val === undefined || val === null || Number.isNaN(val)) return 'N/A';
  return Number(val).toFixed(decimals);
}

export function createSummaryHandler(suiteName) {
  return function handleSummary(data) {
    const metrics = data.metrics || {};
    const reqs = metrics.http_reqs?.values?.count ?? 0;
    const rps = metrics.http_reqs?.values?.rate ?? 0;
    const failRate = (metrics.http_req_failed?.values?.rate ?? 0) * 100;
    const p50 =
      metrics.http_req_duration?.values?.['p(50)'] ?? metrics.http_req_duration?.values?.med;
    const p95 = metrics.http_req_duration?.values?.['p(95)'];
    const p99 = metrics.http_req_duration?.values?.['p(99)'];
    const checksPassRate = (metrics.checks?.values?.rate ?? 1) * 100;

    const thresholdEntries = [];
    let allThresholdsPassed = true;
    for (const [metricName, metricData] of Object.entries(metrics)) {
      if (!metricData.thresholds) continue;
      for (const [expr, result] of Object.entries(metricData.thresholds)) {
        const passed = Boolean(result.ok);
        if (!passed) allThresholdsPassed = false;
        thresholdEntries.push(
          `| \`${metricName}\` | \`${expr}\` | ${passed ? '✅ Pass' : '❌ Fail'} |`,
        );
      }
    }

    const formatMs = (val) =>
      val === undefined || val === null ? 'N/A' : `${formatNumber(val)} ms`;

    const statusBadge = allThresholdsPassed ? '✅ PASSED' : '❌ FAILED';
    const md = [
      `### ⚡ k6 Performance Report — ${suiteName} (${statusBadge})`,
      '',
      '| Metric | Value |',
      '| --- | --- |',
      `| Total Requests | **${reqs}** (${formatNumber(rps)} req/s) |`,
      `| Error Rate (\`http_req_failed\`) | **${formatNumber(failRate)}%** |`,
      `| Checks Passed | **${formatNumber(checksPassRate)}%** |`,
      `| Latency p50 | **${formatMs(p50)}** |`,
      `| Latency p95 | **${formatMs(p95)}** |`,
      `| Latency p99 | **${formatMs(p99)}** |`,
      '',
      thresholdEntries.length
        ? [
            '#### Thresholds (SLOs)',
            '',
            '| Metric | Threshold | Status |',
            '| --- | --- | --- |',
            ...thresholdEntries,
          ].join('\n')
        : '',
    ]
      .filter((line) => line !== undefined && line !== null)
      .join('\n')
      .trim();

    return {
      'reports/k6-summary.json': JSON.stringify(data, null, 2),
      'reports/k6-summary.md': md,
      stdout: `\n${md}\n\n`,
    };
  };
}
