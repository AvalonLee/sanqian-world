# _calib3.py — 试验 T3：移除二批 evil 分支 failE.qiPct（惩罚由收益折半 + karma 承担）
import io, re, sys

P = 'assets/worlds/xiuxian/events.js'
s = io.open(P, encoding='utf-8').read()

NEW = ['tongmen_kugong','ming_e_jiaoliang','shiyao_zhiyue','zhishi_chuanyi','shangdui_huhang','shijia_denghui','jiemei_yuxian','xiafu_danren','sudi_tiezhan','suanpan_zhanggui','zhujian_renjia','laozu_shounuo','longquan_jishi','yanbao_xueguang','haishang_yinxun','guishi_yexing','mozhe_jiaoyi','longqi_yiwen','canhun_jieti','zhangmen_chizheng','zhujian_luhuo','changcheng_junqing','banfen_fenzang','yinguan_shouduan','duanjian_chongzhu','changcheng_shouye','yuexia_yihun','guiwu_weicheng','chengxia_wenjian','zhuhai_jianyi','zhenmo_liansong','shuyuan_jiangxue','kongxiu_danshi','yasheng_luozi','baiyi_wenjian','shoucheng_jianyi','modao_xiangyao','moxiao_zhangfa','baiyi_guxing','luanxing_yebu']

n3 = 0
for eid in NEW:
    m = re.search(r"    \{ id: '%s'.*?(?=\n    \{ id: '|\n  \];)" % eid, s, re.S)
    if not m: continue
    block = m.group(0)
    if '        evil: {' not in block: continue
    pre, rest = block.split('        evil: {', 1)
    ev, tail = rest.split('        neutral: {', 1)
    tail = '        neutral: {' + tail
    # 移除 evil 段内 failE 中的 qiPct（保留其余 failE 项如 buff/stones）；若 failE 变空则整个删除
    def strip_qipct(text):
        global n3
        c = len(re.findall(r'qiPct: \[[-0-9., ]+\],? ?', text))
        text = re.sub(r'qiPct: \[[-0-9., ]+\],? ?', '', text)
        text = text.replace('failE: {  }', '').replace('failE: {}', '').replace(',  }', ' }').replace(', }', ' }')
        n3 += c
        return text
    ev = strip_qipct(ev)
    s = s.replace(block, pre + '        evil: {' + ev + tail)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('T3 移除 qiPct 处数:', n3)
