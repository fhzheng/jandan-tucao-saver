# 煎蛋网吐槽内容管理器

## 主要功能
* 每发布成功一条吐槽，即保存到本地，后续可以打开管理器，找到此吐槽对应的楼层和网页；
* 自主删除吐槽
* 适用于无聊图、妹子图、段子、问答页面
* 自动修复由于网站原因导致的跳转hash不对，无法跳到指定post的问题（v1.04.1）
* 自动获取历史评论收到的回复（v1.10.0）

## 已知问题
* 新进页面打开管理器后，需要点击一次tab才可以显示保存的内容
* 吐槽按照时间正序排列

## TODO
* 增加设置功能
* 增加一键清除功能

## 更新历史
> * 1.03
>
> 当页面后面加hash后，如果hash表示的id在当前页面不存在，则提示是否跳转到下一页或者上一页，如果存在但是和webstorage里面的不一样，则更新webstorage。

> * 1.04
>
> 修改页面展示，点击文字展开，点击按钮跳转。

> * 1.04.1
>
> 修改当前页数的String转Int错误。

> * 1.10.0
>
> 添加获取回复的功能。

> * 1.10.2
>
> 1、修改脚本名称；
> 2、添加对https的匹配。

> * 2.0.0
>
> 1、全面使用inddexedDb存储数据；
> 2、全面异步化，提升性能和用户体验；
> 3、代码优化。