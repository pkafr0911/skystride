import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINISH, readRecord, Run, STEP, Swipe } from './model';
function complete(upper = false, distance = 2.3) {
  const game = new Run();
  game.start();
  for (let i = 0; i < 12000 && game.phase === 'running'; i++) {
    const o = game.next();
    if (o && !game.traversal && o.x - game.x <= distance && (upper || o.kind !== 'branch')) {
      game.action(o.kind === 'slide' || o.kind === 'drop' ? 'down' : 'up');
    }
    game.step();
  }
  return game;
}
test('clean lower and upper routes both complete all three sectors', () => {
  for (const upper of [false, true]) {
    const g = complete(upper);
    assert.equal(g.phase, 'finished');
    assert.equal(g.x, FINISH);
    assert.equal(g.splits.length, 3);
    assert.ok(g.splits[0] < g.splits[1]);
    assert.ok(g.splits[1] < g.splits[2]);
    assert.equal(g.recoveries, 0);
    assert.ok(g.time > 30 && g.time < 60);
  }
});
test('clean technical route beats clean lower route', () => {
  assert.ok(complete(true).time < complete(false).time);
});
test('early execution costs actual completion time', () => {
  assert.ok(complete(false, 5).time > complete(false).time + 1);
});
test('same inputs produce identical records', () => {
  assert.deepEqual(complete(true).record(), complete(true).record());
});
test('missed gap ends run and freezes time', () => {
  const g = new Run();
  g.start();
  for (let i = 0; i < 1500; i++) g.step();
  assert.equal(g.phase, 'failed');
  const time = g.time;
  g.step();
  assert.equal(g.time, time);
});
test('late but reachable jump uses a slower ledge catch', () => {
  const g = new Run();
  g.start();
  g.x = 41;
  g.action('up');
  assert.equal(g.move, 'catch');
  assert.equal(g.recoveries, 1);
  assert.ok(g.traversal!.duration > 1.5);
});
test('wrong action cannot clear a low passage', () => {
  const g = new Run();
  g.start();
  g.x = 63;
  g.action('up');
  assert.equal(g.traversal, null);
  g.action('down');
  assert.equal(g.move, 'slide');
});
test('one traversal cannot be retriggered by repeat input', () => {
  const g = new Run();
  g.start();
  g.x = 20;
  g.action('up');
  const t = g.traversal;
  g.action('up');
  assert.equal(g.traversal, t);
  assert.equal(g.clean, 1);
});
test('pause freezes simulation and excludes personal best', () => {
  const g = new Run();
  g.start();
  g.step();
  g.pause();
  g.step();
  assert.equal(g.time, STEP);
  assert.equal(g.eligible, false);
  g.pause();
  g.step();
  assert.equal(g.time, STEP * 2);
});
test('restart clears all state and restores eligibility', () => {
  const g = complete(true);
  g.pause();
  g.start();
  assert.equal(g.time, 0);
  assert.equal(g.upper, false);
  assert.equal(g.clean, 0);
  assert.equal(g.handled.size, 0);
  assert.equal(g.samples.length, 0);
  assert.equal(g.eligible, true);
});
test('practice begins at a sector boundary and is never record eligible', () => {
  const g = new Run();
  g.start(2, true);
  assert.equal(g.x, 216);
  assert.equal(g.eligible, false);
  assert.equal(g.next()?.x, 224);
});
test('record validation accepts finished replay and rejects corrupt data', () => {
  const r = complete().record();
  assert.deepEqual(readRecord(JSON.stringify(r)), r);
  assert.equal(readRecord('{'), null);
  assert.equal(readRecord(JSON.stringify({ ...r, version: 'old' })), null);
  assert.equal(readRecord(JSON.stringify({ ...r, samples: [[0, 99999, 0, 'run']] })), null);
  assert.equal(
    readRecord(
      JSON.stringify({
        ...r,
        samples: [
          [1, 2, 0, 'run'],
          [0, 2, 0, 'run'],
        ],
      }),
    ),
    null,
  );
});
test('swipes fire before release, reject jitter and fire only once', () => {
  const s = new Swipe();
  s.start(100, 100);
  assert.equal(s.move(104, 92), null);
  assert.equal(s.move(105, 72), 'up');
  assert.equal(s.move(105, 45), null);
  s.start(100, 100);
  assert.equal(s.move(130, 104), null);
  assert.equal(s.move(105, 130), 'down');
});
