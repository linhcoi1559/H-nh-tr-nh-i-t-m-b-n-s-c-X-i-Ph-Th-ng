import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TOOLS, validate, dispatch, callEditor } from '../unreal-ai/server.mjs';

test('UE bridge advertises bounded scene tools and rejects invalid mutations', async () => {
  assert.equal(TOOLS.length, 6);
  assert.throws(() => validate('ue_spawn_mesh', { asset: '/Game/Mesh', label: 'House', location: [NaN, 0, 0] }));
  assert.throws(() => validate('ue_spawn_mesh', { asset: '../../outside', label: 'House', location: [0, 0, 0] }));
  assert.throws(() => validate('ue_transform_actor', { actor: 'a', location: [0, 0, 0], scale: [0, 1, 1] }));
  assert.throws(() => validate('ue_list_actors', { code: 'anything' }));
  const init = await dispatch({ id: 1, method: 'initialize' }, 'unused');
  assert.equal(init.result.serverInfo.name, 'phu-thuong-unreal');
  assert.equal(await dispatch({ method: 'notifications/initialized' }, 'unused'), null);
  assert.equal((await dispatch({ id: 2, method: 'tools/list' }, 'unused')).result.tools.length, 6);
});

test('UE queue refuses offline/stale editors, exchanges responses and cleans timed out requests', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ue-bridge-'));
  try {
    assert.equal((await callEditor(root, 'ue_status', {})).connected, false);
    await assert.rejects(callEditor(root, 'ue_list_actors', {}), /offline/);
    await writeFile(path.join(root, 'heartbeat.json'), JSON.stringify({ time: 1 }));
    assert.equal((await callEditor(root, 'ue_status', {})).connected, false);
    await writeFile(path.join(root, 'heartbeat.json'), JSON.stringify({ time: Date.now() / 1000 }));
    const call = callEditor(root, 'ue_list_actors', { filter: 'House' }, 2000);
    const reqDir = path.join(root, 'requests');
    let filename;
    for (let i = 0; i < 50; i++) {
      filename = (await readdir(reqDir).catch(() => [])).find(n => n.endsWith('.json'));
      if (filename) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(filename);
    const req = JSON.parse(await readFile(path.join(reqDir, filename), 'utf8'));
    assert.equal(req.name, 'ue_list_actors');
    assert.equal(req.args.filter, 'House');
    assert.ok(req.deadline * 1000 > Date.now());
    await writeFile(path.join(root, 'responses', filename), JSON.stringify({ ok: true, result: { actors: ['House'] } }));
    assert.deepEqual(await call, { actors: ['House'] });
    await assert.rejects(callEditor(root, 'ue_list_actors', {}, 100), /deadline/);
    assert.deepEqual(await readdir(reqDir), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('MCP stdio process produces JSON only and reports disconnected editor', async () => {
  const child = spawn(process.execPath, ['unreal-ai/server.mjs', path.resolve('unreal-ai')], { stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', errors = '';
  child.stdout.on('data', d => output += d);
  child.stderr.on('data', d => errors += d);
  child.stdin.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'ue_status', arguments: {} } }) + '\n');
  const exit = await new Promise(resolve => child.on('close', resolve));
  assert.equal(exit, 0, errors);
  const reply = JSON.parse(output.trim());
  assert.equal(JSON.parse(reply.result.content[0].text).connected, false);
});

test('installer preserves project settings, creates backup and refuses plugin overwrite', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ue-project-'));
  try {
    const project = path.join(directory, 'Fixture.uproject');
    const original = JSON.stringify({ FileVersion: 3, EngineAssociation: '5.5', Plugins: [{ Name: 'Existing', Enabled: true }, { Name: 'PythonScriptPlugin', Enabled: false }] });
    await writeFile(project, original);
    const run = promisify(execFile);
    const result = await run(process.execPath, ['unreal-ai/install.mjs', project]);
    const installation = JSON.parse(result.stdout);
    assert.equal(await readFile(installation.backup, 'utf8'), original);
    const updated = JSON.parse(await readFile(project, 'utf8'));
    assert.equal(updated.EngineAssociation, '5.5');
    assert.equal(updated.Plugins.find(p => p.Name === 'Existing').Enabled, true);
    assert.equal(updated.Plugins.find(p => p.Name === 'PythonScriptPlugin').Enabled, true);
    assert.equal(updated.Plugins.find(p => p.Name === 'LocalAIBridge').Enabled, true);
    assert.ok((await readFile(path.join(installation.plugin, 'Content/Python/local_ai_bridge.py'), 'utf8')).includes('register_slate_post_tick_callback'));
    const beforeRetry = await readFile(project, 'utf8');
    await assert.rejects(run(process.execPath, ['unreal-ai/install.mjs', project]), /already exists/);
    assert.equal(await readFile(project, 'utf8'), beforeRetry);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
