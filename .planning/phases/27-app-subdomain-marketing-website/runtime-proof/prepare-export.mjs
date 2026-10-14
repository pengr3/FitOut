import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, copyFile, readdir, lstat, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PACKET_ID, SOURCE } from './probe.mjs';

export async function prepareExport({ repository, workspace, name, config, approval }) {
  if (!/^[a-z0-9-]{1,64}$/.test(name) || config.packetId !== PACKET_ID || config.source !== SOURCE) throw new Error('Invalid owned export');
  if (config.approved === true && (approval?.status !== 'approved' || approval.packetId !== PACKET_ID || approval.source !== SOURCE ||
    !approval.approvedAt || !approval.ownerInstruction || !Number.isSafeInteger(config.notAfter) || config.notAfter <= Date.now() ||
    config.notAfter > Date.now() + 3600000 || !config.publicKey.includes('BEGIN PUBLIC KEY'))) throw new Error('Invalid approved diagnostic lease');
  if (config.approved !== true && (config.notAfter !== 0 || config.publicKey !== '')) throw new Error('Prepared export must be inert');
  const exportRoot = resolve(workspace, '.p27');
  const destination = resolve(exportRoot, name);
  if (dirname(destination) !== exportRoot) throw new Error('Export escapes owned directory');
  await mkdir(exportRoot, { recursive: true });
  await mkdir(destination); // No reuse or overwrite; failed exports remain for audit.
  const tar = execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', SOURCE], { cwd: repository, maxBuffer: 100 * 1024 * 1024 });
  const archive = join(exportRoot, `${name}.tar`);
  await writeFile(archive, tar);
  execFileSync('tar', ['-xf', archive, '-C', destination], { windowsHide: true });
  const tree = execFileSync('git', ['ls-tree', '-rz', SOURCE], { cwd: repository, maxBuffer: 20 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
  for (const entry of tree) {
    const [metadata, path] = entry.split('\t'); const [mode, type, hash] = metadata.split(' ');
    if (type !== 'blob' || mode === '120000') throw new Error('Unexpected source tree entry');
    const bytes = await readFile(join(destination, path));
    const actual = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (actual !== hash) throw new Error(`Export differs from accepted Git source: ${path}`);
  }
  const owned = dirname(fileURLToPath(import.meta.url));
  const route = join(destination, 'src/app/api/phase27-provider-proof');
  await mkdir(route);
  await copyFile(join(owned, 'route.ts'), join(route, 'route.ts'));
  await copyFile(join(owned, 'probe.mjs'), join(route, 'probe.mjs'));
  await writeFile(join(route, 'probe-config.json'), JSON.stringify(config, null, 2) + '\n');
  // Prevent accidental copying of local secrets or uncommitted UI work into this export.
  const forbidden = async directory => {
    for (const entry of await readdir(directory)) {
      const full = join(directory, entry); const stat = await lstat(full);
      if (entry === '.env.local' || entry === '.env.production.local' || entry === 'node_modules' || entry === '.vercel') throw new Error('Unexpected local configuration');
      if (stat.isDirectory()) await forbidden(full);
    }
  };
  await forbidden(destination);
  return { packetId: PACKET_ID, source: SOURCE, destination, verifiedBaselineFiles: tree.length, archiveSha256: createHash('sha256').update(tar).digest('hex'),
    addedFiles: ['src/app/api/phase27-provider-proof/route.ts', 'src/app/api/phase27-provider-proof/probe.mjs', 'src/app/api/phase27-provider-proof/probe-config.json'],
    approval: config.approved === true ? 'caller-must-bind-recorded-owner-authority' : 'prepared-inert' };
}
