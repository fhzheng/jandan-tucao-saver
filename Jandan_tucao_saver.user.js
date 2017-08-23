// ==UserScript==
// @name        Jandan tucao saver
// @namespace   mtdwss@gmail.com
// @include     http://jandan.net/duan*
// @include     http://jandan.net/pic*
// @include     http://jandan.net/ooxx*
// @include     http://jandan.net/qa*
// @require     https://cdn.bootcss.com/vue/2.4.2/vue.min.js
// @description save jandan.net's tucao
// @version     1.04
// @grant       none
// ==/UserScript==
if (window.top != window.self) return;

$.jcsaver = {
  jc_keys: ["duan", "pic", "ooxx", "qa"],
  st_index_prefix: "jc_index_",
  st_index_key: "",
  st_item_prefix: "jc_",
  jc_css: `
#jc_area {
  text-align: left;
  text-indent: 0;
  width: 50%;
  height: 300px;
  background-color: #f2f2f2;
  z-index: 100000;
  position: fixed;
  top: 10px;
  left: 25%;
  border: 1px solid;
  list-style: none;
}
#jc_area > .jc_switch_bar span {
  display: table-cell;
  background-color: #bfbfbf;
  cursor: pointer;
  text-align: center;
  line-height: 30px;
}
.jc_switch_bar span:hover {
  background-color: #737373;
  color: white;
}

.current_tab {
  background: #636363 !important;
  color: white;
}
#jc_area > .jc_switch_bar {
  display: table;
  width: 100%;
}
#jc_btn {
  width: 100px;
  height: 50px;
  background-color: rgba(100, 100, 100, 0.6);
  z-index: 100000;
  text-align: center;
  line-height: 50px;
  position: fixed;
  bottom: 10px;
  right: 10px;
  border-radius: 5px 5px 5px 5px;
}
#jc_btn > span {
  cursor: pointer;
  text-decoration: underline;
}
.jc_bar > span {
  display: block;
  float: right;
  margin-right: 20px;
  width: 30px;
  text-align: center;
  height: 20px;
  margin-top: 5px;
  line-height: 20px;
  border-radius: 5px;
  cursor: pointer;
  color: white;
}
.jc_bar > span.jc_go{
    background-color: #008f52;
}
.jc_bar > span.jc_del{
    background-color: #c60a0a;
}
a.jc_exp{
    cursor: pointer;
}
.jc_bar {
  line-height: 30px;
}
.jc_bar0 {
  background-color: #c9c9c9;
}


    `,
  jc_btn: $(
    '<div id="jc_btn"><span class="show" onclick="jc_vue.show = !jc_vue.show;">显示</span><span class="settings">设置</span></div>'
  ),
  jc_html: $(`
<div id="jc_main">
    <div id="jc_area" v-show="show">
        <div class="jc_switch_bar"><span v-for="page in pages" v-bind:page="page" onclick="$.jcsaver.switchArea($(this))" v-bind:class="page==current_page?'current_tab':''">{{ page|getPageName }}</span></div>
        <div class="jc_list_area">
            <div v-for="(item,idx) in items" v-bind:class="'jc_bar jc_bar'+idx%2">&#9679;
                <a v-bind:cno="item.k" v-on:click="loadComments(item.k, item.e);item.e= !item.e;" class="jc_exp">第{{ item.p }}页，第{{ item.k }}楼，{{ item.c }}条</a>
                <span class="jc_go" title="Go to this page"><a v-bind:href="item.p|getUrl(item.k)" target="blank" style="color:white;">-></a></span>
                </span>
                <span class="jc_del" v-on:click="deleteHistory(item.k);" onclick="$(this).parent('.jc_bar').remove().empty();" title="Delete this comment">x</span>
                <div class="jc_comments" v-show="item.e">
                    <div v-for="comment in item.comments">{{ comment.d+':' }} <strong>{{ comment.co }}</strong></div>
                </div>
            </div>
        </div>
    </div>
    <div id="jc_btn">
        <span class="show" v-on:click="show = !show">
            <span v-if="show">关闭</span>
            <span v-else>打开</span>
        </span>
        <span class="settings">设置</span>
    </div>
</div>
    `),
  jc_current_page: "",
  onPageLoad: function(){//当页面初始化的时候发现
    var myregexp = /#comment-\d+/g;
    var hash = myregexp.exec($(location).attr('hash'));
    if(hash === null || hash === undefined || hash.length <= 0) return;
    hash = hash[0];
    if($(hash).length > 0) {
      var index_storage = JSON.parse(localStorage.getItem($.jcsaver.st_index_key));
      console.log(index_storage);
      if(index_storage === null || index_storage.length <= 0) return;
      // 更新index数据库当前post的页数
      $.each(index_storage, function(index, val){
        if(val['k'] == hash.split('-')[1]) {
          if(val['p'] != $.jcsaver.jc_current_page) {
            val['p'] = $.jcsaver.jc_current_page;
            localStorage.setItem($.jcsaver.st_index_key, JSON.stringify(index_storage));
          }
          return false;
        }
      });
      return;
    }
    if(parseInt($('.commentlist li').eq(0).attr('id').split('-')[1]) < parseInt(hash.split('-')[1])) {
      $.jcsaver.turnPage($.jcsaver.jc_current_page + 1, hash);
      return;
    }
    if(parseInt($('.commentlist li').eq(-1).attr('id').split('-')[1]) > parseInt(hash.split('-')[1])) {
      $.jcsaver.turnPage($.jcsaver.jc_current_page - 1, hash);
      return;
    }
  },
  turnPage: function(pageNo, hash){
    var url = '//jandan.net/' + $.jcsaver.getPageKey() + '/page-' + pageNo + hash;
    console.log(url);
    if(confirm('跳转到' + url + '?')) window.location.href = url;
  },
  onAjaxSuccess: function(event, xhr, settings) {
    if (settings.url == "/jandan-tucao.php" && xhr.responseJSON.code == "0") {
      var data = xhr.responseJSON.data;
      var key = data.comment_post_ID;
      var value = {};
      value.c = data.comment_ID; //评论id
      value.cp = data.comment_post_ID; //主条目id
      value.a = data.comment_author; //作者
      value.d = data.comment_date; //日期
      value.co = data.comment_content; //评论内容
      var st = this.storage;
      st.add(key, value);
    }
  },
  switchArea: function(node) {
    var page = node.attr("page");
    jc_vue.current_page = page;
    var index_list = this.storage.get(this.st_index_prefix + page);
    if (index_list === null) index_list = [];
    $.each(index_list, function(index, value) {
      value.e = false;
    });
    jc_vue.items = index_list;
  },
  expandComment: function(cno) {
    key = $.jcsaver.st_item_prefix + cno;
    var citem = $.jcsaver.storage.get(key);
    // console.log(citem);
    $.each(jc_vue.items, function(index, value) {
      if (value.k == cno) {
        jc_vue.$set(jc_vue.items[index], "comments", citem);
        return false;
      }
    });
  },
  init: function() {
    var pageKey = this.getPageKey();
    this.jc_current_page = $(".current-comment-page")
      .eq(0)
      .text()
      .replace(/\D+/g, "");
    this.st_index_key = this.st_index_prefix + pageKey;
    $.jcsaver.onPageLoad();
    $("body").append(this.jc_html);
    $style = $("<style></style>");
    $style.text(this.jc_css);
    $("head").append($style);
  },
  initVue: function() {
    var pageKey = this.getPageKey();
    jc_vue.pages = this.storage.addKey(pageKey);
    // console.log(jc_vue.pages);
  },
  getPageKey: function() {
    var url = window.location.href;
    var subPath = url.split("/");
    return subPath[3];
  },
  storage: {
    addKey: function(key) {
      var k = "jc_keys";
      var cachedKeys = localStorage.getItem(k);
      if (cachedKeys === null) cachedKeys = [];
      else cachedKeys = JSON.parse(cachedKeys);
    //   console.log(cachedKeys);
      var flag = true;
      $.each(cachedKeys, function(index, value) {
        if (value == key) {
          flag = false;
          return false;
        }
      });
      if (flag) {
        cachedKeys.push(key);
        localStorage.setItem(k, JSON.stringify(cachedKeys));
      }
    //   console.log(cachedKeys);
      return cachedKeys;
    },
    add: function(key, value) {
      var item_key = $.jcsaver.st_item_prefix + key;
      var item_value = localStorage.getItem(item_key);
      if (item_value === null) {
        var item_list = [];
        item_list.push(value);
        localStorage.setItem(item_key, JSON.stringify(item_list));
      } else {
        var item_list = JSON.parse(item_value);
        if (!$.isArray(item_list)) item_list = [];
        item_list.push(value);
        localStorage.setItem(item_key, JSON.stringify(item_list));
      }

      var index_list = localStorage.getItem($.jcsaver.st_index_key);
    //   console.log(index_list);
      index_list = JSON.parse(index_list);
    //   console.log($.isArray(index_list));
      if (!$.isArray(index_list)) {
        // console.log("不是列表");
        index_list = [];
      }
      var flag = false;
      $.each(index_list, function(i, v) {
        // console.log(v);
        if (v.k == key) {
          v.c += 1;
          flag = true;
          return false;
        }
      });
      if (!flag) {
        var n = {};
        n.k = key;
        n.c = 1;
        n.p = $.jcsaver.jc_current_page;
        // console.log(n);
        index_list.push(n);
      }
      localStorage.setItem($.jcsaver.st_index_key, JSON.stringify(index_list));
    },
    delete: function(key) {
      localStorage.removeItem(key);
    },
    deleteHistory: function(page, cno) {
      var k = $.jcsaver.st_index_prefix + page;
      var item_list = this.get(k);
      if (item_list === null) return;
      $.each(item_list, function(index, value) {
        if (value.k == cno) {
          item_list.splice(index, 1);
        //   console.log(item_list);
          localStorage.setItem(k, JSON.stringify(item_list));
          return false;
        }
      });
      localStorage.removeItem($.jcsaver.st_item_prefix + cno);
    },
    get: function(key) {
      return JSON.parse(localStorage.getItem(key));
    },
    clear: function(key) {
      var index_list = localStorage.getItem($.jcsaver.st_index_key);
      index_list = JSON.parse(index_list);
      if (!$.isArray(index_list)) index_list = [];
      $.each(index_list, function(index, value) {
        localStorage.removeItem(index);
      });
      localStorage.removeItem($.jcsaver.st_index_key);
    }
  }
};

$.jcsaver.init();

var jc_vue = new Vue({
  el: "#jc_main",
  data: {
    pages: [],
    items: [],
    show: false,
    current_page: ""
  },
  filters: {
    getUrl: function(p, k) {
      return "/" + jc_vue.current_page + "/page-" + p + "#comment-" + k;
    },
    getPageName: function(key) {
      const page_names = {
        pic: "无聊图",
        ooxx: "妹子图",
        qa: "问答",
        duan: "段子"
      };
      var result = page_names[key];
      if (result === undefined) result = key;
      return result;
    }
  },
  methods: {
    loadComments: function(cno, visable) {
      if (visable) return;
      $.jcsaver.expandComment(cno);
    },
    deleteHistory: function(key) {
      console.log("start vue delete history");
      $.jcsaver.storage.deleteHistory(jc_vue.current_page, key);
    }
  }
});
$.jcsaver.initVue();
$(document).ajaxSuccess(function(event, xhr, settings) {
  $.jcsaver.onAjaxSuccess(event, xhr, settings);
});
