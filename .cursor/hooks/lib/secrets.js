const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const PLACEHOLDER =
  /^(your[_-]?|changeme|change[_-]?me|xxx+|placeholder|example|todo|insert|replace|dummy|secret[_-]?here|test[_-]?secret)/i;

const PATTERNS = [
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'aws-secret-key', re: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/ },
  { id: 'private-key-block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { id: 'github-token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/ },
  { id: 'github-pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { id: 'stripe-key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'gcp-private-key-json', re: /"private_key"\s*:\s*"-----BEGIN/ },
  { id: 'openai-key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: 'jwt-secret-literal', re: /\bJWT_SECRET\s*[=:]\s*['"][^'"]{12,}['"]/ },
];

const GENERIC_ASSIGN =
  /\b(?:api[_-]?key|secret(?:_key)?|password|passwd|private[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*['"]([^'"]{16,})['"]/gi;

const SKIP_DIFF_PATH = /(?:^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|node_modules\/)/i;

function repoRootFrom(input) {
  const root = input.workspace_roots?.[0];
  if (root) return root;
  let dir = input.cwd || process.cwd();
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function git(repoRoot, args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readLastReviewedSha(repoRoot) {
  const filePath = path.join(repoRoot, 'creds.log');
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^[0-9a-f]{7,40}$/i.test(trimmed)) return trimmed.toLowerCase();
  }
  return null;
}

function isGitIgnored(repoRoot, filePath) {
  try {
    git(repoRoot, ['check-ignore', '-q', filePath]);
    return true;
  } catch {
    return false;
  }
}

function isForbiddenFilename(filePath) {
  const base = path.basename(filePath);
  if (base === 'creds.log') return false;
  if (base === '.env') return true;
  if (base.startsWith('.env.') && !/\.example(\.|$)/i.test(base)) return true;
  if (/^credential(s)?\.json$/i.test(base)) return true;
  if (/\.pem$/i.test(base)) return true;
  if (/^(id_rsa|id_ed25519|id_ecdsa)$/i.test(base)) return true;
  return false;
}

function isLocalAppScript(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  if (/\/scripts\/update-(packages|version)\.js$/i.test(normalized)) return false;
  return /(?:^|\/)(?:Landing|OpenDome\/OpenDomeApp|OpenDome\/OpenDomeSandbox|OpenDome\/OpenDomeMiniApps\/[^/]+)\/scripts\//i.test(
    normalized,
  );
}

function looksLikePlaceholder(value) {
  const v = String(value).trim();
  if (PLACEHOLDER.test(v)) return true;
  if (/process\.env|import\.meta|\$\{|<[A-Z_]+>/.test(v)) return true;
  if (/^(true|false|null|undefined)$/i.test(v)) return true;
  return false;
}

function scanText(text) {
  if (!text) return [];
  const hits = [];
  for (const { id, re } of PATTERNS) {
    if (re.test(text)) hits.push(id);
  }
  GENERIC_ASSIGN.lastIndex = 0;
  let match = GENERIC_ASSIGN.exec(text);
  while (match) {
    if (!looksLikePlaceholder(match[1])) hits.push('generic-secret-literal');
    match = GENERIC_ASSIGN.exec(text);
  }
  return [...new Set(hits)];
}

function scanGitDiff(repoRoot, rangeArgs) {
  let diff = '';
  try {
    diff = git(repoRoot, ['diff', ...rangeArgs]);
  } catch {
    return [];
  }
  const findings = [];
  let currentFile = null;
  let body = [];
  const flush = () => {
    if (!currentFile || SKIP_DIFF_PATH.test(currentFile)) return;
    const added = body.filter((line) => line.startsWith('+') && !line.startsWith('+++')).join('\n');
    const ids = scanText(added);
    if (ids.length) findings.push({ file: currentFile, ids });
  };
  for (const line of diff.split('\n')) {
    const fileMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (fileMatch) {
      flush();
      currentFile = fileMatch[2];
      body = [];
      continue;
    }
    body.push(line);
  }
  flush();
  return findings;
}

function formatFindings(findings) {
  return findings
    .map((item) => `${item.file} (${item.ids.join(', ')})`)
    .join('; ');
}

module.exports = {
  repoRootFrom,
  git,
  readLastReviewedSha,
  isGitIgnored,
  isForbiddenFilename,
  isLocalAppScript,
  scanText,
  scanGitDiff,
  formatFindings,
};
