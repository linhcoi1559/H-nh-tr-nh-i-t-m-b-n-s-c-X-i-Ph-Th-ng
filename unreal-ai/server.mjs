import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const vector = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };
const schema = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
export const TOOLS = [
  { name: 'ue_status', description: 'Read Unreal Editor bridge heartbeat; does not start Unreal.', inputSchema: schema() },
  { name: 'ue_list_actors', description: 'Read actors in the current Editor level, optionally filtering by label.', inputSchema: schema({ filter: { type: 'string' } }) },
  { name: 'ue_find_assets', description: 'Find existing assets under /Game. Returns up to 100 asset paths.', inputSchema: schema({ folder: { type: 'string' }, filter: { type: 'string' } }) },
  { name: 'ue_spawn_mesh', description: 'Place an existing static mesh asset in the Editor level. Undoable; does not save. Coordinates in centimetres; rotation is pitch,yaw,roll.', inputSchema: schema({ asset: { type: 'string' }, label: { type: 'string' }, location: vector, rotation: vector, scale: vector }, ['asset', 'label', 'location']) },
  { name: 'ue_transform_actor', description: 'Move/rotate/scale an actor by its exact path. Undoable; does not save.', inputSchema: schema({ actor: { type: 'string' }, location: vector, rotation: vector, scale: vector }, ['actor', 'location']) },
  { name: 'ue_select_actor', description: 'Select an actor by exact path in the Editor.', inputSchema: schema({ actor: { type: 'string' } }, ['actor']) },
];

export function validate(name, args) {
  const tool = TOOLS.find(t => t.name === name);
  if (!tool) throw new Error('Unknown tool');
  if (!args || Array.isArray(args) || typeof args !== 'object') throw new Error('Arguments must be an object');
  for (const key of tool.inputSchema.required) if (!(key in args)) throw new Error(`Missing ${key}`);
  for (const [key, value] of Object.entries(args)) {
    const spec = tool.inputSchema.properties[key];
    if (!spec) throw new Error(`Unknown argument: ${key}`);
    if (spec.type === 'string' && (typeof value !== 'string' || value.length > 512)) throw new Error(`Invalid ${key}`);
    if (spec.type === 'array' && (!Array.isArray(value) || value.length !== 3 || value.some(v => !Number.isFinite(v) || Math.abs(v) > 1e7))) throw new Error(`Invalid ${key}`);
  }
  if (args.asset && !/^\/(Game|Engine)\/[A-Za-z0-9_./]+$/.test(args.asset)) throw new Error('Use an existing /Game or /Engine asset path');
  if (args.folder && !/^\/Game(?:\/[A-Za-z0-9_/]+)?$/.test(args.folder)) throw new Error('Asset folder must be under /Game');
  if (args.scale?.some(v => v <= 0 || v > 100)) throw new Error('Scale must be > 0 and <= 100');
  return args;
}

export async function callEditor(queue, name, args, timeout = 15000) {
  validate(name, args);
  if (name === 'ue_status') {
    try {
      const heartbeat = JSON.parse(await readFile(path.join(queue, 'heartbeat.json'), 'utf8'));
      return { ...heartbeat, connected: Date.now() - heartbeat.time * 1000 < 5000 };
    } catch { return { connected: false, reason: 'Open the UE project with LocalAIBridge enabled.' }; }
  }
  const status = await callEditor(queue, 'ue_status', {});
  if (!status.connected) throw new Error('Unreal Editor bridge is offline. No command was queued.');
  const id = randomUUID();
  const request = path.join(queue, 'requests', `${id}.json`);
  const response = path.join(queue, 'responses', `${id}.json`);
  await mkdir(path.dirname(request), { recursive: true });
  await mkdir(path.dirname(response), { recursive: true });
  await writeFile(`${request}.tmp`, JSON.stringify({ id, name, args, deadline: (Date.now() + timeout) / 1000 }));
  await rename(`${request}.tmp`, request);
  const until = Date.now() + timeout;
  try {
    while (Date.now() < until) {
      try {
        const result = JSON.parse(await readFile(response, 'utf8'));
        await unlink(response);
        if (!result.ok) throw new Error(result.error);
        return result.result;
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Editor did not respond before deadline. Inspect the level before retrying a mutation.');
  } finally { await unlink(request).catch(() => {}); }
}

export async function dispatch(message, queue) {
  if (message.id === undefined) return null;
  const reply = result => ({ jsonrpc: '2.0', id: message.id, result });
  if (message.method === 'initialize') return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'phu-thuong-unreal', version: '0.1.0' } });
  if (message.method === 'ping') return reply({});
  if (message.method === 'tools/list') return reply({ tools: TOOLS });
  if (message.method === 'tools/call') {
    try {
      const result = await callEditor(queue, message.params?.name, message.params?.arguments ?? {});
      return reply({ content: [{ type: 'text', text: JSON.stringify(result) }] });
    } catch (error) { return reply({ isError: true, content: [{ type: 'text', text: error.message }] }); }
  }
  return { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not found' } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const project = process.argv[2];
  if (!project || !path.isAbsolute(project)) { process.stderr.write('Usage: node server.mjs ABSOLUTE_UE_PROJECT_DIRECTORY\n'); process.exit(1); }
  const queue = path.join(project, 'Saved', 'LocalAIBridge');
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    let response;
    try { response = await dispatch(JSON.parse(line), queue); }
    catch { response = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON' } }; }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}
