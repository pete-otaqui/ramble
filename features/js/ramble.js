/**
 * Cucumber Test Runner and Gherkin Parser
 * @author Jamie Hill <jamie@soniciq.com>
 * @author Pete Otaqui <pete@otaqui.com>
 * @version $Rev$
 * @requires jQuery
 */
var Ramble = {
    debug : false,
    _debug : function() {
        if ( this.debug ) console.log(arguments);
    }
}

/**
 * Gherkin DSL parser
 * @version $Rev$
 * @requires Ramble
 */
Ramble.Parser = {
    parseFeatureFile : function(data) {
        var feature = new Ramble.Feature();
        var describingFeature = true;
        var lines = data.split('\n');
        var line, scenario, step;
        feature.title = lines.splice(0,1)[0];
        $.each(lines,function() {
            line = $.trim(this.toString());
            if ( describingFeature ) {
                // Really need to make a proper parser! Still, got a class for it now.
                if ( line != "" ) {
                    feature.description += line + "\n";
                } else {
                    describingFeature = false;
                    return;
                }
            } else {
                if ( this.indexOf('Scenario:') != -1 ) {
                    scenario = new Ramble.Scenario(feature);
                    feature.scenarios.push(scenario);
                    scenario.title = line;
                } else {
                    step = new Ramble.Step(scenario);
                    step.text = line;
                    if ( line.indexOf('#') === 0 ) {
                        step.comment = true;
                    } else {
                        step.comment = false;
                    }
                    scenario.steps.push(step);
                }
            }
        });
        return feature;
    },
    getExampleCode : function(step, html) {
        var code = step.text.replace(/^(Given|When|Then|And)\s+/, '').replace(/"([^\"]*)"/, '"([^\"]*)"');
        var args = [];
        var quotes = step.text.match(/"/g);
        if(quotes) {
          for(i = 0; i < parseInt(quotes.length / 2); i++) {
            args.push('arg' + (i + 1));
          }
        }
        args = args.join(', ');
        var example = "Missing step definition:";
        example += html? this.html_nl : "\n";
        example += html? this.html_code_pre : "\n";
        example += 'ramble.match(/^' + code + '$/, function(' + args + ') {\n  // code\n});';
        example += html? this.html_code_post : "";
        return example;
    },
    html_nl : "<br/>",
    html_code_pre : "<pre><code>",
    html_code_post : "</code></pre>"
};
Ramble.Feature = function() {
    this.type = "feature";
    this.title = '';
    this.description = '';
    this.scenarios = [];
}
Ramble.Scenario = function(feature) {
    this.type = "scenario";
    this.title = '';
    this.feature = feature;
    this.steps = [];
};
Ramble.Step = function(scenario) {
    this.type = "step";
    this.text = "";
    this.status = "";
    this.comment = false;
    this.scenario = scenario;
}
/**
 * Outputter Interface defines the methods all outputters should have.
 */
Ramble.IOutputter = {
    /**
     * Start output for a suite of features
     * @public
     * @returns void
     */
    start : function() {},
    /**
     * Output a step
     * @public
     * @param Ramble.Feature a ramble feature object (defining .title and .description)
     * @returns void
     */
    outputFeature : function ( feature ) {},
    /**
     * Output a step
     * @public
     * @param Ramble.Scenario a ramble scenario object (defining .title)
     * @returns void
     */
    ouputScenario : function ( scenario ) {},
    /**
     * Output a step
     * @public
     * @param String step the string of the step definition
     * @param String status the pass / fail / undefined status of the test
     * @returns void
     */
    outputStep : function ( step, status ) {},
    /**
     * Stop output for a suite of features
     * @public
     * @returns void
     */
    stop : function() {}
};
Ramble.HtmlOutputter = {
    _currentFeature : null,
    _currentScenario : null,
    _currentSteps : null,
    results : null,
    start : function() {
        this.results = $(this.results_selector);
    },
    outputFeature : function ( feature ) {
        var div = $('<div/>', {class:'ramble-feature'});
        this.results.append(div);
        div.append($('<h3/>', {text:feature.title}));
        var description = feature.description.split('\n').join('<br/>');
        div.append($('<p/>', {class:'ramble-description',html:description}));
        this._currentFeature = div;
    },
    outputScenario : function ( scenario ) {
        var div = $('<div/>', {class:'ramble-scenario'});
        this._currentFeature.append(div);
        div.append($('<h4/>', {text:scenario.title}));
        this._currentScenario = div;
        this._currentSteps = $('<ul/>', {class:'ramble-steps'});
        div.append(this._currentSteps);
    },
    outputStep : function ( step ) {
        var status = step.status;
        var className = 'ramble-'+status;
        var text = step.text;
        if ( status == "fail" ) {
            text += "<br /><em>" + step.error + "</em>";
        }
        if ( status == "missing" ) {
            text += "<br />"+Ramble.Parser.getExampleCode(step, true);
        }
        var li = this._currentSteps.append($('<li/>', {class:className, html:text}));
    },
    stop : function() {},
    results_selector : '#results'
};


/**
 * Loads and runs Gherkin feature files against Step matcher files
 * @author Pete Otaqui <pete@otaqui.com>
 * @version $Rev$
 */
Ramble.Runner =  {
    iframe : null,
    workspace_selector : '#workspace',
    outputter : Ramble.HtmlOutputter,
    parser : Ramble.Parser,
    paths : [],
    features : [],
    matchers : [],
    page_loading : false,
    init : function() {
        this.outputter.start();
        if ( !this.iframe ) {
            this.iframe = $('<iframe id="browser" />').appendTo(this.workspace_selector);
            this.iframe.css({width:500, height:300});
            this.iframe.load(function() {
                Ramble.Runner.page_loading = false;
                var contents = $(this).contents();
                contents.find('a').click(function() {
                    Ramble.Runner.getUrl($(this).attr('href'));
                })
                contents.find('form').submit(function() {
                    Ramble.Runner.page_loading = true;
                });
                Ramble.Runner.run(contents);
            }).bind('urlChange.ramble', function(event, data) {
                Ramble.Runner.page_loading = true;
                $(this).attr('src', data.href);
            });
        }
    },
    /**
     * Loads a feature file using Ajax
     * @public
     * @param String file URL to load
     * @returns void
     */
    loadFeatureFile : function(file) {
        //Ramble._debug('loadFeatureFile', file);
        $.ajax({
            url: file,
            success: function(data) {
                Ramble.Runner._parseFeatureFile(data, file);
            },
            dataType: 'text/plain',
            async: false
        });
    },
    /**
     * Test run method, a "breaking queue"
     * @public
     * @param NodeList elements jQuery nodelist of elements to run tests on
     * @returns void
     */
    run : function(elements) {
        while ( this._queue_index < this._queue.length-1 ) {
            if ( Ramble.Runner.page_loading ) {
                return;
            }
            var item = this._queue[ this._queue_index ];
            var found;
            $.each(this._befores, function() {
                this.apply(elements);
            });
            switch ( item.type ) {
                case "feature" :
                    this.outputter.outputFeature(item);
                break;
                case "scenario" :
                    this.outputter.outputScenario(item);
                break;
                case "step" :
                    var step = item.text;
                    if ( item.comment == true ) {
                        item.status = "comment";
                    } else if ( $.trim(step) == "pending" ) {
                        item.status = "pending";
                    } else {
                        found = null;
                        $.each(this.matchers, function() {
                            var match = step.replace(/^(Given|When|Then|And)\s+/, '').match(this.regexp);
                            if ( match ) {
                                found = { matches: match.slice(1), test: this.test };
                                return;
                            }
                        });
                        if ( found !== null ) {
                            try {
                                var result = found.test.apply(elements, found.matches);
                                item.status = "pass";
                            } catch (error) {
                                item.status = "fail";
                                item.error = error;
                            }
                        } else {
                            item.status = "missing";
                        }
                    }
                    this.outputter.outputStep(item);
                break;
            }
            this._queue_index++;
        }
    },
    /**
     * Add a matcher
     * @public
     * @param RegExp match The regular expression match
     * @param Function test The test to run on the page
     * @return void
     */
    match : function(regexp, test) {
        var matcher = {regexp:regexp, test:test};
        Ramble._debug("add matcher", matcher);
        this.matchers.push(matcher);
    },
    /**
     * Adds a path matcher
     * @public
     * @param RegExp regexp The "name" of the page as a regex
     * @param String path The url of the page
     * @returns void
     */
    addPath : function(regexp, path) {
        this.paths.push({regexp:regexp, path:path});
    },
    getUrl: function(url) {
        Ramble._debug("getUrl() ", url);
        this.iframe.trigger('urlChange.ramble', { href: url });
    },
    pathTo : function(path_name) {
        found = null;
        $.each(this.paths, function() {
            var match = path_name.match(this.regexp);
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
    _parseFeatureFile : function(data, file) {
        var feature = Ramble.Parser.parseFeatureFile(data);
        this.addFeatureObject(feature);
    },
    addFeatureObject : function(feature) {
        var queue = this._queue;
        queue.push(feature);
        $.each(feature.scenarios, function() {
            queue.push( this )
            $.each(this.steps, function() {
                queue.push( this );
            })
        });
    },
    before : function(beforeFunction) {
        this._befores.push(beforeFunction);
    },
    _befores : [],
    _queue : [],
    _queue_index : 0
}
var ramble = Ramble.Runner;

/*
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

    this.iframe.css('width', 500).css('height', 300).load(function() {
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
      success: function(data) { 
        ramble._parse(data);
        ramble._run();
      },
      dataType: 'text/plain',
      async: false
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
    $.each(data.split('\n'),function() {
      var trimmed = $.trim(this.toString());
      if(trimmed != '') ramble.steps.push(trimmed);
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
      // These checks are all a little crude but until we need proper parser this works.
      if(line.indexOf('Feature:') == 0) {
        this.results.append($('<h3/>', { text: line.replace(/^Feature:\s+/, '') }));
        continue;
      } else if(line.indexOf('Scenario:') == 0) {
        this.results.append($('<p/>', { text: line, 'class': 'scenario' }));
        continue;
      } else if (line.indexOf('#') == 0) {
        this.results.append($('<p/>', { text: line, 'class': 'comment' }));
        continue;
      }
      
      var found = null;
      $.each(matchers, function() {
        var match = line.replace(/^(Given|When|Then|And)\s+/, '').match(this.regexp);
        if(match) {
          found = { matches: match.slice(1), func: this.func };
          return;
        };
      });
      
      if(found == null) {
        var code = line.replace(/^(Given|When|Then|And)\s+/, '').replace(/"([^\"]*)"/, '"([^\"]*)"');
        var args = [];
        var quotes = line.match(/"/g);
        if(quotes) {
          for(i = 0; i < parseInt(quotes.length / 2); i++) {
            args.push('arg' + (i + 1));
          }
        }
        
        this.results.append($('<p/>', { 
          html: "Missing step definition:<br/><pre>ramble.match(/^" + code
                          + '$/, function(' + args.join(', ') + ') {\n  // code\n});</pre>', 'class': 'missing'
        }));
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

*/