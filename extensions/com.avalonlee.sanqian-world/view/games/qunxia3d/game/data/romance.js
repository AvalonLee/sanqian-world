/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-romance.cjs 生成，重跑覆盖
 * P4-E 情缘：34 人表 + 阶段词 + 差事键（**art 头像占位化：同 A/B 族拍板**）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L13923–L13936 · const ROMANCE_CAST
 * view/games/qunxia/game.html L13938–L13938 · const ROMANCE_STAGE_WORD
 * view/games/qunxia/game.html L13939–L13939 · const SIDE_DUTY_IDS
 * view/games/qunxia/game.html L13940–L13940 · const DUTY_WORD
 * ============================================================ */

    const ROMANCE_CAST = [
      { id: 'huangrong', name: '黄蓉', address: '黄姑娘', rival: 'guojing', rivalName: '郭靖', penalty: 40, art: '', bias: ['qingzhai'] },
      { id: 'renyingying', name: '任盈盈', address: '任姑娘', rival: 'linghuchong', rivalName: '令狐冲', penalty: 40, art: '', bias: ['qingzhai', 'chivalry'] },
      { id: 'azhu', name: '阿朱', address: '阿朱', rival: 'xiaofeng', rivalName: '萧峰', penalty: 50, mustFeud: true, art: '', bias: ['qingzhai', 'chivalry'] },
      { id: 'xiaolongnv', name: '小龙女', address: '龙姑娘', rival: 'yangguo', rivalName: '杨过', penalty: 50, mustFeud: true, art: '', bias: ['qingzhai', 'jianyi'] },
      { id: 'zhaomin', name: '赵敏', address: '赵敏', rival: 'zhangwuji', rivalName: '张无忌', penalty: 40, courtLink: true, art: '', bias: ['court', 'qingzhai'] },
      { id: 'huazheng', name: '华筝', address: '华筝', rival: 'guojing', rivalName: '郭靖', penalty: 30, borderLink: true, art: '', bias: ['court', 'qingzhai'] },
      { id: 'zhouzhiruo', name: '周芷若', address: '周姑娘', rival: 'zhangwuji', rivalName: '张无忌', penalty: 40, art: '', bias: ['chousha', 'qingzhai'] },
      { id: 'xiaozhao', name: '小昭', address: '小昭', rival: 'zhangwuji', rivalName: '张无忌', penalty: 30, art: '', bias: ['qingzhai'] },
      { id: 'wangyuyan', name: '王语嫣', address: '王姑娘', rival: 'murongfu', rivalName: '慕容复', penalty: 40, art: '', bias: ['qingzhai', 'jianyi'] },
      { id: 'muwanqing', name: '木婉清', address: '木姑娘', rival: 'duanyu', rivalName: '段誉', penalty: 40, art: '', bias: ['qingzhai'] },
      { id: 'shuang', name: '双儿', address: '双儿', rival: 'weisb', rivalName: '韦小宝', penalty: 40, art: '', bias: ['qingzhai'] },
      { id: 'yue', name: '岳灵珊', address: '岳师妹', rival: 'linghuchong', rivalName: '令狐冲', rival2: 'linpingzhi', rival2Name: '林平之', penalty: 40, art: '', bias: ['jianyi', 'qingzhai'] }
    ];
    const ROMANCE_STAGE_WORD = { met: '相识', warm: '好感', love: '倾心', pledge: '有约', wife: '娘子', side: '侧室' };
    const SIDE_DUTY_IDS = ['ledger', 'pharmacy', 'swordroom', 'intel'];
    const DUTY_WORD = { matron: '主母', ledger: '管账', pharmacy: '药局', swordroom: '剑房', intel: '情报' };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ROMANCE_CAST: ROMANCE_CAST, ROMANCE_STAGE_WORD: ROMANCE_STAGE_WORD, SIDE_DUTY_IDS: SIDE_DUTY_IDS, DUTY_WORD: DUTY_WORD };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { ROMANCE_CAST, ROMANCE_STAGE_WORD, SIDE_DUTY_IDS, DUTY_WORD });
}
