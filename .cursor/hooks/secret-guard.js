#!/usr/bin/env node
const {
  repoRootFrom,
  git,
  readLastReviewedSha,
  isGitIgnored,
  isForbiddenFilename,
  scanText,
  scanGitDiff,
  formatFindings,
} = require('./lib/secrets');

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function handleSessionStart(input) {
  const repoRoot = repoRootFrom(input);
  const last = readLastReviewedSha(repoRoot);
  let head = '';
  try {
    head = git(repoRoot, ['rev-parse', 'HEAD']);
  } catch {
    head = '(unknown)';
  }

  let commits = [];
  let findings = [];
  if (last && head && last !== head) {
    try {
      const log = git(repoRoot, ['log', '--oneline', `${last}..${head}`]);
      commits = log ? log.split('\n').slice(0, 20) : [];
    } catch {
      commits = [];
    }
    findings = scanGitDiff(repoRoot, [`${last}..${head}`]);
  }

  const lines = [
    'Credential-leak cursor (creds.log, gitignored).',
    `Last reviewed SHA: ${last || '(missing — create creds.log)'}`,
    `HEAD: ${head}`,
  ];
  if (!last) {
    lines.push('No cursor yet. After a clean review, write HEAD to creds.log.');
  } else if (commits.length === 0) {
    lines.push('No unreviewed commits. Cursor is current.');
  } else {
    lines.push(`Unreviewed commits (${commits.length}):`);
    lines.push(...commits.map((line) => `- ${line}`));
    if (findings.length) {
      lines.push(`Possible leaks in ${last}..HEAD (do not echo secret values): ${formatFindings(findings)}`);
    } else {
      lines.push(`No high-confidence secret patterns in git diff ${last}..HEAD. After confirming, overwrite creds.log with HEAD.`);
    }
  }

  send({
    env: { OPEN_DOME_CREDS_LAST_SHA: last || '' },
    additional_context: lines.join('\n'),
  });
}

function deny(agentMessage, userMessage) {
  send({
    permission: 'deny',
    agent_message: agentMessage,
    user_message: userMessage || agentMessage,
  });
}

function allow() {
  send({ permission: 'allow' });
}

function collectWriteText(toolInput) {
  return [
    toolInput?.contents,
    toolInput?.new_string,
    toolInput?.old_string,
  ]
    .filter(Boolean)
    .join('\n');
}

function handlePreToolUse(input) {
  const toolName = input.tool_name || '';
  if (!/^(Write|StrReplace)$/i.test(toolName)) {
    allow();
    return;
  }

  const repoRoot = repoRootFrom(input);
  const filePath = input.tool_input?.path || input.tool_input?.file_path || '';
  if (!filePath) {
    allow();
    return;
  }

  if (isGitIgnored(repoRoot, filePath)) {
    allow();
    return;
  }

  if (isForbiddenFilename(filePath)) {
    deny(
      `Blocked write to ${filePath}: credential-like filename must stay gitignored. Do not add it to git.`,
      `Blocked write to a credential-like file: ${filePath}`,
    );
    return;
  }

  const hits = scanText(collectWriteText(input.tool_input || {}));
  if (hits.length) {
    deny(
      `Blocked write to ${filePath}: possible secrets (${hits.join(', ')}). Put real values in gitignored .env. Do not echo the secret.`,
      `Blocked a write that looks like a credential leak in ${filePath}`,
    );
    return;
  }

  allow();
}

function isGitCommitOrAdd(command) {
  return /\bgit\b[\s\S]*\b(commit|add)\b/i.test(command || '');
}

function handleBeforeShell(input) {
  const command = input.command || '';
  if (!isGitCommitOrAdd(command)) {
    allow();
    return;
  }

  const repoRoot = repoRootFrom(input);
  const findings = scanGitDiff(repoRoot, ['--cached']);
  if (findings.length) {
    deny(
      `Blocked git command: staged diff looks like leaked credentials (${formatFindings(findings)}). Unstage those files. Do not echo secret values.`,
      'Blocked git add/commit: staged changes look like a credential leak.',
    );
    return;
  }

  let staged = '';
  try {
    staged = git(repoRoot, ['diff', '--cached', '--name-only']);
  } catch {
    staged = '';
  }
  const forbidden = staged
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => isForbiddenFilename(file) || /(^|\/)creds\.log$/i.test(file));
  if (forbidden.length) {
    deny(
      `Blocked git command: do not stage credential files (${forbidden.join(', ')}).`,
      'Blocked git add/commit of credential files.',
    );
    return;
  }

  allow();
}

async function main() {
  const input = await readInput();
  const event = input.hook_event_name || process.argv[2] || '';

  if (event === 'sessionStart') {
    handleSessionStart(input);
    return;
  }
  if (event === 'preToolUse') {
    handlePreToolUse(input);
    return;
  }
  if (event === 'beforeShellExecution') {
    handleBeforeShell(input);
    return;
  }

  send({});
}

main().catch((error) => {
  send({
    permission: 'deny',
    agent_message: `Credential-leak hook failed closed: ${error.message}`,
    user_message: 'Credential-leak hook failed; blocking the action.',
  });
  process.exit(0);
});
