/**
 * Cucumber Test Runner and Gherkin Parser
 * @author Jamie Hill <jamie@soniciq.com>
 * @author Pete Otaqui <pete@otaqui.com>
 * @version $Rev$
 * @requires jQuery
 */
var Ramble = {
    debug : true,
    _debug : function() {
        console.log(arguments);
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
        var line, scenario;
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
                    scenario = new Ramble.Scenario();
                    feature.scenarios.push(scenario);
                    scenario.title = line;
                } else {
                    scenario.steps.push(line);
                }
            }
        });
        return feature;
    },
    getExampleCode : function(step) {
        var code = step.replace(/^(Given|When|Then|And)\s+/, '').replace(/"([^\"]*)"/, '"([^\"]*)"');
        var args = [];
        var quotes = step.match(/"/g);
        if(quotes) {
          for(i = 0; i < parseInt(quotes.length / 2); i++) {
            args.push('arg' + (i + 1));
          }
        }
        args = args.join(', ');
        var example = "Missing step definition:<br/>";
        example += '<pre><code>';
        example += 'ramble.match(/^' + code + '$/, function(' + args + ') {\n  // code\n});';
        example += '</code></pre>';
        return example;
    }
};
Ramble.Feature = function() {
    this.title = '';
    this.description = '';
    this.scenarios = [];
}
Ramble.Scenario = function() {
    this.title = '';
    this.steps = [];
};
/**
 * Outputter Interface defines the methods all outputters should have.
 */
Ramble.IOutputter = {
    start : function() {},
    outputFeature : function ( feature ) {},
    ouputScenario : function ( scenario ) {},
    outputStep : function ( step ) {},
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
    outputStep : function ( step, status ) {
        var className = 'ramble-'+status;
        var li = this._currentSteps.append($('<li/>', {class:className, html:step}));
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
    features : [],
    matchers : [],
    paths : [],
    init : function() {
        this.outputter.start();
        if ( !this.iframe ) {
            this.iframe = $('<iframe id="browser" />').appendTo(this.workspace_selector);
        }
    },
    /**
     * Loads a feature file using Ajax
     * @public
     * @param String file URL to load
     * @param Bool run_now run the file immediately after loading?
     * @returns void
     */
    loadFeatureFile : function(file, run_now) {
        Ramble._debug('loadFeatureFile', file, run_now);
        this._files[file] = run_now;
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
     * Shortcut to loadFeatureFile(file, true)
     * @see loadFeatureFile
     * @public
     * @param String file PAth to the feature file
     * @returns void
     */
    run : function(file) {
        this.loadFeatureFile(file, true);
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
     * Runs an array of features, defaults to own features array if
     * one is not provided.
     * @public
     * @param Array features OPTIONAL array of features
     * @returns void
     */
    runFeatures : function(features) {
        if ( !features ) features = this.features;
        Ramble._debug("Running features: ", features);
        for ( var i=0, ii=feature.length; i<ii; i++ ) {
            this.runFeature(features[i]);
        }
    },
    /**
     * Runs a feature.
     * @public
     * @returns void
     */
    runFeature : function(feature) {
        Ramble._debug("Running feature: ", feature);
        this.outputter.outputFeature(feature);
        var scenarios = feature.scenarios;
        for ( var i=0, ii=feature.scenarios.length; i<ii; i++ ) {
            this.runScenario(scenarios[i]);
        }
    },
    /**
     * Runs a scenario.
     * @public
     * @param Ramble.Scenario scenario The scenario to run
     * @returns void
     */
    runScenario : function(scenario) {
        Ramble._debug("Running scenario: ", scenario);
        this.outputter.outputScenario(scenario);
        for ( var i=0, ii=scenario.steps.length; i<ii; i++ ) {
            this.runStep(scenario.steps[i]);
        }
    },
    /**
     * Runs a step.
     * @public
     * @param string step The step to run
     * @returns void
     */
    runStep : function(step) {
        Ramble._debug("Running step: ", step);
        var status = "",
            found = null;
        if ( step.indexOf('#') == 0 ) {
            status = "comment";
        } else {
            $.each(this.matchers, function() {
                var match = step.replace(/^(Given|When|Then|And)\s+/, '').match(this.regexp);
                if ( match ) {
                    found = { matches: match.slice(1), func: this.func };
                    return;
                }
            })
        }
        if ( found !== null ) {
            try {
                var result = found.func.apply(elements)
            } catch (error) {
                
            }
        } else {
            status = "missing";
            step = Ramble.Parser.getExampleCode(step);
        }
        this.outputter.outputStep(step, status);
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
    _files : {},
    _parseFeatureFile : function(data, file) {
        var feature = Ramble.Parser.parseFeatureFile(data);
        this.features.push( feature );
        if ( this._files[file] ) this.runFeature(feature);
    }
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