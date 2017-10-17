const http = require('http')
const port = 8000
const requestHandler = (request, response) => {
    let result = {};
    let r = Math.random()
    result.r = r
    result.data = []
    for (let i = 0; i < r * 10; i++) {
        result.data.push(Math.round(Math.random() * 100));
    }
    if (r > 0.95) {
        result.has_next_page = false;
    }
    else {
        result.has_next_page = true;
    }
    result = JSON.stringify(result)
    console.log(result)
    response.end(result)
}
const server = http.createServer(requestHandler)

server.listen(port, err => {
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
})
