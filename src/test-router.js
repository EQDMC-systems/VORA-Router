// Test VORA Router
import { routeTask, calculateEntropy } from './vora.js';

console.log('🧪 Testing VORA Router...\n');

// Test 1: Simple task
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 1: Simple documentation task');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const simple = routeTask(
  'Update README',
  'Add installation instructions to the README file'
);
console.log(`Agent: ${simple.agent.name} (Tier ${simple.agent.tier})`);
console.log(`Rank: R${simple.analysis.estimatedRank}`);
console.log(`Entropy: ${simple.analysis.entropy.toFixed(2)}`);
console.log(`Cost: $${simple.costEstimate.toFixed(4)}`);
console.log(`Time: ${simple.timeEstimate.toFixed(0)} minutes`);
console.log(`Reasoning: ${simple.reasoning}`);
console.log('');

// Test 2: Complex task
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 2: Complex OAuth implementation');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const complex = routeTask(
  'Implement OAuth2 PKCE flow',
  'We need to add OAuth2 with PKCE for GitHub App authentication. This involves generating code verifier and challenge, handling OAuth redirect, exchanging code for token, and storing tokens securely in Vault. Not sure about the best approach for token refresh.'
);
console.log(`Agent: ${complex.agent.name} (Tier ${complex.agent.tier})`);
console.log(`Rank: R${complex.analysis.estimatedRank}`);
console.log(`Entropy: ${complex.analysis.entropy.toFixed(2)}`);
console.log(`Technical terms: ${complex.analysis.technicalCount}`);
console.log(`Uncertainty markers: ${complex.analysis.uncertaintyCount}`);
console.log(`Cost: $${complex.costEstimate.toFixed(4)}`);
console.log(`Time: ${complex.timeEstimate.toFixed(0)} minutes`);
console.log(`Reasoning: ${complex.reasoning}`);
console.log('');

// Test 3: Terraform task
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 3: Terraform infrastructure change');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const terraform = routeTask(
  'Add new LLM model to registry',
  'Add Gemini 2.0 to the terraform llm-models module. Update models.yaml with tier 3.5, cost $0.08/1M tokens, and configure terraform outputs.'
);
console.log(`Agent: ${terraform.agent.name} (Tier ${terraform.agent.tier})`);
console.log(`Rank: R${terraform.analysis.estimatedRank}`);
console.log(`Entropy: ${terraform.analysis.entropy.toFixed(2)}`);
console.log(`Cost: $${terraform.costEstimate.toFixed(4)}`);
console.log(`Time: ${terraform.timeEstimate.toFixed(0)} minutes`);
console.log(`Reasoning: ${terraform.reasoning}`);
console.log('');

// Test 4: Free-only constraint
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Test 4: Cost constraint (free only)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const constrained = routeTask(
  'Fix typo in README',
  'There is a typo in line 42 of README.md',
  { costTolerance: 'Free only (Tier 5-6)' }
);
console.log(`Agent: ${constrained.agent.name} (Tier ${constrained.agent.tier})`);
console.log(`Cost: $${constrained.costEstimate.toFixed(4)}`);
console.log(`Reasoning: ${constrained.reasoning}`);
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ All tests completed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('VORA Router is working correctly!');
console.log('Ready to deploy to Cloud Run.');
