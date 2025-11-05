// VORA Router - Cloud Run Server
// Receives GitHub webhooks and routes tasks to optimal agent tiers

import express from 'express';
import { Octokit } from '@octokit/rest';
import { routeTask } from './vora.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// Health check (required for Cloud Run)
app.get('/', (req, res) => {
  res.json({
    service: 'VORA Router',
    version: '1.0.0',
    status: 'healthy',
    description: 'Shannon entropy-based task routing for EQDMC agents',
    features: [
      '7-tier agent system (T1-T6)',
      'Shannon entropy analysis',
      'Cost optimization (80% free execution)',
      'Technical complexity detection',
      'Automatic agent assignment'
    ]
  });
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
  try {
    const { action, issue, repository } = req.body;

    // Only process new issues with "agent-task" label
    if (action !== 'opened') {
      return res.json({ message: 'ignored', reason: 'not a new issue' });
    }

    const hasAgentLabel = issue.labels?.some(l => l.name === 'agent-task');
    if (!hasAgentLabel) {
      return res.json({ message: 'ignored', reason: 'no agent-task label' });
    }

    console.log(`Processing issue #${issue.number}: ${issue.title}`);

    // Extract options from issue body if present
    const options = extractOptions(issue.body || '');

    // Route via VORA
    const result = routeTask(issue.title, issue.body || '', options);

    console.log(`Routed to ${result.agent.name} (Tier ${result.agent.tier})`);
    console.log(`Entropy: ${result.analysis.entropy.toFixed(2)}, Rank: R${result.analysis.estimatedRank}`);
    console.log(`Cost estimate: $${result.costEstimate.toFixed(4)}`);

    // Comment on issue with assignment (if GitHub token available)
    if (octokit && repository && issue) {
      await octokit.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: generateAssignmentComment(result)
      });

      // Add labels
      const labels = [
        `tier-${result.agent.tier}`,
        `rank-r${result.analysis.estimatedRank}`,
        'vora-analyzed'
      ];

      await octokit.issues.addLabels({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        labels
      });

      console.log(`Updated issue #${issue.number} with assignment`);
    }

    res.json({
      success: true,
      issue: issue.number,
      agent: result.agent.name,
      tier: result.agent.tier,
      rank: result.analysis.estimatedRank,
      costEstimate: result.costEstimate,
      timeEstimate: result.timeEstimate
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Manual routing endpoint (for testing)
app.post('/route', (req, res) => {
  try {
    const { title, body, options } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = routeTask(title, body || '', options || {});

    res.json({
      agent: result.agent,
      analysis: result.analysis,
      reasoning: result.reasoning,
      costEstimate: result.costEstimate,
      timeEstimate: result.timeEstimate,
      agentId: result.agentId
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: error.message });
  }
});

function extractOptions(body) {
  const options = {};

  // Extract difficulty if present
  const difficultyMatch = body.match(/Difficulty.*?(R\d+)/i);
  if (difficultyMatch) {
    options.difficulty = difficultyMatch[1];
  }

  // Extract cost tolerance if present
  const costMatch = body.match(/Cost Tolerance.*?:.*?(Free only|Cheap preferred|Standard|Premium OK|Critical)/i);
  if (costMatch) {
    options.costTolerance = costMatch[1];
  }

  return options;
}

function generateAssignmentComment(result) {
  return `## 🤖 VORA Agent Assignment

**Agent Selected**: ${result.agent.name} (Tier ${result.agent.tier})
**Agent ID**: \`${result.agentId}\`
**Model**: ${result.agent.model}

### 📊 Complexity Analysis

- **Shannon Entropy**: ${result.analysis.entropy.toFixed(2)}
- **Estimated Rank**: R${result.analysis.estimatedRank}
- **Technical Terms**: ${result.analysis.technicalCount}
- **Uncertainty Markers**: ${result.analysis.uncertaintyCount}

### 💡 Reasoning

${result.reasoning}

### 💰 Estimates

- **Cost**: $${result.costEstimate.toFixed(4)} (${result.agent.costPer1MTokens > 0 ? `$${result.agent.costPer1MTokens}/1M tokens` : 'FREE'})
- **Time**: ~${result.timeEstimate.toFixed(0)} minutes

---

**Next Steps**: The agent will begin work shortly. You can track progress in this issue.

*Powered by VORA Router - Shannon entropy-based task routing*`;
}

app.listen(PORT, () => {
  console.log(`🚀 VORA Router listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook/github`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/route`);
  console.log(`💪 Ready to route tasks to optimal agent tiers!`);
});
