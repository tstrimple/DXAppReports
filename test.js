var request = require('request'),
    cheerio = require('cheerio');

var url = process.argv[2];
if(!url) {
  throw "Must supply URL";
}

function getPage(url, callback) {
  
}

function getRating(body) {
  $ = cheerio.load(body);

  var rating = $('#MainStars .RatingTextInline').text();
  if(!rating) {
    rating = $('#rating span').text();
    if(rating) {
      rating = rating.split(' ')[0];
    }
  }

  return rating; 
}

function getTitle(body) {
  $ = cheerio.load(body);

  var title = $('#ProductTitleText').text();
  if(!title) {
    title = $('#application h1').text();
  }

  return title; 
}

function getImage(body) {
  $ = cheerio.load(body);

  var image = $('#AppLogo img').attr('src');
  if(!image) {
    image = $('img.appImage').attr('src');
  }

  return image; 
}

request(url, function(err, resp, body){
  console.log(getTitle(body));
  console.log(getRating(body));
  console.log(getImage(body));
});
