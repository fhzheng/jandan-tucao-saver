// ==UserScript==
// @name        煎蛋吐槽管理器
// @namespace   mtdwss@gmail.com

// @include     http://jandan.net/duan*
// @include     http://jandan.net/pic*
// @include     http://jandan.net/ooxx*
// @include     http://jandan.net/qa*

// @include     https://jandan.net/duan*
// @include     https://jandan.net/pic*
// @include     https://jandan.net/ooxx*
// @include     https://jandan.net/qa*

// @require     https://cdn.bootcss.com/vue/2.4.2/vue.min.js
// @description save jandan.net's tucao
// @version     1.10.2
// @grant       none
/*jshint esversion: 6 */
// ==/UserScript==
(function () {
  if (window.top != window.self) return;

  var Exceptions = {
    BreakException: {},
    FetchJsonDoneException: {},
  }


  function Net() {
    var _get = function (url, params = {}, type = "json") {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: url,
          data: params,
          type: "GET",
          dataType: type,
          success: data => resolve(data),
          error: err => reject(err),
        })
      })
    };

    var _iter = (action, condition, value) => {
      return new Promise((resolve, reject) => {

      })
    }

    var GetAllTucao = function (postId) {
      var start = false;

      function getFoo() {
        return new Promise((resolve, reject) => {
          var url = '/tucao/' + postId;
          if (start !== false) url += '/n/' + start;
          $.get(url, data => resolve(data))
        })
      }

      const g = function* () {
        try {
          while (true) {
            yield getFoo();
          }
        } catch (e) {
          console.log(e);
        }
      };

      function run(generator) {
        return new Promise((resolve, reject) => {

          const it = generator();

          function go(action, tucao_list) {
            action.value.then(function (tucao_data) {
              if (action.done) {
                resolve(tucao_list);
                return;
              }
              tucao_list = tucao_list.concat(tucao_data.tucao);
              if (!tucao_data.has_next_page) {
                resolve(tucao_list);
              } else {
                start = tucao_list[tucao_list.length - 1].comment_ID;
                return go(it.next(), tucao_list);
              }
            }, function (error) {
              return go(it.throw(error));
            });
          }

          go(it.next(), []);
        });
      }

      return new Promise((resolve, reject) => {
        run(g).then(data => {
          var result = {};
          data.forEach(element => {
            result[element.comment_ID] = element;
          });
          resolve(result);
        });
      })
    }

    return {
      GetAllTucao,
      GetHtml: _get,
    }
  };
  var net = Net();

  function Storage() {
    var db = null,
      DB_NAME = 'jcdb',
      POST_TABLE = 'jcpost',
      COMMENT_TABLE = 'jccomment';
    var _this = this;
    var Init = function () {
      return new Promise(function (resolve, reject) {
        if (!'indexedDB' in window) {
          reject('not support indexedDB');
          return false;
        }
        var openRequest = indexedDB.open(DB_NAME, 2);
        openRequest.onupgradeneeded = function (e) {
          console.log("Upgrading...");
          db = e.target.result;
          if (!db.objectStoreNames.contains(DB_NAME)) {
            try {
              var store1 = db.createObjectStore(COMMENT_TABLE, {
                keyPath: "tucaoId"
              });
              var store2 = db.createObjectStore(POST_TABLE, {
                keyPath: "postId"
              });

              store1.createIndex("postId", "postId", {
                unique: false
              });
              store1.createIndex("date", "date", {
                unique: false
              });

              store2.createIndex("pageCate", "pageCate", {
                unique: false
              });
              store2.createIndex("updateDate", "updateDate", {
                unique: false
              });

              store2.createIndex("cate,date", ["pageCate", "updateDate"], {
                unique: false
              })

            } catch (err) {
              console.dir(err);
              reject(err);
            }
          }
        }

        openRequest.onsuccess = function (e) {
          console.log("Open success!");
          db = e.target.result;
          resolve();
        }

        openRequest.onerror = function (e) {
          console.log("Error");
          console.dir(e);
          reject(e);
        }
      })
    };

    var AddComment = function (comment, update_post) {
      return new Promise(function (resolve, reject) {
        GetPostInfo(comment.postId).then(data => {
          if(!update_post) return Promise.resolve();
          _put(POST_TABLE, {
            postId: comment.postId,
            updateDate: comment.date,
            pageCate: comment.page_cate,
            pageNo: comment.page_no,
            count: data && data.count ? data.count + 1 : 1,
          })
        }).then(() => {
          delete comment.page_no;
          _put(COMMENT_TABLE, comment)
        }).then(() => {
          resolve();
        }).catch(err => {
          reject(err);
        })
      })
    }

    var AddPost = function (post) {
      return new Promise((resolve, reject) => {
        _put(POST_TABLE, post).then(() => resolve()).catch(err => {
          reject(err)
        });
      })
    }

    var _get_all = function (store_name, idx, key, limit) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction([store_name], 'readonly');
        var store = t.objectStore(store_name);
        var index = store.index(idx);
        var range = IDBKeyRange.only(key);
        var getAllRequest = index.getAll(range, limit);
        getAllRequest.onsuccess = function () {
          resolve(getAllRequest.result);
        }
        getAllRequest.onerror = function (err) {
          reject(err);
        }
      })
    }

    var GetPostsByCate = function (cate) {
      return new Promise(function (resolve, reject) {
        _get_all(POST_TABLE, 'pageCate', cate, 50).then(data => {
          data.sort((a, b) => {
            var dateA = new Date(a.updateDate);
            var dateB = new Date(b.updateDate);
            if (dateA < dateB) return 1;
            if (dateA > dateB) return -1;
            return 0;
          })
          resolve(data);
        }).catch(err => {
          reject(err)
        });
      })
    };

    var GetCommentsByPostId = function (postId) {
      return new Promise(function (resolve, reject) {
        _get_all(COMMENT_TABLE, 'postId', postId, 50).then(data => {
          resolve(data);
        }).catch(err => {
          reject(err);
        });
      })
    };

    var _get_store = function (store_name, mode = 'readonly') {
      var t = db.transaction([store_name], mode);
      var store = t.objectStore(store_name);
      return store;
    }

    var GetPostInfo = function (postId) {
      return new Promise(function (resolve, reject) {
        _get(POST_TABLE, postId).then(data => {
          resolve(data);
        }).catch(err => {
          reject(err);
        })
      });
    }

    var GetCommentInfo = function (commentId) {
      return new Promise(function (resolve, reject) {
        _get(COMMENT_TABLE, commentId).then(data => {
          resolve(data);
        }).catch(err => {
          reject(err);
        })
      });
    }

    var _get = function (store_name, key) {
      return new Promise(function (resolve, reject) {
        var request = _get_store(store_name).get(key);
        request.onsuccess = function () {
          console.log(request.result);
          resolve(request.result);
        }
        request.onerror = function (err) {
          console.dir(err);
          reject(err);
        }
      })
    }

    var _put = function (store_name, value) {
      return new Promise(function (resolve, reject) {
        var request = _get_store(store_name, 'readwrite').put(value);
        request.onsuccess = function () {
          console.log(request.result);
          resolve(request.result);
        }
        request.onerror = function (err) {
          console.dir(err);
          reject(err);
        }
      })
    }

    var _delete = function (store_name, key) {
      return new Promise(function (resolve, reject) {
        var request = _get_store(store_name, 'readwrite').delete(key);
        request.onsuccess = function () {
          resolve();
        }
        request.onerror = function (err) {
          console.dir(err);
          reject(err);
        }
      })
    };

    var DeletePost = function (postId, callback) {
      return new Promise((resolve, reject) => {
        _delete(POST_TABLE, postId).then(() => {
          resolve();
        }).catch(err => {
          reject(err);
        })
      });
    };

    var DeleteComment = function (commentId) {
      return new Promise(function (resolve, reject) {
        GetCommentInfo(commentId).then(c => {
          GetPostInfo(c.postId).then(p => {
            _delete(COMMENT_TABLE, commentId).then(() => {
              if (p.count <= 1) _delete(POST_TABLE, p.postId).catch(err => {
                reject(err)
              });
              else {
                p.count -= 1;
                _put(POST_TABLE, p).catch(err => {
                  reject(err)
                });
              }
            }).catch(err => {
              reject(err);
            });
          });
        });
      });
    };
    return {
      Init,
      AddComment,
      GetCommentsByPostId,
      GetPostsByCate,
      DeletePost,
      AddPost,
    };
  }
  var storage = Storage();
  $.jcsaver = {
    jc_keys: ["duan", "pic", "ooxx", "qa"],
    st_index_prefix: "jc_index_",
    st_index_key: "",
    st_item_prefix: "jc_",
    st_db: null,
    page_cate: undefined,
    jc_css: `
#jc_area {
text-align: left;
text-indent: 0;
width: 50%;
min-height: 300px;
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
padding: 2px 10px;
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
width: 20px;
text-align: center;
height: 15px;
margin-top: 5px;
line-height: 15px;
border-radius: 5px;
cursor: pointer;
color: white;
font-size: 10px;
box-shadow: 1px 1px 1px #6c6c6c;
}
.jc_bar > span.jc_go{
  background-color: #008f52;
}
.jc_bar > span.jc_del{
  background-color: #959595;
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
.jc_hint {
display: inline-block;
height: 24px;
width: 24px;
line-height: 24px;
text-align: center;
background-color: red;
border-radius: 50%;
color: white;
cursor: pointer;
}
.jc_sync {
  position: absolute;
  left: -70px;
  -webkit-animation: sync-color 1.0s infinite ease-in-out;
  animation: sync-color 1.0s infinite ease-in-out;
  font-weight: 900;
  font-size: 13px;
}
@-webkit-keyframes sync-color {
  0% {
    color: gray;
  }
  100% {
    color: red;
  }
}

@keyframes sync-color {
  0% { 
    color: gray;
  }
  100% {
    color: red;
  }
}
  `,
    jc_html: $(`
<div id="jc_main">
<div id="jc_area" v-show="show">
    <div class="jc_switch_bar"><span v-for="page in pages" v-bind:page="page" v-on:click="current_page = page; refresh();" v-bind:class="page==current_page?'current_tab':''">{{ page|getPageName }}</span></div>
    <div class="jc_list_area">
        <div v-for="(item,idx) in items" v-bind:class="'jc_bar jc_bar'+idx%2">&#9679;
            <a v-bind:cno="item.k" v-on:click="loadComments(item.postId, item.visable)" class="jc_exp">第{{ item.pageNo }}页 第{{ item.postId }}楼 {{ item.count }}条评论<span class="reply-total" v-if="item.reply_total_count > 0">，{{ item.reply_total_count }}条回复<span/></a>
            <span class="jc_go" title="Go to this location"><a v-bind:href="item|getUrl" target="blank" style="color:white;">&#9992;</a></span>
            </span>
            <span class="jc_del" v-on:click="deletePost(item.postId).then(() => {refresh();}).catch(e => {console.dir(e);});" title="Delete this comment">&#10005;</span>
            <div class="jc_comments" v-show="item.visable">
                <div v-for="comment in item.comments">{{ comment.date+':' }} <strong>{{ comment.content|removeHTMLTags }}</strong></div>
            </div>
        </div>
    </div>
</div>
<div id="jc_btn">
    <div class="jc_sync" v-show="syncing">
      syncing...
    </div>
    <span class="show" v-on:click="show = !show">
    <span v-if="show">关闭</span>
    <span v-else>打开</span>
    </span>
    <span class="settings">设置</span>
    <span class="resync" v-on:click="syncing=true;sync(()=>{syncing=false})">同步</span>
</div>
</div>
  `),
    jc_current_page: "",
    onPageLoad: function () { //当页面初始化的时候发现
      var myregexp = /#comment-\d+/g;
      var hash = myregexp.exec($(location).attr('hash'));
      if (hash === null || hash === undefined || hash.length <= 0) return;
      hash = hash[0];
      if ($(hash).length > 0) {
        var index_storage = JSON.parse(localStorage.getItem($.jcsaver.st_index_key));
        console.log(index_storage);
        if (index_storage === null || index_storage.length <= 0) return;
        // 更新index数据库当前post的页数
        $.each(index_storage, function (index, val) {
          if (val['k'] == hash.split('-')[1]) {
            if (val['p'] != $.jcsaver.jc_current_page) {
              val['p'] = $.jcsaver.jc_current_page;
              localStorage.setItem($.jcsaver.st_index_key, JSON.stringify(index_storage));
            }
            return false;
          }
        });
        return;
      }
      if (parseInt($('.commentlist li').eq(0).attr('id').split('-')[1]) < parseInt(hash.split('-')[1])) {
        $.jcsaver.turnPage($.jcsaver.jc_current_page + 1, hash);
        return;
      }
      if (parseInt($('.commentlist li').eq(-1).attr('id').split('-')[1]) > parseInt(hash.split('-')[1])) {
        $.jcsaver.turnPage($.jcsaver.jc_current_page - 1, hash);
        return;
      }
    },
    // 翻页
    turnPage: function (pageNo, hash) {
      var url = '//jandan.net/' + $.jcsaver.getPageKey() + '/page-' + pageNo + hash;
      console.log(url);
      if (confirm('跳转到' + url + '?')) window.location.href = url;
    },
    // 获取回复
    refreshReply: function () {
      $.each($.jcsaver.jc_keys, function (cat_idx, cat_val) {
        var cat_key = $.jcsaver.st_index_prefix + cat_val;
        var post_list = $.jcsaver.storage.get(cat_key);
        if (!$.isArray(post_list)) return true;
        $.each(post_list, function (post_idx, post_val) {
          var r = 0;
          var my_comment_list = $.jcsaver.storage.get('jc_' + post_val.k);
          $.get('/tucao/' + post_val.k, function (data) {
            // 获取到了这条post下面的所有吐槽
            $.each(my_comment_list, function (my_idx, my_val) {
              // console.log(my_val);
              my_val.rl = [];
              $.each(data.tucao, function (remote_idx, remote_val) {
                // console.log(remote_val);
                var regexP = /href=\"#tucao-\d+/g;
                var regexL = regexP.exec(remote_val.comment_content);
                if (!$.isArray(regexL)) return true;
                // console.log(regexL);
                // console.log('href="#tucao-' + my_val.c);
                if ($.inArray('href="#tucao-' + my_val.c, regexL) >= 0) {
                  // console.log('========================');
                  // console.log(remote_val.comment_content);
                  var n = [];
                  n.push(remote_val.comment_author);
                  n.push(remote_val.comment_content);
                  my_val.rl.push(n);
                  // console.log(n);
                }
              })
            });
            // console.log(my_comment_list);
            localStorage.setItem('jc_' + post_val.k, JSON.stringify(my_comment_list));
          })
        });
      });
    },
    onAjaxSuccess: function (event, xhr, settings) {
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
        value.tid = value.c;
        value.page_key = $.jcsaver.getPageKey();
        value = {};

        // var comment = {
        //   tucaoId: '',
        //   postId: null,
        //   date: null,
        //   content: null,
        //   author: null,
        // };
        value.tucaoId = data.comment_ID;
        value.postId = data.comment_post_ID;
        value.date = data.comment_date;
        value.content = data.comment_content;
        value.author = data.comment_author;
        value.page_cate = $.jcsaver.getPageKey();
        value.page_no = $.jcsaver.jc_current_page;
        storage.AddComment(value, true).catch(err => {
          alert("保存失败！请查看控制台日志！");
        });
      }
    },
    switchArea: function (node) {
      var page = node.attr("page");
      jc_vue.current_page = page;
      var index_list = this.storage.get(this.st_index_prefix + page);
      if (index_list === null) index_list = [];
      $.each(index_list, function (index, value) {
        value.e = false;
      });
      jc_vue.items = index_list;
    },
    expandComment: function (cno) {
      key = $.jcsaver.st_item_prefix + cno;
      var citem = $.jcsaver.storage.get(key);
      // console.log(citem);
      $.each(jc_vue.items, function (index, value) {
        if (value.k == cno) {
          jc_vue.$set(jc_vue.items[index], "comments", citem);
          return false;
        }
      });
    },
    init: function () {
      var pageKey = $.jcsaver.getPageKey();
      var _this = this;
      if ($.inArray(pageKey, ['duan', 'pic', 'ooxx', 'qa']) < 0) {
        console.log('Jandan_tucao_saver: current page not match!');
        return false;
      }
      storage.Init().then(e => {
        _this.jc_current_page = null;
        var result = new RegExp('page-([^&#]*)').exec(window.location.href);
        if(result != null) {
          _this.jc_current_page = parseFloat(result[1]);
          return Promise.resolve();
        }
        else{
          var next_page_url = $('.previous-comment-page').eq(0).attr('href');
          net.GetHtml(next_page_url, {}, 'text').then(data => {
            result = new RegExp('Newer Comments" href=([^&#]*)page-([^&#]*)').exec(data)
            _this.jc_current_page = parseFloat(result[2]);
            return Promise.resolve();
          })
        }
        // jc_vue.sync(()=>{jc_vue.syncing = false});
      }).then(() => {
        _this.st_index_key = _this.st_index_prefix + pageKey;
        $style = $("<style></style>");
        $style.text(_this.jc_css);
        $("head").append($style);
        $("body").append(_this.jc_html);
        initVue();
        jc_vue.current_page = pageKey;
        jc_vue.refresh();
      }).catch(err => {
        console.log(err);
        alert('An error occured!');
      })
    },
    initVue: function () {
      var pageKey = $.jcsaver.getPageKey();
      jc_vue.pages = $.jcsaver.storage.addKey(pageKey);
      // console.log(jc_vue.pages);
    },
    getPageKey: function () {
      if ($.jcsaver.page_cate) return $.jcsaver.page_cate;
      var url = window.location.href;
      var subPath = url.split("/");
      $.jcsaver.page_cate = subPath[3];
      return $.jcsaver.page_cate;
    },
    storage: {
      addKey: function (key) {
        var k = "jc_keys";
        var cachedKeys = localStorage.getItem(k);
        if (cachedKeys === null) cachedKeys = [];
        else cachedKeys = JSON.parse(cachedKeys);
        //   console.log(cachedKeys);
        var flag = true;
        $.each(cachedKeys, function (index, value) {
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
      add: function (key, value) {
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
        $.each(index_list, function (i, v) {
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
      delete: function (key) {
        localStorage.removeItem(key);
      },
      get: function (key) {
        return JSON.parse(localStorage.getItem(key));
      },
      clear: function (key) {
        var index_list = localStorage.getItem($.jcsaver.st_index_key);
        index_list = JSON.parse(index_list);
        if (!$.isArray(index_list)) index_list = [];
        $.each(index_list, function (index, value) {
          localStorage.removeItem(index);
        });
        localStorage.removeItem($.jcsaver.st_index_key);
      }
    }
  };

  $.jcsaver.init();

  var jc_vue = undefined;
  var initVue = function () {
    jc_vue = new Vue({
      el: "#jc_main",
      data: {
        pages: $.jcsaver.jc_keys,
        items: [],
        show: false,
        current_page: "",
        syncing: false,
      },
      filters: {
        getUrl: function (post) {
          return "/" + post.pageCate + "/page-" + post.pageNo + "#comment-" + post.postId;
        },
        getPageName: function (key) {
          const page_names = {
            pic: "无聊图",
            ooxx: "妹子图",
            qa: "问答",
            duan: "段子"
          };
          var result = page_names[key];
          if (result === undefined) result = key;
          return result;
        },
        removeHTMLTags: function (string) {
          return string.replace(/(<([^>]+)>)/ig, '');
        }
      },
      methods: {
        sync: function (callback) {
          var promiseArray = [];
          jc_vue.pages.forEach(page_key => {
            promiseArray.push(
              new Promise((resolve, reject) => {
                var subPromiseArray = [];
                storage.GetPostsByCate(page_key).then(post_list => {
                  post_list.forEach(post => {
                    var promise = new Promise((subResolve, subReject) => {
                      var post_total_reply = 0;
                      storage.GetCommentsByPostId(post.postId).then(comments => {
                        net.GetAllTucao(post.postId).then(tucao_list => {
                          console.log(tucao_list);
                          comments.forEach(comment => {
                            let current_comment_reply_count = 0;
                            for (var key in tucao_list) {
                              if (tucao_list.hasOwnProperty(key)) {
                                var tucao = tucao_list[key];
                                if (tucao.comment_content.includes('data-id="' + comment.tucaoId + '"')) {
                                  // console.log('FFFFFFFFFFFFFFUUUUUUUUUUUUUUUUUUUUUKKKKKKKKKKKKKKKKKKKKK', comment);
                                  console.log('遇到回复，回复id：', tucao.comment_ID, "被回复id：", comment.tucaoId);
                                  current_comment_reply_count += 1;
                                  post_total_reply += 1;
                                  break;
                                }
                              }
                            };
                            if (current_comment_reply_count != comment.reply_count) {
                              comment.reply_count = current_comment_reply_count;
                              storage.AddComment(comment, false).then(() => {
                                console.log('comment 更新完成', comment);
                                // console.log('SSSSSSSSSSSSSSSSUUUUUUUUUUUUUUUUUUUUCCCCCCCCCCCCCCCCCCCCCCCEEEEEEEEEEEEEEEEESSSSSSSSSSS');
                              })
                            }
                            if (post.reply_total_count != post_total_reply) {
                              post.reply_total_count = post_total_reply;
                              storage.AddPost(post).then(() => {
                                console.log('post 更新完成', post);
                                // console.log('SSSSSSSSSSSSSSSSUUUUUUUUUUUUUUUUUUUUCCCCCCCCCCCCCCCCCCCCCCCEEEEEEEEEEEEEEEEESSSSSSSSSSS');
                              })
                            }
                          })
                          subResolve();
                        }).catch(err => {
                          console.dir(err)
                        });
                      })
                    });
                    subPromiseArray.push(promise);
                  });
                }).then(() => {
                  Promise.all(subPromiseArray).then((data) => {
                    console.log(page_key, '完成');
                    resolve();
                  }).catch(e => {
                    console.log(e);
                    alert(e);
                  })
                })
              })
            )
          });
          Promise.all(promiseArray).then(() => {
            console.log('全部完成');
            if (typeof (callback) == 'function') callback();
          })
        },
        refresh: function () {
          storage.GetPostsByCate(jc_vue.current_page).then(data => {
            console.log(data);
            jc_vue.items = data;
          })
        },
        loadComments: function (postId, visable) {
          if (visable) visable = false;
          else visable = true;
          try {
            jc_vue.items.forEach((element, idx) => {
              if (element.postId == postId) {
                jc_vue.$set(jc_vue.items[idx], 'visable', visable);
                if (!visable) throw Exceptions.BreakException;
                storage.GetCommentsByPostId(postId).then(data => {
                  console.log(data);
                  jc_vue.$set(jc_vue.items[idx], 'comments', data);
                  throw Exceptions.BreakException;
                }).catch(e => {
                  if (e !== Exceptions.BreakException) {
                    alert(e);
                    throw e;
                  }
                })
              }
            });
          } catch (e) {
            if (e !== Exceptions.BreakException) throw e;
          }
          // $.jcsaver.expandComment(cno);
        },
        deletePost: function (postId) {
          return new Promise((resolve, reject) => {
            storage.DeletePost(postId).then(() => {
              resolve();
            }).catch(e => {
              reject(e);
            });
          })
        },
        renderReplies: function (replies) {
          var result = "";
          $.each(replies, function (idx, val) {
            result += val[0] + ': ';
            result += val[1].replace(/(<([^>]+)>)/ig, '') + '\n\n';
          })
          return result;
        }
      }
    });
  }


  // $.jcsaver.initVue();
  // $.jcsaver.refreshReply();
  $(document).ajaxSuccess(function (event, xhr, settings) {
    $.jcsaver.onAjaxSuccess(event, xhr, settings);
  });
})();