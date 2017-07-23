// server.js
// where your node app starts

// init project
var request = require('request');
var URL = require('url');
var express = require('express');
var app = express();

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/p", function (req, res) {
  var url = req.query.url;
  if(url.indexOf("http") == -1) {
    url = "https://" + url;
  }
  request({
    url: url,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.81 Safari/537.36',
      'authority': url,
      'method':'GET',
      'scheme':'https',
      'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'cache-control':'no-cache',
      'dnt':1,
      'pragma':'no-cache',
      'upgrade-insecure-requests':1
    }
  }, function(error, response, body) {
    console.log(req.headers)
    res.send(body.replace("<head>", "<head><script async src='//adfactory.s3.amazonaws.com/graviti/js/graviti.js'></script>"))
  })
});
app.get(/[a-zA-Z]+/, function(req, res) {
  var referrer = req.get('Referer') || "";
  var finalUrl = "";
  var headers = req.headers;
  delete headers.host;
  if (referrer.indexOf("/p?url=") != -1) {
    finalUrl = extractUrlFromReferrer(referrer) + req.url;
    request({
      method: 'GET',
      url: finalUrl,
      headers: headers,
      gzip: true
    }, function(err, response, body) {
      res.send(body.replace("<head>", "<head><script async src='//adfactory.s3.amazonaws.com/graviti/js/graviti.js'></script>"))
    })
  } else {
    console.log(referrer)
    console.log(req.url);
    res.send("no referrer found with url=");
  }
})


app.get("/dreams", function (request, response) {
  response.send(dreams);
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});

// Simple in-memory store for now
var dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
];

var extractUrlFromReferrer = function(ref) {
  var out =  URL.parse(ref, true) && 
             URL.parse(ref, true).query && 
             URL.parse(ref, true).query.url;
  if(out) {
    if(out.indexOf("http") == -1) {
      out = "https://" + out;
    }
  }
  return out;
}
// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
