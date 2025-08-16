// Fetch evaluation data and build tables/charts
fetch('media/evaluation-summary.json')
  .then(response => response.json())
  .then(evaluationData => {
    // Build tables
    buildEvaluationTables(evaluationData);
    // Build charts
    buildCharts(evaluationData);
  })
  .catch(error => {
    console.error('Error loading evaluation data:', error);
    document.getElementById('evaluation-tables').innerHTML = '<div style="text-align: center; padding: 2em; color: red;">Error loading evaluation results</div>';
  });

function buildEvaluationTables(evalData) {
  const tools = ['terminalcp', 'terminalcp-cli', 'tmux', 'screen'];
  const tasks = ['debug-lldb', 'project-analysis', 'python-repl'];
  const toolNames = {
    'terminalcp': 'terminalcp (MCP)',
    'terminalcp-cli': 'terminalcp (CLI)',
    'tmux': 'tmux',
    'screen': 'screen'
  };
  const taskNames = {
    'debug-lldb': 'Debug (LLDB)',
    'project-analysis': 'Project Analysis',
    'python-repl': 'Python REPL'
  };

  // Calculate metrics
  const metrics = {};
  tools.forEach(tool => {
    metrics[tool] = {
      success: {},
      cost: {},
      time: {},
      totalSuccess: 0,
      totalRuns: 0,
      totalCost: 0,
      totalTime: 0
    };
    
    tasks.forEach(task => {
      const runs = evalData['claude-code'][task]?.[tool]?.runs || [];
      const successful = runs.filter(r => r.success).length;
      const total = runs.length;
      
      metrics[tool].success[task] = { count: successful, total: total };
      metrics[tool].totalSuccess += successful;
      metrics[tool].totalRuns += total;
      
      const taskCost = runs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      metrics[tool].cost[task] = taskCost;
      metrics[tool].totalCost += taskCost;
      
      const parseDuration = (dur) => {
        if (!dur) return 0;
        let seconds = 0;
        const match = dur.match(/(\d+)m\s*([\d.]+)s/);
        if (match) {
          seconds = parseInt(match[1]) * 60 + parseFloat(match[2]);
        } else if (dur.includes('s')) {
          seconds = parseFloat(dur.replace('s', ''));
        }
        return seconds;
      };
      
      const taskTime = runs.reduce((sum, r) => sum + parseDuration(r.totalDurationWall), 0);
      metrics[tool].time[task] = taskTime;
      metrics[tool].totalTime += taskTime;
    });
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Build HTML tables
  let html = '';
  
  // Add CSS for responsive tables
  html += `<style>
  .table-wrapper {
    overflow-x: auto;
    margin: 1em 0 2em 0;
    -webkit-overflow-scrolling: touch;
  }
  .eval-table {
    width: 100%;
    min-width: 500px;
    border-collapse: collapse;
    font-size: 0.9em;
  }
  .eval-table th,
  .eval-table td {
    padding: 0.5em;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #ddd);
    white-space: nowrap;
  }
  .eval-table th {
    font-weight: 600;
    position: sticky;
    left: 0;
    z-index: 1;
  }
  .eval-table th:first-child,
  .eval-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 2;
    min-width: 120px;
  }
  .eval-table th:first-child {
    z-index: 3;
  }
  .eval-table td {
    text-align: right;
  }
  .eval-table td:first-child {
    text-align: left;
    font-weight: 500;
  }
  @media (max-width: 640px) {
    .eval-table {
      font-size: 0.85em;
    }
    .eval-table th,
    .eval-table td {
      padding: 0.4em;
    }
  }
  </style>\n`;
  
  // Success Rates Table
  html += '<h3>Success Rates</h3>\n';
  html += '<div class="table-wrapper">\n';
  html += '<table class="eval-table">\n';
  html += '<thead><tr><th>Tool</th>';
  tasks.forEach(task => html += `<th>${taskNames[task]}</th>`);
  html += '<th>Overall</th></tr></thead>\n';
  html += '<tbody>\n';
  tools.forEach(tool => {
    html += `<tr><td>${toolNames[tool]}</td>`;
    tasks.forEach(task => {
      const s = metrics[tool].success[task];
      const rate = s.total > 0 ? Math.round(s.count / s.total * 100) : 0;
      html += `<td>${s.count}/${s.total} (${rate}%)</td>`;
    });
    const overallRate = metrics[tool].totalRuns > 0 ? Math.round(metrics[tool].totalSuccess / metrics[tool].totalRuns * 100) : 0;
    html += `<td><strong>${overallRate}%</strong></td>`;
    html += '</tr>\n';
  });
  html += '</tbody></table>\n';
  html += '</div>\n\n';

  // Total Cost Table - sorted by total cost
  html += '<h3>Total Cost</h3>\n';
  html += '<div class="table-wrapper">\n';
  html += '<table class="eval-table">\n';
  html += '<thead><tr><th>Tool</th>';
  tasks.forEach(task => html += `<th>${taskNames[task]}</th>`);
  html += '<th><strong>Total</strong></th></tr></thead>\n';
  html += '<tbody>\n';
  const sortedByCost = [...tools].sort((a, b) => metrics[a].totalCost - metrics[b].totalCost);
  sortedByCost.forEach(tool => {
    html += `<tr><td>${toolNames[tool]}</td>`;
    tasks.forEach(task => {
      html += `<td>$${metrics[tool].cost[task].toFixed(2)}</td>`;
    });
    html += `<td><strong>$${metrics[tool].totalCost.toFixed(2)}</strong></td>`;
    html += '</tr>\n';
  });
  html += '</tbody></table>\n';
  html += '</div>\n\n';

  // Average Cost Table (without total column)
  html += '<h3>Average Cost</h3>\n';
  html += '<div class="table-wrapper">\n';
  html += '<table class="eval-table">\n';
  html += '<thead><tr><th>Tool</th>';
  tasks.forEach(task => html += `<th>${taskNames[task]}</th>`);
  html += '</tr></thead>\n';
  html += '<tbody>\n';
  
  tools.forEach(tool => {
    html += `<tr><td>${toolNames[tool]}</td>`;
    tasks.forEach(task => {
      const runs = evalData['claude-code'][task]?.[tool]?.runs || [];
      if (runs.length > 0) {
        const costs = runs.map(r => r.totalCost || 0);
        const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
        const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avg, 2), 0) / costs.length;
        const stdDev = Math.sqrt(variance);
        html += `<td>$${avg.toFixed(3)} ± $${stdDev.toFixed(3)}</td>`;
      } else {
        html += `<td>-</td>`;
      }
    });
    html += '</tr>\n';
  });
  html += '</tbody></table>\n';
  html += '</div>\n\n';

  // Total Time Table - sorted by total time
  html += '<h3>Total Time</h3>\n';
  html += '<div class="table-wrapper">\n';
  html += '<table class="eval-table">\n';
  html += '<thead><tr><th>Tool</th>';
  tasks.forEach(task => html += `<th>${taskNames[task]}</th>`);
  html += '<th><strong>Total</strong></th></tr></thead>\n';
  html += '<tbody>\n';
  const sortedByTime = [...tools].sort((a, b) => metrics[a].totalTime - metrics[b].totalTime);
  sortedByTime.forEach(tool => {
    html += `<tr><td>${toolNames[tool]}</td>`;
    tasks.forEach(task => {
      html += `<td>${formatTime(metrics[tool].time[task])}</td>`;
    });
    html += `<td><strong>${formatTime(metrics[tool].totalTime)}</strong></td>`;
    html += '</tr>\n';
  });
  html += '</tbody></table>\n';
  html += '</div>\n\n';

  // Average Time Table (without total column)
  html += '<h3>Average Time</h3>\n';
  html += '<div class="table-wrapper">\n';
  html += '<table class="eval-table">\n';
  html += '<thead><tr><th>Tool</th>';
  tasks.forEach(task => html += `<th>${taskNames[task]}</th>`);
  html += '</tr></thead>\n';
  html += '<tbody>\n';
  
  tools.forEach(tool => {
    html += `<tr><td>${toolNames[tool]}</td>`;
    tasks.forEach(task => {
      const runs = evalData['claude-code'][task]?.[tool]?.runs || [];
      if (runs.length > 0) {
        const times = runs.map(r => {
          const dur = r.totalDurationWall;
          if (!dur) return 0;
          let seconds = 0;
          const match = dur.match(/(\d+)m\s*([\d.]+)s/);
          if (match) {
            seconds = parseInt(match[1]) * 60 + parseFloat(match[2]);
          } else if (dur.includes('s')) {
            seconds = parseFloat(dur.replace('s', ''));
          }
          return seconds;
        });
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        html += `<td>${formatTime(avg)} ± ${formatTime(stdDev)}</td>`;
      } else {
        html += `<td>-</td>`;
      }
    });
    html += '</tr>\n';
  });
  html += '</tbody></table>\n';
  html += '</div>\n';

  document.getElementById('evaluation-tables').innerHTML = html;
}

