"""Editor-only file queue. All Unreal API calls run on the Slate tick thread."""
import json
import time
import uuid
from pathlib import Path
import unreal

_handle = None
_elapsed = 0.0
_heartbeat_elapsed = 1.0
_session = str(uuid.uuid4())


def _atomic_json(target, value):
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
    temporary.replace(target)


def _describe(actor):
    pos = actor.get_actor_location()
    return {'path': actor.get_path_name(), 'label': actor.get_actor_label(),
            'class': actor.get_class().get_name(), 'location': [pos.x, pos.y, pos.z]}


def _actor(subsystem, actor_path):
    for actor in subsystem.get_all_level_actors():
        if actor.get_path_name() == actor_path:
            return actor
    raise ValueError('Actor path not found in the current level')


def execute(name, args):
    subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    if name == 'ue_list_actors':
        needle = args.get('filter', '').lower()
        actors = [a for a in subsystem.get_all_level_actors() if needle in a.get_actor_label().lower()]
        return {'actors': [_describe(a) for a in actors[:200]], 'total': len(actors)}
    if name == 'ue_find_assets':
        folder = args.get('folder', '/Game')
        if folder != '/Game' and not folder.startswith('/Game/'):
            raise ValueError('Folder must be under /Game')
        assets = unreal.EditorAssetLibrary.list_assets(folder, recursive=True, include_folder=False)
        assets = [a for a in assets if args.get('filter', '').lower() in a.lower()]
        return {'assets': assets[:100], 'total': len(assets)}
    if name == 'ue_select_actor':
        actor = _actor(subsystem, args['actor'])
        subsystem.set_selected_level_actors([actor])
        return _describe(actor)
    if name not in ('ue_spawn_mesh', 'ue_transform_actor'):
        raise ValueError('Unknown operation')
    # A single undo transaction per mutation; never auto-save the user's level.
    with unreal.ScopedEditorTransaction('Local AI: ' + name):
        if name == 'ue_spawn_mesh':
            asset = unreal.load_asset(args['asset'])
            if not isinstance(asset, unreal.StaticMesh):
                raise ValueError('Asset is not an existing StaticMesh')
            actor = subsystem.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*args['location']))
            if not actor:
                raise RuntimeError('Editor could not spawn actor')
            try:
                if not actor.static_mesh_component.set_static_mesh(asset):
                    raise RuntimeError('Could not assign mesh')
                actor.set_actor_label(args['label'])
            except Exception:
                subsystem.destroy_actor(actor)
                raise
        else:
            actor = _actor(subsystem, args['actor'])
        actor.modify()
        actor.set_actor_location(unreal.Vector(*args['location']), False, True)
        if 'rotation' in args:
            actor.set_actor_rotation(unreal.Rotator(*args['rotation']), True)
        if 'scale' in args:
            actor.set_actor_scale3d(unreal.Vector(*args['scale']))
        return _describe(actor)


def _tick(delta):
    global _elapsed, _heartbeat_elapsed
    _elapsed += delta
    _heartbeat_elapsed += delta
    if _elapsed < 0.1:
        return
    _elapsed = 0.0
    root = Path(unreal.Paths.project_saved_dir()) / 'LocalAIBridge'
    requests, responses = root / 'requests', root / 'responses'
    try:
        requests.mkdir(parents=True, exist_ok=True)
        responses.mkdir(parents=True, exist_ok=True)
        if _heartbeat_elapsed >= 1.0:
            _heartbeat_elapsed = 0.0
            _atomic_json(root / 'heartbeat.json', {'time': time.time(), 'session': _session,
                         'project': str(unreal.Paths.project_dir()), 'engine': unreal.SystemLibrary.get_engine_version()})
        # Bound work per tick. Expired requests can never replay on the next launch.
        for request in list(requests.glob('*.json'))[:2]:
            if len(request.stem) != 36:
                continue
            data = json.loads(request.read_text(encoding='utf-8'))
            request.unlink()
            if data.get('id') != request.stem:
                continue
            try:
                if data.get('deadline', 0) < time.time():
                    raise ValueError('Request expired; no operation performed')
                result = {'ok': True, 'result': execute(data['name'], data['args'])}
            except Exception as error:
                result = {'ok': False, 'error': str(error)}
            _atomic_json(responses / request.name, result)
        for response in responses.glob('*.json'):
            if time.time() - response.stat().st_mtime > 300:
                response.unlink(missing_ok=True)
    except Exception as error:
        unreal.log_warning('LocalAIBridge: ' + str(error))


def start():
    global _handle
    if _handle is None:
        _handle = unreal.register_slate_post_tick_callback(_tick)
        unreal.log('LocalAIBridge ready: scene tools run in Editor only.')


def stop():
    global _handle
    if _handle is not None:
        unreal.unregister_slate_post_tick_callback(_handle)
        _handle = None
