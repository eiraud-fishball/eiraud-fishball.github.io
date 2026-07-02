// Friend links data for the links page
// Each item: { name, url, description, weight?, status? }
//   weight   — higher = appears first (default 0)
//   status   — 'primary' | 'recommended' | 'unstable' | 'deprecated'

module.exports = (function () {
  var groups = [];

  // ------------------------------------------------------------------
  //  Helper
  // ------------------------------------------------------------------
  function sortByWeight(items) {
    return items.sort(function (a, b) {
      return (b.weight || 0) - (a.weight || 0);
    });
  }

  // ------------------------------------------------------------------
  //  朋友圈
  // ------------------------------------------------------------------
  groups.push({
    title: '朋友圈',
    items: [
      { name: '友链动态',     url: '/friends', description: '海内存知己，天涯若比邻。' },
    ],
  });

  // ------------------------------------------------------------------
  //  我的站点
  // ------------------------------------------------------------------
  groups.push({
    title: '我的站点',
    collapsible: true,
    items: sortByWeight([
      { name: 'Exyone Blog',    url: 'https://exyone.ee',           description: '一隅藏天地，流水遇知音。' },
      { name: '镜像站1',         url: 'https://www.exyone.top',     description: '托管于Cloudflare Pages「学Mayx搞了一堆镜像站出来(bushi)」', },
      { name: '镜像站2',         url: 'https://exyone.is-a.dev',    description: '托管于Netlify「访问稳定,推荐使用」', },
      { name: '镜像站3',         url: 'https://exyone.de5.net',     description: '托管于GitHub Pages', },
      { name: '镜像站4',         url: 'http://exyone.gitlink.net',  description: '托管于GitLink Pages', },
      { name: '镜像站5',         url: 'https://exyone.pages.gay',   description: '托管于GitGay Pages', },
      { name: '镜像站6',         url: 'https://exyone.js.cool',     description: '托管于Codeberg Pages「解析有问题,暂时无法访问」', },
      { name: 'Halo博客',       url: 'https://exyone.us.kg',      description: 'Halo CMS 博客「不再维护」', },
    ]),
  });

  // ------------------------------------------------------------------
  //  特别推荐
  // ------------------------------------------------------------------
  groups.push({
    title: '特别推荐',
    items: [
      { name: 'Ited Blog',     url: 'https://www.itedev.com', description: '墨海扬帆远，文心映月明。' },
      { name: '清羽 〄 飞扬',    url: 'https://blog.liushen.fun', description: '柳影曳曳，清酒孤灯；扬笔撒墨，心境如霜。' },
      { name: '爱吃猫的鱼',     url: 'https://blog.talen.top',  description: '心有山海阔，笔落天地宽。' },
      { name: "Mayx's Blog",   url: 'https://mayx.eu.org',     description: '静室纳天地，闲窗读古今。' },
    ],
  });

  // ------------------------------------------------------------------
  //  友情链接
  // ------------------------------------------------------------------
  groups.push({
    title: '友情链接',
    items: [
      { name: '索玛 (Suo.Ma)',     url: 'https://suo.ma',           description: '游戏三昧里，逍遥方寸间。' },
      { name: "Erzbir's Blog",     url: 'https://erzbir.com',       description: '指尖敲日月，代码写春秋。' },
      { name: '谢县广的个人博客',    url: 'https://www.xiexianguang.com', description: '心怀美好愿，静待花自开。' },
      { name: '我的小破站',         url: 'https://www.qiezechuan.cn',    description: '方寸藏天地，一隅有乾坤。' },
      { name: 'JiuLiu Blog',       url: 'https://myblog.icu',        description: '前端观万象，代码写人生。' },
      { name: '青序栈',             url: 'https://www.qixz.cn',       description: '青序成栈，向简而生。' },
      { name: '寒士杰克',           url: 'https://www.hansjack.com',  description: '寒窗磨一剑，妙手自成春。' },
      { name: '記緒漂流',           url: 'https://ttio.cc',           description: '于记忆之川，泛思绪之舟。' },
      { name: 'Mofei',             url: 'https://www.mofei.life',    description: '远行千万里，心安即是家。' },
    ],
  });

  return { groups: groups };
})();
