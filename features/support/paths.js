// Paths may be a string of function. When a function is supplied, it's
// arguments will be the matches from the regexp's.
ramble.addPath(/the homepage/, '../example/one.html');
ramble.addPath(/page (.+)/, function(word) { return '../example/' + word + '.html'; });
ramble.addPath(/google/, 'http://www.google.co.uk/');