function buildCharts(evaluationData) {
  // Process data for charts
  const tools = ['terminalcp', 'terminalcp-cli', 'tmux', 'screen'];
  const tasks = ['debug-lldb', 'project-analysis', 'python-repl'];
  const toolNames = {
    'terminalcp': 'terminalcp (MCP)',
    'terminalcp-cli': 'terminalcp (CLI)', 
    'tmux': 'tmux',
    'screen': 'screen'
  };

  // Calculate tokens per model per tool
  const sonnetData = { input: {}, output: {} };
  const haikuData = { input: {}, output: {} };
  const cacheData = { read: {}, write: {} };

  tools.forEach(tool => {
    let sonnetInput = 0, sonnetOutput = 0;
    let haikuInput = 0, haikuOutput = 0;
    let cacheRead = 0, cacheWrite = 0;
    
    tasks.forEach(task => {
      const runs = evaluationData['claude-code'][task]?.[tool]?.runs || [];
      runs.forEach(run => {
        if (run.models) {
          if (run.models['claude-sonnet']) {
            sonnetInput += run.models['claude-sonnet'].input || 0;
            sonnetOutput += run.models['claude-sonnet'].output || 0;
            cacheRead += run.models['claude-sonnet'].cacheRead || 0;
            cacheWrite += run.models['claude-sonnet'].cacheWrite || 0;
          }
          if (run.models['claude-3-5-haiku']) {
            haikuInput += run.models['claude-3-5-haiku'].input || 0;
            haikuOutput += run.models['claude-3-5-haiku'].output || 0;
            cacheRead += run.models['claude-3-5-haiku'].cacheRead || 0;
            cacheWrite += run.models['claude-3-5-haiku'].cacheWrite || 0;
          }
        }
      });
    });
    
    sonnetData.input[tool] = sonnetInput;
    sonnetData.output[tool] = sonnetOutput;
    haikuData.input[tool] = haikuInput;
    haikuData.output[tool] = haikuOutput;
    cacheData.read[tool] = cacheRead;
    cacheData.write[tool] = cacheWrite;
  });

  // Create Sonnet tokens chart
  const ctx1 = document.getElementById('sonnetTokenChart').getContext('2d');
  new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: tools.map(t => toolNames[t]),
      datasets: [
        {
          label: 'Sonnet Input Tokens',
          data: tools.map(tool => sonnetData.input[tool]),
          backgroundColor: 'rgba(59, 130, 246, 0.8)'
        },
        {
          label: 'Sonnet Output Tokens',
          data: tools.map(tool => sonnetData.output[tool]),
          backgroundColor: 'rgba(34, 197, 94, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Claude Sonnet Token Usage Across All Tasks'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Tokens'
          }
        }
      }
    }
  });

  // Create Haiku tokens chart
  const ctx2 = document.getElementById('haikuTokenChart').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: tools.map(t => toolNames[t]),
      datasets: [
        {
          label: 'Haiku Input Tokens',
          data: tools.map(tool => haikuData.input[tool]),
          backgroundColor: 'rgba(168, 85, 247, 0.8)'
        },
        {
          label: 'Haiku Output Tokens',
          data: tools.map(tool => haikuData.output[tool]),
          backgroundColor: 'rgba(251, 146, 60, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Claude Haiku Token Usage Across All Tasks'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Tokens'
          }
        }
      }
    }
  });

  // Create cache tokens chart
  const ctx3 = document.getElementById('cacheTokenChart').getContext('2d');
  new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: tools.map(t => toolNames[t]),
      datasets: [
        {
          label: 'Cache Read Tokens',
          data: tools.map(tool => cacheData.read[tool]),
          backgroundColor: 'rgba(239, 68, 68, 0.8)'
        },
        {
          label: 'Cache Write Tokens',
          data: tools.map(tool => cacheData.write[tool]),
          backgroundColor: 'rgba(245, 158, 11, 0.8)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Total Cache Read/Write Tokens Across All Tasks'
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Tokens'
          }
        }
      }
    }
  });
}