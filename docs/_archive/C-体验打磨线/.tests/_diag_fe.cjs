/* _diag_fe.cjs — 枚举二批 evil 分支 failE qiPct 与 attr dc（校准用，用后即删） */
'use strict';
const { SQ } = require('./sandbox.cjs').load([]);
const NEW = new Set(['tongmen_kugong','ming_e_jiaoliang','shiyao_zhiyue','zhishi_chuanyi','shangdui_huhang','shijia_denghui','jiemei_yuxian','xiafu_danren','sudi_tiezhan','suanpan_zhanggui','zhujian_renjia','laozu_shounuo','longquan_jishi','yanbao_xueguang','haishang_yinxun','guishi_yexing','mozhe_jiaoyi','longqi_yiwen','canhun_jieti','zhangmen_chizheng','zhujian_luhuo','changcheng_junqing','banfen_fenzang','yinguan_shouduan','duanjian_chongzhu','changcheng_shouye','yuexia_yihun','guiwu_weicheng','chengxia_wenjian','zhuhai_jianyi','zhenmo_liansong','shuyuan_jiangxue','kongxiu_danshi','yasheng_luozi','baiyi_wenjian','shoucheng_jianyi','modao_xiangyao','moxiao_zhangfa','baiyi_guxing','luanxing_yebu']);
const all = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian).filter(e => NEW.has(e.id));
all.forEach(e => {
  const br = (e.choices || {}).evil || {};
  const out = [];
  (function walk(c, path) {
    if (!c) return;
    if (Array.isArray(c)) return c.forEach((x, i) => walk(x, path + '[' + i + ']'));
    if (c.failE && c.failE.qiPct) out.push(path + '.failE=[' + c.failE.qiPct + ']');
    if (c.type === 'attr') out.push(path + '.dc=' + c.dc + '/' + c.attr);
    if (c.type === 'power') out.push(path + '.power=' + c.ratio);
  })(br.check, 'check');
  if (out.length) console.log(e.id + ' | ' + out.join(' | '));
});
