/* xiuxian/lexicon-alchemy.js — 炼丹炼器词表分卷（CJK 白名单文件 · 炼丹炼器卷 v1.1 §十一）
 * key 族：alchemy.*（材料名 30 / 丹药十型+丹纹八型 / 丹方 10 / 图纸 9 / 熟练度档位 / UI / 日志 / 提炼 / 残片兑丹方）。
 * ⚠️ 勿混注记（§3.7 双轨裁定）：本卷丹药一律带「低品」前缀（ap_ 前缀 id），与 shop. 族成品丹
 *   （聚气丹等裸名，id/数值零改动）两轨并行、互不改锚。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var K = {};

  /* ── 材料 30 种（§2.1 分区词族）── */
  K['alchemy.mat.mat_linglu.name'] = '灵露草';
  K['alchemy.mat.mat_qingmu.name'] = '青木屑';
  K['alchemy.mat.mat_heifeng.name'] = '黑风铁砂';
  K['alchemy.mat.mat_fengwen.name'] = '风纹木';
  K['alchemy.mat.mat_yeshou.name'] = '野兽骨片';
  K['alchemy.mat.mat_dansha.name'] = '兽丹砂';
  K['alchemy.mat.mat_jingxue.name'] = '血菁花';
  K['alchemy.mat.mat_shousui.name'] = '兽髓玉';
  K['alchemy.mat.mat_jiaotu.name'] = '焦土晶';
  K['alchemy.mat.mat_gutong.name'] = '古铜残';
  K['alchemy.mat.mat_huoling.name'] = '火灵米';
  K['alchemy.mat.mat_leisui.name'] = '雷髓石';
  K['alchemy.mat.mat_leimu.name'] = '雷纹木';
  K['alchemy.mat.mat_leilian.name'] = '雷池莲';
  K['alchemy.mat.mat_xingchen.name'] = '星陨砂';
  K['alchemy.mat.mat_luanxing.name'] = '乱星晶';
  K['alchemy.mat.mat_xukong.name'] = '虚灵菇';
  K['alchemy.mat.mat_xiuluo.name'] = '修罗骨';
  K['alchemy.mat.mat_xuerong.name'] = '血锻铁';
  K['alchemy.mat.mat_zhanhun.name'] = '战魂晶';
  K['alchemy.mat.mat_longlin.name'] = '龙鳞屑';
  K['alchemy.mat.mat_longxi.name'] = '龙息晶';
  K['alchemy.mat.mat_tianyuan.name'] = '天渊珠';
  K['alchemy.mat.mat_hundun.name'] = '混沌雷髓';
  K['alchemy.mat.mat_jingni.name'] = '沌晶泥';
  K['alchemy.mat.mat_zilei.name'] = '紫雷精';
  K['alchemy.mat.mat_jiewai.name'] = '界外星砂';
  K['alchemy.mat.mat_gudao.name'] = '古道神木';
  K['alchemy.mat.mat_xianyu.name'] = '仙玉髓';
  K['alchemy.mat.mat_wudao.name'] = '悟道石';
  /* 悟道石说明浮层（融合坛点按入口）：物品介绍 + 获取来源（跨区特殊材料，唯一产出口 = 历练采集） */
  K['alchemy.mat.mat_wudao.desc'] = '天地初开时凝下的一缕道韵结晶，非金非玉、不入五行，故不属任何秘境，亦不可提炼。悟道者凭它叩问天机——熔铸自创功法、混沌淬炼、炼制天阶「得谐丹」三处共争此物。';
  K['alchemy.mat.mat_wudao.src.title'] = '获取来源';
  K['alchemy.mat.mat_wudao.src'] = '驻区历练时随本区材料一同拾得：每 1 游戏年结算一次（1~4 枚本区材料），另有 10% 概率额外得悟道石 ×1。闭关修炼与离线潜心悟道期间不产出。';

  /* ── 丹药六型（低品前缀双轨）+ 丹纹四型 + 九转正名 ── */
  K['alchemy.pill.ap_juqi.name'] = '低品聚气丹';
  K['alchemy.pill.ap_juqi.desc'] = '修为产出 +10%，2 时辰';
  K['alchemy.pill.ap_ningshen.name'] = '低品凝神丹';
  K['alchemy.pill.ap_ningshen.desc'] = '离线效率 +15%，8 时辰';
  K['alchemy.pill.ap_cuiti.name'] = '低品淬体丹';
  K['alchemy.pill.ap_cuiti.desc'] = '战力 +8%，2 时辰';
  K['alchemy.pill.ap_zhaocai.name'] = '低品招财丹';
  K['alchemy.pill.ap_zhaocai.desc'] = '灵石产出 +15%，2 时辰';
  K['alchemy.pill.ap_pozhang.name'] = '低品破障丹';
  K['alchemy.pill.ap_pozhang.desc'] = '下次破境修为消耗 −10%（每境界限 1）';
  K['alchemy.pill.ap_zhenjie.name'] = '低品镇劫丹';
  K['alchemy.pill.ap_zhenjie.desc'] = '下次渡劫成算 +0.02（每境界限 1）';
  K['alchemy.pill.ap_fengxing.name'] = '低品驭风丹';
  K['alchemy.pill.ap_fengxing.desc'] = '斗法速度 +12%，2 时辰';
  K['alchemy.pill.ap_xirui.name'] = '低品寻宝丹';
  K['alchemy.pill.ap_xirui.desc'] = '掉落收获 +20%，2 时辰';
  K['alchemy.pill.ap_haina.name'] = '低品纳海丹';
  K['alchemy.pill.ap_haina.desc'] = '修为上限 +25%，4 时辰';
  K['alchemy.pill.ap_daohe.name'] = '低品得谐丹';
  K['alchemy.pill.ap_daohe.desc'] = '功法参悟 +25%，4 时辰';
  K['alchemy.pill.ap_juqi_rw.name'] = '丹纹聚气丹';
  K['alchemy.pill.ap_ningshen_rw.name'] = '丹纹凝神丹';
  K['alchemy.pill.ap_cuiti_rw.name'] = '丹纹淬体丹';
  K['alchemy.pill.ap_zhaocai_rw.name'] = '丹纹招财丹';
  K['alchemy.pill.ap_fengxing_rw.name'] = '丹纹驭风丹';
  K['alchemy.pill.ap_xirui_rw.name'] = '丹纹寻宝丹';
  K['alchemy.pill.ap_haina_rw.name'] = '丹纹纳海丹';
  K['alchemy.pill.ap_daohe_rw.name'] = '丹纹得谐丹';
  K['alchemy.pill.jiuzhuan'] = '九转丹';

  /* ── 丹方 10 + 图纸 9 + 丹炉 ── */
  K['alchemy.recipe.rc_juqi.name'] = '低品聚气丹丹方';
  K['alchemy.recipe.rc_zhaocai.name'] = '低品招财丹丹方';
  K['alchemy.recipe.rc_ningshen.name'] = '低品凝神丹丹方';
  K['alchemy.recipe.rc_cuiti.name'] = '低品淬体丹丹方';
  K['alchemy.recipe.rc_pozhang.name'] = '低品破障丹丹方';
  K['alchemy.recipe.rc_zhenjie.name'] = '低品镇劫丹丹方';
  K['alchemy.recipe.rc_fengxing.name'] = '低品驭风丹丹方';
  K['alchemy.recipe.rc_xirui.name'] = '低品寻宝丹丹方';
  K['alchemy.recipe.rc_xisui.name'] = '低品洗髓丹丹方';
  K['alchemy.recipe.rc_haina.name'] = '低品纳海丹丹方';
  K['alchemy.recipe.rc_daohe.name'] = '低品得谐丹丹方';
  K['alchemy.bp.bp_weapon.name'] = '兵刃图纸';
  K['alchemy.bp.bp_weapon.desc'] = '打造兵刃槽法器（方向：破军/摄灵）';
  K['alchemy.bp.bp_treasure.name'] = '灵器图纸';
  K['alchemy.bp.bp_treasure.desc'] = '打造灵器槽法器（方向：摄灵/护体）';
  K['alchemy.bp.bp_armor.name'] = '甲衣图纸';
  K['alchemy.bp.bp_armor.desc'] = '打造甲衣槽法器（方向：护体/破军）';
  K['alchemy.bp.bp_accessory.name'] = '佩饰图纸';
  K['alchemy.bp.bp_accessory.desc'] = '打造佩饰槽法器（方向：护体/摄灵）';
  K['alchemy.bp.bp_weapon_jing.name'] = '精制兵刃图纸';
  K['alchemy.bp.bp_weapon_jing.desc'] = '打造兵刃槽法器·品阶 +1（材料 ×12，耗时 45 分）';
  K['alchemy.bp.bp_treasure_jing.name'] = '精制灵器图纸';
  K['alchemy.bp.bp_treasure_jing.desc'] = '打造灵器槽法器·品阶 +1（材料 ×12，耗时 45 分）';
  K['alchemy.bp.bp_armor_jing.name'] = '精制甲衣图纸';
  K['alchemy.bp.bp_armor_jing.desc'] = '打造甲衣槽法器·品阶 +1（材料 ×12，耗时 45 分）';
  K['alchemy.bp.bp_accessory_jing.name'] = '精制佩饰图纸';
  K['alchemy.bp.bp_accessory_jing.desc'] = '打造佩饰槽法器·品阶 +1（材料 ×12，耗时 45 分）';
  K['alchemy.bp.bp_furnace.name'] = '丹炉图纸';
  K['alchemy.bp.bp_furnace.desc'] = '打造丹炉（炼丹硬前置，一炉到底）';
  K['alchemy.furnace.name'] = '丹炉';
  K['alchemy.furnace.desc'] = '炼丹硬前置：图纸打造 / 坊市成品 / 驻留福地丹房（或轮回丹房资格）视同拥有';
  K['alchemy.dir.pojun'] = '破军';
  K['alchemy.dir.sheling'] = '摄灵';
  K['alchemy.dir.huti'] = '护体';

  /* ── 熟练度双轨档位 ── */
  K['alchemy.rank.0.name'] = '学徒';
  K['alchemy.rank.1.name'] = '熟练';
  K['alchemy.rank.2.name'] = '精通';
  K['alchemy.rank.3.name'] = '宗师';
  K['alchemy.rank.4.name'] = '百炼';
  K['alchemy.prof.dan'] = '炼丹';
  K['alchemy.prof.qi'] = '炼器';
  K['alchemy.prof.row'] = '{track} · {rank}（{n} 次）';
  /* ── B16-i 版面（设计稿 §炼丹炼器：三格摘要 / 段标 / 炉中条 / 丹匣网格）── */
  K['alchemy.prof.short'] = '{rank} · {n} 次';
  K['alchemy.prof.line'] = '{a} ｜ {b} · 两套熟练度各自涨，互不折算';
  K['alchemy.sum.prof'] = '熟 练';
  K['alchemy.sum.fur'] = '丹 炉';
  K['alchemy.sum.craft'] = '在 炼';
  K['alchemy.ui.craft.n'] = '{n} 炉';
  K['alchemy.ui.danbox'] = '丹 匣';
  K['alchemy.ui.bp.sec'] = '器 台 · 图 纸';
  K['alchemy.ui.mats.n'] = '{n} 种';

  /* ── UI ── */
  K['alchemy.system'] = '炼丹炼器';
  K['alchemy.tab.dan'] = '丹房';
  K['alchemy.tab.qi'] = '器台';
  K['alchemy.ui.dan'] = '炼丹';
  K['alchemy.ui.qi'] = '炼器';
  K['alchemy.ui.mats'] = '材料背包';
  K['alchemy.ui.mats.empty'] = '囊中无一物，去秘境拾些材料';
  K['alchemy.ui.queue'] = '炼制队列';
  K['alchemy.ui.queue.empty'] = '炉中无物';
  K['alchemy.ui.queue.wait'] = '炼制中 · {t}';
  K['alchemy.ui.queue.ready'] = '火候已到';
  K['alchemy.ui.collect'] = '出炉';
  K['alchemy.ui.start'] = '开工';
  K['alchemy.ui.recipe.locked'] = '境界未达（需{realm}）';
  K['alchemy.ui.recipe.none'] = '尚无丹方——坊市货格与残片兑换有售';
  K['alchemy.ui.bp.none'] = '尚无图纸——坊市货格有售';
  K['alchemy.ui.matslack'] = '材料不足';
  K['alchemy.ui.nofurnace'] = '尚无丹炉';
  K['alchemy.ui.refine'] = '提炼';
  K['alchemy.ui.refine.hint'] = '同材 ×4 可炼上一档材料 ×1（仙玉级与悟道石不可炼）';
  /* ── 材料背包的「提炼档」标识（第廿九批 2026-10-13 · 用户诉求：材料顺序乱、要看得出低级料炼成哪种高级料、
   *    同一条升级线要有标识）：n = 本档号、k = 起炼用量（取表 REFINE_IN）、up = 次档号、p = 次档候选种数 ── */
  K['alchemy.ui.mat.rank'] = '第 {n} 档';
  K['alchemy.ui.mat.line'] = '同材 ×{k} 可炼 → 第 {up} 档任一（随机其一 · 共 {p} 种）';
  K['alchemy.ui.mat.line.top'] = '已至顶档，不可再炼（只可出售）';
  K['alchemy.ui.sell'] = '出售';
  K['alchemy.ui.sellall'] = '全售';
  K['alchemy.ui.drink'] = '服用';
  /* 🔧 N43（第册十二批）：`alchemy.ui.pillcap`「丹毒已满（每游戏日 {n} 颗）」随日限整族删除——
   * 1 游戏日 = 1 现实秒 ⇒ 这句永不出现，留着就是说谎的在册文案。 */
  K['alchemy.ui.once'] = '此境界已服过（每境界限 1）';
  K['alchemy.ui.swapfull'] = '本世洗髓之数已尽，此丹服下也无益处（且留着）';
  K['alchemy.ui.stronger'] = '已有更强同源效力在身——此时服用只延长时长';
  K['alchemy.ui.selfmade'] = '自炼';
  K['alchemy.ui.rune'] = '丹纹';
  K['alchemy.ui.dir'] = '词条方向';
  K['alchemy.ui.dir.lock'] = '品阶未达';
  K['alchemy.ui.attr'] = '属性指向（灵品起自由指定）';
  K['alchemy.ui.forge.tier'] = '打造品阶：{tier}（恒低于同期掉落上限）';
  K['alchemy.shopdesc.mat'] = '当前历练区材料包（开箱即入背包）';
  K['alchemy.ui.unlock'] = '筑基之后方开丹火之路';
  K['alchemy.ui.forge.pick'] = '选图纸';
  K['alchemy.ui.matneed'] = '材料 ×{n}';
  K['alchemy.ui.stock'] = '库存 {n}';
  K['alchemy.ui.stockfull'] = '成品库存已满（99/种），先清库存';
  K['alchemy.ui.success'] = '成功率 {p}%';
  K['alchemy.ui.busy'] = '炉中有物，先出炉';
  /* ── 炼制失败原因族（绿灯不等于链通批 · C3）──────────────────────
   * 与 SQ.Alchemy.startCraft 的 reason 全集（realm / busy / furnace / recipe / stock / mats /
   * bp / has / dir / attr / kind）一一对应。其中 5 条**复用本卷既有键**——
   *   realm→alchemy.ui.unlock、busy→alchemy.ui.busy（旧「A6 假阳」实为读点键名写成
   *   alchemy.ui.fail.busy 的**键名不一致**死链，本批复用即收口，不另铸同义键）、
   *   furnace→alchemy.ui.nofurnace、stock→alchemy.ui.stockfull、mats→alchemy.ui.matslack；
   * 故此处只补真缺的 6 条 + 1 条兜底。两侧对接点 = view 的 AL_FAIL_KEYS 表。 */
  K['alchemy.ui.fail.recipe'] = '此丹方尚未入手，或境界未达';
  K['alchemy.ui.fail.bp'] = '尚无此图纸——坊市货格与残片兑换有售';
  K['alchemy.ui.fail.has'] = '丹炉已在身，无需再打造';
  K['alchemy.ui.fail.dir'] = '先定词条方向（品阶未达的方向暂不可选）';
  K['alchemy.ui.fail.attr'] = '灵品起须指定属性指向（精 / 气 / 神）';
  K['alchemy.ui.fail.kind'] = '炼制类别不明——只分炼丹与炼器';
  K['alchemy.ui.fail.other'] = '眼下炼不成：条件未齐';
  /* 服丹失败第三 reason（drinkPill 的 stock）——旧兜底把裸 'stock' 打上屏，同族补一行 */
  K['alchemy.ui.pillnone'] = '囊中无此丹';
  /* 货架双标签用「词缀」词族（坊市标签批 2026-10-09 · UI 卷 §3.4）：丹药与丹方共用品阶。
   * ⚠️ 与功法的 `skill.tier.*`（黄字阶…天字阶）**刻意不同词**——功法叫「字阶」是传承谱系口径，
   * 丹药 / 丹方只说「阶」；两套并存的代价是必须各用各的键，不许为省键而混用（混了会读成「黄字阶丹」）。 */
  K['goods.tier.huang'] = '黄阶';
  K['goods.tier.xuan'] = '玄阶';
  K['goods.tier.di'] = '地阶';
  K['goods.tier.tian'] = '天阶';
  K['alchemy.good.mat'] = '材料包 ×3';
  K['alchemy.good.recipe'] = '丹方 · {name}';
  K['alchemy.good.bp'] = '图纸 · {name}';
  K['alchemy.good.furnace'] = '丹炉成品';

  /* ── 日志 ── */
  K['alchemy.log.overflow'] = '材料背包溢出，自动折算 {n} {cur}';
  K['alchemy.log.gather'] = '采集{zone}灵脉，得材料 {n} 枚';
  K['alchemy.log.farm'] = '灵田入账材料 {n} 枚';
  K['alchemy.log.start.dan'] = '开炉炼制「{name}」';
  K['alchemy.log.start.qi'] = '开炉打造「{name}」';
  K['alchemy.log.win.dan'] = '出炉：{name}';
  K['alchemy.log.fail.dan'] = '炉毁丹失（{name}），材料俱损、手艺照长';
  K['alchemy.log.rune'] = '丹纹突变——{name}出世！';
  K['alchemy.log.fail.qi'] = '打造失败，材料俱损、手艺照长';
  K['alchemy.log.furnace'] = '丹炉制成，从此开炉有据';
  K['alchemy.log.drink.buff'] = '服下{name}';
  K['alchemy.log.drink.pozhang'] = '服下低品破障丹——下次破境消耗 −10%';
  K['alchemy.log.drink.zhenjie'] = '服下低品镇劫丹——下次渡劫成算 +0.02';
  K['alchemy.pill.ap_xisui.name'] = '低品洗髓丹';
  K['alchemy.pill.ap_xisui.desc'] = '服后得洗髓缘一枚，可换去一枚既定天赋（本世限 3 次）';
  K['alchemy.log.drink.xisui'] = '服下低品洗髓丹——骨髓如被春雨洗过，得洗髓缘一枚';
  K['alchemy.log.stock.in'] = '得{name} ×{n}，收入丹匣（现存 {cur}）——何时服用由你定';
  K['alchemy.ui.traded'] = '坊市';
  K['alchemy.log.refine'] = '炼材入宝：{name} ×4 化作 {gain}';
  K['alchemy.shard.pick.recipe'] = '地/天阶丹方';
  K['alchemy.shard.recipe'] = '残片兑方：得「{name}」';
  K['alchemy.shard.pick.bp'] = '普通/精制图纸';
  K['alchemy.shard.bp'] = '残片兑图：得「{name}」';
  K['alchemy.log.sell'] = '售出{name} ×{n}，得 {v} {cur}';
  K['alchemy.log.matpack'] = '购得材料包 ×3';
  /* 🔧 N43（第册十二批）：`alchemy.log.pillcap` 随日限退役（actions.js 那条 daily 分支已删）。 */

  /* ── buff 来源溯源 ── */
  K['buff.src.alchemy'] = '自炼丹';

  SQ.lexRegister('xiuxian', K);
})();
