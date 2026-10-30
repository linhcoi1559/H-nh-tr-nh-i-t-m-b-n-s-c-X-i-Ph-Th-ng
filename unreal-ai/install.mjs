import { readFile, writeFile, cp, access, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = process.argv[2];
if (!project || !path.isAbsolute(project) || !project.endsWith('.uproject')) {
  throw new Error('Usage: node unreal-ai/install.mjs ABSOLUTE_PATH_TO_PROJECT.uproject');
}
const source = path.join(path.dirname(fileURLToPath(import.meta.url)), 'LocalAIBridge');
const destination = path.join(path.dirname(project), 'Plugins', 'LocalAIBridge');
const original = await readFile(project, 'utf8');
const config = JSON.parse(original.replace(/^\uFEFF/, ''));
let exists = true;
try { await access(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; exists = false; }
if (exists) throw new Error('LocalAIBridge already exists; no files were changed.');
config.Plugins ??= [];
for (const name of ['LocalAIBridge', 'PythonScriptPlugin', 'EditorScriptingUtilities']) {
  const entry = config.Plugins.find(p => p.Name === name);
  if (entry) entry.Enabled = true;
  else config.Plugins.push({ Name: name, Enabled: true });
}
const backup = `${project}.before-ai-${Date.now()}.bak`;
await writeFile(backup, original, { flag: 'wx' });
await mkdir(path.dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
await writeFile(`${project}.ai-tmp`, JSON.stringify(config, null, 2) + '\n');
await rename(`${project}.ai-tmp`, project);
console.log(JSON.stringify({ plugin: destination, backup, next: 'Open/restart Unreal Editor, then run ue_status through your MCP client.' }, null, 2));
