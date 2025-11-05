// VORA - Shannon Entropy Router
// Routes tasks to optimal agent tier based on complexity

/**
 * Calculate Shannon entropy of text
 * Higher entropy = more complex = needs smarter model
 */
export function calculateEntropy(text) {
  const freq = {};
  const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 0);

  if (tokens.length === 0) return 0;

  // Count word frequencies
  tokens.forEach(token => {
    freq[token] = (freq[token] || 0) + 1;
  });

  // Calculate Shannon entropy: H(X) = -Σ p(x) * log2(p(x))
  const total = tokens.length;
  let entropy = 0;

  Object.values(freq).forEach(count => {
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });

  return entropy;
}

/**
 * Analyze task complexity using multiple signals
 */
export function analyzeComplexity(title, body) {
  const fullText = `${title} ${body}`.toLowerCase();

  // Shannon entropy
  const entropy = calculateEntropy(fullText);

  // Technical terms (higher = more complex)
  const technicalTerms = [
    'oauth', 'pkce', 'jwt', 'webhook', 'api', 'authentication',
    'authorization', 'encryption', 'database', 'migration',
    'refactor', 'architecture', 'distributed', 'concurrency',
    'async', 'race condition', 'terraform', 'kubernetes',
    'docker', 'ci/cd', 'deployment', 'infrastructure'
  ];
  const technicalCount = technicalTerms.filter(term =>
    fullText.includes(term)
  ).length;

  // Uncertainty markers (higher = more complex)
  const uncertaintyMarkers = [
    'maybe', 'not sure', 'investigate', 'figure out',
    'explore', 'unclear', 'complex', 'difficult',
    'how to', 'why', 'what if'
  ];
  const uncertaintyCount = uncertaintyMarkers.filter(marker =>
    fullText.includes(marker)
  ).length;

  // Cross-file dependencies (higher = more complex)
  const crossFileDeps = (
    fullText.match(/multiple files|across files|refactor|migrate/g) || []
  ).length;

  // Estimate rank (R1-R9)
  let estimatedRank;

  if (entropy > 4.5 || technicalCount > 5 || uncertaintyCount > 3) {
    estimatedRank = 9; // Novel/Critical
  } else if (entropy > 3.8 || technicalCount > 3) {
    estimatedRank = 7; // Complex
  } else if (entropy > 3.0 || technicalCount > 1) {
    estimatedRank = 5; // Standard
  } else if (entropy > 2.0) {
    estimatedRank = 3; // Simple
  } else {
    estimatedRank = 2; // Trivial
  }

  return {
    entropy,
    technicalCount,
    uncertaintyCount,
    crossFileDeps,
    estimatedRank
  };
}

/**
 * Agent tier definitions (matches Terraform modules)
 */
const AGENT_TIERS = [
  {
    tier: 1,
    name: 'Executive',
    prefix: 'e',
    model: 'claude-opus-4.1',
    costPer1MTokens: 15.00,
    rank: 9,
    minRank: 9
  },
  {
    tier: 2,
    name: 'Manager',
    prefix: 'm',
    model: 'claude-sonnet-4.5',
    costPer1MTokens: 3.00,
    rank: 8,
    minRank: 7
  },
  {
    tier: 3,
    name: 'Worker',
    prefix: 'w',
    model: 'deepseek-chat',
    costPer1MTokens: 0.14,
    rank: 6,
    minRank: 5
  },
  {
    tier: 4,
    name: 'Intern',
    prefix: 'i',
    model: 'qwen-32b-vast',
    costPer1MTokens: 0.05,
    rank: 5,
    minRank: 4
  },
  {
    tier: 5,
    name: 'FreeAgent',
    prefix: 'f',
    model: 'qwen-14b-local',
    costPer1MTokens: 0.00,
    rank: 4,
    minRank: 3
  },
  {
    tier: 6,
    name: 'Script',
    prefix: 's',
    model: 'bash-script',
    costPer1MTokens: 0.00,
    rank: 2,
    minRank: 1
  }
];

/**
 * Route task to optimal agent tier
 */
export function routeTask(title, body, options = {}) {
  const analysis = analyzeComplexity(title, body);

  // Manual override from issue metadata
  const manualRank = options.difficulty
    ? parseInt(options.difficulty.match(/R(\d+)/)?.[1] || '0')
    : null;

  const targetRank = manualRank || analysis.estimatedRank;

  // Select agent tier based on rank
  const selectedAgent = AGENT_TIERS.find(
    agent => targetRank >= agent.minRank
  ) || AGENT_TIERS[AGENT_TIERS.length - 1];

  // Cost tolerance override
  if (options.costTolerance === 'Free only (Tier 5-6)') {
    const freeAgent = AGENT_TIERS.find(a => a.tier >= 5);
    if (freeAgent) return buildResponse(freeAgent, analysis, 'Cost constraint: free only');
  }

  // Estimate cost
  const estimatedTokens = (title.length + body.length) * 1.5; // rough estimate
  const costEstimate = (estimatedTokens / 1_000_000) * selectedAgent.costPer1MTokens;

  // Time estimate (inverse of tier - lower tier = slower)
  const baseTime = 10; // minutes
  const tierMultiplier = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0][selectedAgent.tier - 1] || 1.0;
  const timeEstimate = baseTime * tierMultiplier;

  const modelPrefix = selectedAgent.model.split('-')[0]; // claude, deepseek, etc

  return {
    agent: selectedAgent,
    analysis,
    reasoning: getReasoning(selectedAgent, analysis),
    costEstimate,
    timeEstimate,
    agentId: `a-${selectedAgent.prefix}-worker_v1.0-${modelPrefix}_20251105-r${selectedAgent.rank}`
  };
}

function getReasoning(agent, analysis) {
  const reasons = [];

  if (analysis.estimatedRank >= 9) {
    reasons.push('Critical/novel task requiring top-tier reasoning');
  } else if (analysis.estimatedRank >= 7) {
    reasons.push('Complex task with architectural implications');
  } else if (analysis.estimatedRank >= 5) {
    reasons.push('Standard feature/fix with moderate complexity');
  } else if (analysis.estimatedRank >= 3) {
    reasons.push('Simple task with clear requirements');
  } else {
    reasons.push('Trivial task suitable for basic execution');
  }

  if (analysis.technicalCount > 3) {
    reasons.push(`High technical complexity (${analysis.technicalCount} technical terms)`);
  }

  if (analysis.uncertaintyCount > 0) {
    reasons.push(`Uncertainty present (${analysis.uncertaintyCount} markers)`);
  }

  return reasons.join('. ');
}

function buildResponse(agent, analysis, reasoning) {
  const modelPrefix = agent.model.split('-')[0];
  return {
    agent,
    analysis,
    reasoning,
    costEstimate: 0,
    timeEstimate: 10,
    agentId: `a-${agent.prefix}-worker_v1.0-${modelPrefix}_20251105-r${agent.rank}`
  };
}
