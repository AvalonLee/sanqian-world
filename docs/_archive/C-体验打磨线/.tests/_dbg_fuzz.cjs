/* _dbg_fuzz.cjs — 复刻 fuzz 循环逐轮检查 worlds 丢失时机（用后即删） */
'use strict';
const { SQ } = require('./sandbox.cjs').load([]);
const noopLog = function () {};
function mkProf() { return { worldId: 'xiuxian', name: '测试', gender: 'male', race: 'human', alignBias: 'neutral' }; }
(async () => {
  const ref = {};
  await SQ.mutate(ref, function (s) {
    s.profile.worldId = 'xiuxian';
    s.profile.name = '测试';
    s.worlds.xiuxian = SQ.Worlds.xiuxian.pack.initialState();
  });
  await SQ.claim(ref);
  const mkWs = (over) => Object.assign(ref.worlds.xiuxian, over || {});
  const D = SQ.Worlds.xiuxian.pack.data;
  const M = () => SQ.Mods.collect(mkProf(), ref.worlds.xiuxian, SQ.Worlds.xiuxian.pack, D);
  // 复刻 fuzz：220 轮随机操作（对齐 smoke #113 的六个分支）
  const stubRandom = (v) => { const orig = Math.random; Math.random = typeof v === 'function' ? v : () => v; return () => { Math.random = orig; }; };
  for (var i113 = 0; i113 < 220; i113++) {
    const w113 = ref.worlds.xiuxian;
    const pick113 = Math.floor(Math.random() * 6);
    try {
      if (pick113 === 0) {
        await SQ.mutate(ref, function (s) { s.worlds.xiuxian.lastSave = Date.now() - 30000; });
        await SQ.claim(ref);
      } else if (pick113 === 1) {
        await SQ.mutate(ref, function (s) { s.worlds.xiuxian.zone = Math.floor(Math.random() * 4); });
      } else if (pick113 === 2) {
        await SQ.mutate(ref, function (s) {
          const arts = ['tuna', 'juling', 'yunzong', 'qingxin'];
          const id = arts[Math.floor(Math.random() * 4)];
          const w2 = s.worlds.xiuxian;
          if ((w2.artsKnown || []).indexOf(id) < 0) w2.artsKnown.push(id);
          w2.artsLevels[id] = (w2.artsLevels[id] || 0) + 1;
        });
      } else if (pick113 === 3) {
        await SQ.mutate(ref, function (s) { s.worlds.xiuxian.stones += 1000; });
      } else if (pick113 === 4) {
        // war/quest tick 压测（claim 编排路径）
        const w4 = ref.worlds.xiuxian;
        SQ.Factions.questTick(w4, SQ.Worlds.xiuxian.pack, D, Date.now());
        SQ.Factions.warTick(w4, SQ.Worlds.xiuxian.pack, D, Date.now(), noopLog);
        SQ.Rumors.tick(w4, SQ.Worlds.xiuxian.pack, D, M(), 600000, Date.now(), { log: noopLog });
      } else {
        const w5 = ref.worlds.xiuxian;
        w5.stones = Math.max(0, w5.stones - 500);
      }
    } catch (e) {
      console.log('轮', i113, 'pick', pick113, 'ERR:', e.message);
      break;
    }
    if (!ref.worlds || !ref.worlds.xiuxian) {
      console.log('轮', i113, 'pick', pick113, '→ worlds.xiuxian 丢失！');
      break;
    }
    if (i113 % 40 === 0) console.log('轮', i113, 'OK worlds keys:', Object.keys(ref.worlds).join(','));
  }
  console.log('fuzz 复刻结束, xiuxian:', !!ref.worlds.xiuxian);
})().catch(e => console.log('TOP:', e.message, e.stack.split('\n')[1]));
