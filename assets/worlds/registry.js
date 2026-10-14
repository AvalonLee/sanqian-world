/* registry.js — G10 世界注册表 + 命名生成器
 * 加载顺序第 1：创建 window.SQ 与 Worlds 表；世界包（xiuxian/index.js）随后填充 pack。
 * status: live 可投生 / coming 灰显待开启 / hidden 完全不露出（UI 走 visibleWorlds）。
 * 第二十批起本表**已无 hidden 实例**（克苏鲁改 coming）；hidden 这一档保留为机制，不是死码——
 * 它由 `SQ.visibleWorlds()` 的过滤分支承担，将来放「内测世界」时用。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.Worlds = {
    xiuxian: {
      id: 'xiuxian',
      displayNameKey: 'world.xiuxian.name',
      status: 'live',
      nameParts: {
        prefix: ['玄', '青', '紫', '太', '九', '沧', '天', '罗', '幽'],
        middle: ['云', '霄', '虚', '阳', '冥', '岚', '岳'],
        suffix: ['界', '境', '天', '域', '洲']
      },
      tagsKeys: ['world.tag.qi', 'world.tag.zone', 'world.tag.trib'],
      pack: null
    },
    guwu: {
      id: 'guwu', displayNameKey: 'world.guwu.name', status: 'coming',
      nameParts: {
        prefix: ['大', '北', '南', '西', '东'],
        middle: ['周', '燕', '夏', '秦'],
        suffix: ['王朝', '九州', '铁原']
      },
      tagsKeys: ['world.tag.zhan', 'world.tag.gate'], pack: null
    },
    magic: { id: 'magic', displayNameKey: 'world.magic.name', status: 'coming', nameParts: null, tagsKeys: [], pack: null },
    tech: { id: 'tech', displayNameKey: 'world.tech.name', status: 'coming', nameParts: null, tagsKeys: [], pack: null },
    urban: { id: 'urban', displayNameKey: 'world.urban.name', status: 'coming', nameParts: null, tagsKeys: [], pack: null },
    /* 克苏鲁第二十批改 hidden → coming：从「完全不露出」变成「屏上灰显待开启」，与另三界同列；
     * 注册表条目本就在（不是新增世界），pack 仍 null ⇒ 依旧不可投生。 */
    cthulhu: { id: 'cthulhu', displayNameKey: 'world.cthulhu.name', status: 'coming', nameParts: null, tagsKeys: [], pack: null }
  };

  /* 世界名生成：各段独立随机拼接。
   * 生成时机 = 创角屏 3 首次渲染；结果固定写入 profile.worldName（工程规范 §2.3）。
   * 同一创角会话内重进不重掷由调用方（view）保证。 */
  SQ.generateWorldName = function (worldId) {
    var W = SQ.Worlds[worldId];
    if (!W || !W.nameParts) return '';
    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    return pick(W.nameParts.prefix) + pick(W.nameParts.middle) + pick(W.nameParts.suffix);
  };

  /* UI 只消费本函数：hidden 世界永不出现 */
  SQ.visibleWorlds = function () {
    var out = [];
    for (var id in SQ.Worlds) {
      if (SQ.Worlds[id].status !== 'hidden') out.push(SQ.Worlds[id]);
    }
    return out;
  };
})();
