var cache = {};

exports.add = function(url, details) {
  cache[url] = details;
}

exports.all = function(callback) {
  callback(null, cache);
}