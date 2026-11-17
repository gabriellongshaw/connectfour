import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const dry = process.argv.includes('--dry');
const backfill = process.argv.includes('--backfill');
const refresh = process.argv.includes('--refresh');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;
const SUBJECT = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;

const titles = JSON.parse(readFileSync(new URL('./release-titles.json', import.meta.url), 'utf8'));

const isAncestor = (tag, ref) => {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', tag, ref], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const commitTime = ref => Number(git('log', '-1', '--format=%ct', ref)) * 1000;

const dateOf = ref => new Date(commitTime(ref)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const tags = () => git('tag', '--list', 'v*', '--sort=v:refname').split('\n').filter(tag => SEMVER.test(tag));

function commitsBetween(from, to) {
  const range = from ? `${from}..${to}` : to;
  const raw = git('log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', range);
  return raw
    .split('\x1e')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [sha, subject, body = ''] = entry.split('\x1f');
      const match = SUBJECT.exec(subject);
      return {
        sha,
        subject,
        type: match ? match[1] : 'other',
        scope: match && match[2] ? match[2] : '',
        text: match ? match[4] : subject,
        breaking: !!(match && match[3]) || /^BREAKING[ -]CHANGE:/m.test(body)
      };
    });
}

function bumpFor(list) {
  if (list.some(c => c.breaking)) return 'major';
  if (list.some(c => c.type === 'feat')) return 'minor';
  if (list.some(c => c.type === 'fix' || c.type === 'perf')) return 'patch';
  return null;
}

function nextVersion(last, bump) {
  const [major, minor, patch] = last ? SEMVER.exec(last).slice(1).map(Number) : [0, 0, 0];
  if (bump === 'major') return `v${major + 1}.0.0`;
  if (bump === 'minor') return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

const capital = text => text.charAt(0).toUpperCase() + text.slice(1);

const line = c => `- ${c.scope ? `**${c.scope}:** ` : ''}${c.text} (${c.sha.slice(0, 7)})`;

function notesFor(list, from, to, date) {
  const groups = [
    ['Breaking changes', list.filter(c => c.breaking)],
    ['Features', list.filter(c => c.type === 'feat')],
    ['Fixes', list.filter(c => c.type === 'fix' || c.type === 'perf')],
    ['Maintenance', list.filter(c => ['refactor', 'style', 'chore', 'docs', 'build', 'ci', 'test', 'revert'].includes(c.type))]
  ];
  const parts = [`**Released:** ${date}`];
  groups.filter(([, items]) => items.length).forEach(([name, items]) => parts.push(`## ${name}\n\n${items.map(line).join('\n')}`));
  if (from) parts.push(`**Full changelog:** https://github.com/${repo}/compare/${from}...${to}`);
  return parts.join('\n\n');
}

function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}\u2026`;
}

function headline(version, list, fallback) {
  const lead = fallback || (list.find(c => c.type === 'feat') || list.find(c => c.type === 'fix') || list[0] || {}).text;
  return lead ? clip(`Connect Four ${version.slice(1)}: ${capital(lead)}`, 120) : `Connect Four ${version.slice(1)}`;
}

async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  return res;
}

async function createRelease(payload) {
  const res = await github('/releases', { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`release ${payload.tag_name} failed: ${res.status} ${await res.text()}`);
}

const writeVersion = version => writeFileSync(new URL('../version.json', import.meta.url), `${JSON.stringify({ version: version.slice(1) }, null, 2)}\n`);

async function releaseNext() {
  const head = git('rev-parse', 'HEAD');
  if (/\[skip release\]/i.test(git('log', '-1', '--format=%B', head))) {
    console.log('skipped by commit message');
    return;
  }
  if (git('tag', '--points-at', head).split('\n').some(tag => SEMVER.test(tag))) {
    console.log('HEAD is already tagged');
    return;
  }
  const all = tags();
  const reachable = all.filter(tag => isAncestor(tag, head));
  const last = reachable[reachable.length - 1] || null;
  const stale = all.filter(tag => !reachable.includes(tag) && all.indexOf(tag) > (last ? all.indexOf(last) : -1));
  const commits = commitsBetween(last, head);
  const bump = bumpFor(commits);
  if (!bump) {
    console.log(`no release-worthy commits since ${last || 'the start'}`);
    return;
  }
  const version = nextVersion(last, bump);
  const replaced = stale.includes(version);
  const title = headline(version, commits);
  const notes = notesFor(commits, last, version, dateOf(head));
  console.log(`${last || 'none'} -> ${version} (${bump})${replaced ? ' replacing the earlier tag of the same name' : ''}`);
  const others = stale.filter(tag => tag !== version);
  if (others.length) console.log(`tags not on this branch left alone: ${others.join(', ')}`);
  console.log(notes);
  if (dry) return;
  if (replaced) {
    const moved = await github(`/git/refs/tags/${version}`, { method: 'PATCH', body: JSON.stringify({ sha: head, force: true }) });
    if (!moved.ok) throw new Error(`moving ${version} failed: ${moved.status} ${await moved.text()}`);
    const existing = await github(`/releases/tags/${version}`);
    if (existing.ok) {
      const { id } = await existing.json();
      const patched = await github(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify({ name: title, body: notes }) });
      if (!patched.ok) throw new Error(`updating release ${version} failed: ${patched.status} ${await patched.text()}`);
    } else {
      await createRelease({ tag_name: version, name: title, body: notes, draft: false, prerelease: false });
    }
    console.log(`updated ${version}`);
    writeVersion(version);
  } else {
    await createRelease({ tag_name: version, target_commitish: head, name: title, body: notes, draft: false, prerelease: false });
    console.log(`released ${version}`);
    writeVersion(version);
  }
}

async function backfillAll() {
  const list = tags();
  for (let i = 0; i < list.length; i++) {
    const tag = list[i];
    const existing = dry ? { ok: false } : await github(`/releases/tags/${tag}`);
    if (existing.ok && !refresh) {
      console.log(`skip ${tag}: release exists`);
      continue;
    }
    const prev = i ? list[i - 1] : null;
    const commits = commitsBetween(prev, tag);
    const notes = notesFor(commits, prev, tag, dateOf(tag));
    const name = titles[tag] ? `Connect Four ${tag.slice(1)}: ${titles[tag]}` : headline(tag, commits);
    console.log(`release ${tag}: ${name}`);
    if (dry) continue;
    if (existing.ok) {
      const { id } = await existing.json();
      const patched = await github(`/releases/${id}`, { method: 'PATCH', body: JSON.stringify({ name, body: notes }) });
      if (!patched.ok) throw new Error(`updating release ${tag} failed: ${patched.status} ${await patched.text()}`);
      continue;
    }
    await createRelease({ tag_name: tag, name, body: notes, draft: false, prerelease: false, make_latest: i === list.length - 1 ? 'true' : 'false' });
  }
}

if (!repo || (!token && !dry)) {
  console.error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
  process.exit(1);
}

(backfill ? backfillAll() : releaseNext()).catch(e => {
  console.error(e.message);
  process.exit(1);
});