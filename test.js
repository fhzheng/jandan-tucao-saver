/*jshint esversion: 6 */
const request = require('request')
function getFoo() {
  return new Promise((resolve, reject) => {
    request('http://localhost:8000/', {}, (error, response, body) => {
      resolve(body);
    })
  })
}

const g = function* () {
  try {
    while (true) {
      const foo = yield getFoo();
    }
  } catch (e) {
    console.log(e);
  }
};

function run(generator) {
  return new Promise((resolve, reject) => {

    const it = generator();

    function go(action, result) {
      action.value.then(function (data) {
        if (action.done) {
          resolve(result);
          return;
        }
        console.log(data);
        data = JSON.parse(data);
        result = result.concat(data.data);
        if (!data.has_next_page) {
          resolve(result);
        }
        else {
          return go(it.next(), result);
        }
      }, function (error) {
        return go(it.throw(error));
      });
    }

    go(it.next(), []);
  });
}

run(g).then(data => {
  console.log('DONE', JSON.stringify(data));
});