var ramble = {
  debug: false,
  iframe: null,
  results: null,
  pageLoading: false,
  steps: [],
  matchers: [],
  paths: [],
  init: function(workspace_selector, results_selector) {
    this.iframe = $('<iframe id="browser" />').appendTo(workspace_selector);
    this.results = $(results_selector);

    this.iframe.css('width', 600).css('height', 300).load(function() {
      ramble.pageLoading = false;
      var contents = $(this).contents();
      // Not entirely sure why we need to add click event here really.
      contents.find('a').click(function() {
        ramble.getUrl($(this).attr('href'));
      });
      // Need a better solution for handling loading in general.
      contents.find('form').submit(function() {
        ramble.pageLoading = true;
      });
      ramble._run(contents);
    }).bind('urlChange.ramble', function(event, data) {
      ramble.pageLoading = true;
      $(this).attr('src', data.href);
    });
  },
  run: function(path) {
    $.ajax({
      url: path,
      success: function(data) { ramble._parse(data); ramble._run(); },
      dataType: 'text/plain'
    });
  },
  addPath: function(regexp, path) {
    if(typeof(path) != 'string' && typeof(path) != 'function') throw('Must supply string or function for path');
    this.paths.push({ regexp: regexp, path: path });
  },
  pathTo: function(path) {
    found = null;
    $.each(this.paths, function() {
      var match = path.match(this.regexp);
      if(match) {
        found = { matches: match.slice(1), path: this.path };
        return;
      };
    });
    
    if(found == null) {
      this.results.append($('<p/>', { text: "Couldn't find path for: " + path, 'class': 'error' }));
    } else {
      try {
        return typeof(found.path) == 'string' ? found.path : found.path.apply(ramble, found.matches);
      } catch(error) {
        this.results.append($('<p/>', { html: 'Problem with path: ' + path + '<br/> - ' + error, 'class': 'error' }));
      }
    }
  },
  getUrl: function(url) {
    this.iframe.trigger('urlChange.ramble', { href: url });
  },
  match: function(regexp, func) {
    this.matchers.push({ regexp: regexp, func: func });
  },
  _parse: function(data) {
    this.steps = $.map(data.split('\n'),function(line) {
      var trimmed = $.trim(line.toString());
      return trimmed == '' ? null : trimmed;
    });
  },
  _run: function(elements) {
    var matchers = this.matchers;
    
    while(this.steps.length > 0) {
      // If the page is loading we can return as the load event will re-trigger
      // this method when the new page has finished loading.
      if(ramble.pageLoading) return;
      
      if(ramble.debug) alert('Press OK to continue');
      
      var line = this.steps.shift().toString();
      if(line.indexOf('Scenario:') == 0) {
        this.results.append($('<p/>', { text: line, 'class': 'scenario' }));
        continue;
      };
      
      var found = null;
      $.each(matchers, function() {
        var match = line.replace(/^(Given|When|Then|And)\s+/, '').match(this.regexp);
        if(match) {
          found = { matches: match.slice(1), func: this.func };
          return;
        };
      });
      
      if(found == null) {
        this.results.append($('<p/>', { html: "Couldn't find step definition for:<br/> - " + line, 'class': 'error' }));
      } else {
        try {
          var result = found.func.apply(elements, found.matches);
          this.results.append($('<p/>', { text: line, 'class': 'ok' }));
        } catch(error) {
          this.results.append($('<p/>', { html: line + '<br/> - ' + error, 'class': 'error' }));
        }
      }
    };
  }
};