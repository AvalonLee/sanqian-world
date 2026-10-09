# _calib.py v2 — 二批 evil 分支数值杠杆校准（T1=failE 幅度；T2=+attr dc hard→medium）
import io, re, sys

P = 'assets/worlds/xiuxian/events.js'
s = io.open(P, encoding='utf-8').read()
t1 = '--t1' in sys.argv
t2 = '--t2' in sys.argv

NEW = ['tongmen_kugong','ming_e_jiaoliang','shiyao_zhiyue','zhishi_chuanyi','shangdui_huhang','shijia_denghui','jiemei_yuxian','xiafu_danren','sudi_tiezhan','suanpan_zhanggui','zhujian_renjia','laozu_shounuo','longquan_jishi','yanbao_xueguang','haishang_yinxun','guishi_yexing','mozhe_jiaoyi','longqi_yiwen','canhun_jieti','zhangmen_chizheng','zhujian_luhuo','changcheng_junqing','banfen_fenzang','yinguan_shouduan','duanjian_chongzhu','changcheng_shouye','yuexia_yihun','guiwu_weicheng','chengxia_wenjian','zhuhai_jianyi','zhenmo_liansong','shuyuan_jiangxue','kongxiu_danshi','yasheng_luozi','baiyi_wenjian','shoucheng_jianyi','modao_xiangyao','moxiao_zhangfa','baiyi_guxing','luanxing_yebu']

n1 = n2 = 0
for eid in NEW:
    m = re.search(r"    \{ id: '%s'.*?(?=\n    \{ id: '|\n  \];)" % eid, s, re.S)
    if not m:
        print('BLOCK MISS:', eid); continue
    block = m.group(0)
    if '        evil: {' not in block:
        continue
    pre, rest = block.split('        evil: {', 1)
    if '        neutral: {' in rest:
        ev, post = rest.split('        neutral: {', 1)
        tail = '        neutral: {' + post
    else:
        ev, tail = rest, ''
    if t1:
        c = ev.count('qiPct: [-0.15, -0.12]') + ev.count('qiPct: [-0.15, -0.1]')
        ev = ev.replace('qiPct: [-0.15, -0.12]', 'qiPct: [-0.12, -0.08]').replace('qiPct: [-0.15, -0.1]', 'qiPct: [-0.12, -0.1]')
        n1 += c
    if t2:
        c = ev.count("dc: 'hard'")
        ev = ev.replace("dc: 'hard'", "dc: 'medium'")
        n2 += c
    s = s.replace(block, pre + '        evil: {' + ev + tail)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('T1 替换 failE 处数:', n1, '| T2 替换 dc 处数:', n2)
