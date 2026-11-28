import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REGIONS = [
  'us-east-1',
  'us-west-1',
  'eu-west-3',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
];

const REGION_APP_NAMES = {
  'us-east-1': 'jae-tools-us-east-1',
  'us-west-1': 'jae-tools-us-west-1',
  'eu-west-3': 'jae-tools-eu-west-3',
  'eu-central-1': 'jae-tools',
  'ap-northeast-1': 'jae-tools-ap-northeast-1',
  'ap-southeast-1': 'jae-tools-ap-southeast-1',
};

const rootDir = process.cwd();
const nodesFile = path.join(rootDir, 'src/shared/deployed-nodes.json');

function loadExistingNodes() {
  try {
    return JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
  } catch {
    return Object.fromEntries(REGIONS.map((region) => [region, null]));
  }
}

function saveNodes(nodes) {
  fs.writeFileSync(nodesFile, `${JSON.stringify(nodes, null, 2)}\n`, 'utf8');
}

function extractPublicUrl(reportPath, appName, env) {
  if (fs.existsSync(reportPath)) {
    const raw = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const stack = [raw];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      for (const key of ['liveUrl', 'publicUrl', 'url']) {
        const candidate = current[key];
        if (typeof candidate === 'string' && candidate.startsWith('https://')) {
          return candidate.replace(/\/+$/, '');
        }
      }
      for (const value of Object.values(current)) {
        if (value && typeof value === 'object') {
          stack.push(value);
        }
      }
    }
  }

  try {
    const out = execFileSync(
      'npx',
      ['prisma', 'service', 'list', '--project', appName, '--json'],
      { encoding: 'utf8', env: { ...process.env, ...env } },
    );
    const parsed = JSON.parse(out);
    const liveUrl = parsed?.envelope?.result?.services?.[0]?.liveUrl;
    if (typeof liveUrl === 'string' && liveUrl.startsWith('https://')) {
      return liveUrl.replace(/\/+$/, '');
    }
  } catch {
    // Ignore fallback lookup errors.
  }

  return null;
}

function runCommand(cmd, args, env) {
  execFileSync(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

const stage = process.env.PRISMA_STAGE;
const nodes = loadExistingNodes();

console.info('Deploying jae-tools to all Prisma Compute regions:', REGIONS.join(', '));

for (const region of REGIONS) {
  const appName = REGION_APP_NAMES[region];
  const reportPath = path.join(rootDir, `deploy-report-${region}.json`);
  const env = { PRISMA_REGION: region };

  console.info(`\n==> [${region}] Building ${appName}...`);
  runCommand('npm', ['run', 'build'], env);

  const deployArgs = ['prisma', 'deploy', '--name', appName, '--report', reportPath];
  if (stage) {
    deployArgs.push('--stage', stage);
  }

  console.info(`==> [${region}] Deploying ${appName}...`);
  runCommand('npx', deployArgs, env);

  const deployedUrl = extractPublicUrl(reportPath, appName, env);
  fs.rmSync(reportPath, { force: true });
  if (deployedUrl) {
    nodes[region] = deployedUrl;
    saveNodes(nodes);
    console.info(`==> [${region}] Discovered URL: ${deployedUrl}`);
  } else {
    console.warn(`==> [${region}] Could not extract URL from ${reportPath}`);
  }
}

console.info('\n==> Mesh sync pass: updating every region with the full multi-region node directory...');
for (const region of REGIONS) {
  const appName = REGION_APP_NAMES[region];
  const env = { PRISMA_REGION: region };
  runCommand('npm', ['run', 'build'], env);
  const deployArgs = ['prisma', 'deploy', '--name', appName];
  if (stage) {
    deployArgs.push('--stage', stage);
  }
  runCommand('npx', deployArgs, env);
}

console.info('\nAll regional apps deployed:', nodes);
