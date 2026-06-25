// Friend links data for the links page
// Each item: { name, url, description }

module.exports = (function () {
  var groups = [];

  groups.push({
    title: '我的站点',
    items: [
      { name: 'EXYONE@BLOG:~$', url: 'https://exyone.ee', description: '一隅藏天地，流水遇知音。' }
    ]
  });

  groups.push({
    title: '特别推荐',
    items: [
      { name: 'Ited Blog', url: 'https://www.itedev.com', description: '你很棒了。' },
      { name: '清羽 〄 飞扬', url: 'https://blog.liushen.fun', description: '柳影曳曳，清酒孤灯；扬笔撒墨，心境如霜。' },
      { name: '爱吃猫的鱼', url: 'https://blog.talen.top', description: '前景可待，未来可期。' },
      { name: 'Mayx的博客', url: 'https://mayx.eu.org', description: 'Mayx’s Home Page' }
    ]
  });

  groups.push({
    title: '友情链接',
    items: [
      { name: '索玛(Suo.Ma)', url: 'https://suo.ma', description: '一位游戏爱好者！' },
      { name: "Erzbir's Blog", url: 'https://erzbir.com', description: '#define __DESC ((void *)0)' },
      { name: '谢县广的个人博客', url: 'https://www.xiexianguang.com', description: '永远相信美好的事情即将发生' },
      { name: '我的小破站', url: 'https://www.qiezechuan.cn', description: '解锁未知，乐享已知。' },
      { name: 'JiuLiuBlog', url: 'https://myblog.icu', description: 'JiuLiu的个人博客，分享前端开发经验与生活日常。' },
      { name: '青序栈', url: 'https://www.qixz.cn', description: '青序成栈，向简而生。' },
      { name: '寒士杰克', url: 'https://www.hansjack.com', description: '喜欢捣鼓，不断进步！' },
      { name: '記緒漂流', url: 'https://ttio.cc', description: '于记忆之川，泛思绪之舟。' },
      { name: 'Mofei', url: 'https://www.mofei.life', description: '在芬兰的程序员超级奶爸，写写博客，聊聊移居生活和带娃日常。' }
    ]
  });

  return { groups: groups };
})();
