Ramble
=======
**The Javascript Port of Cucumber**

Intro
-----
I am a great fan of Cucumber when it comes to integration testing, however testing heavy use of javascript can be a little tedious.

I have looked into the different solutions out there such as Selenium but found them all to be fiddly to setup, however Capybara helps on this front. I was thinking, what if Cucumber could run in the browser? No need for Javascript adapters or XML parsers, Safari/Chrome/Firefox already do a great job of this. Manipulating the page such as filling in forms, clicking links etc. could all be done with jQuery, in a very concise manor.

The main benefits of a browser based Cucumber (for both javascript and non javascript apps) are:

  * Speed - browsers are getting extremely quick at this DOM stuff.
  * Flexibility - everything happens client-side meaning you can easily test with any server technology.
  * Simplicity - no need for complex javascript adapters, XML parsers etc.

Quick Start
-----------

### File structure

The basic file structure is very similar to Cucumber:
    - features
        index.html
      - js
          ramble.js
          jquery-1.4.2.js
        my.feature
      - steps
          web-steps.js
      - support
          paths.js
    
### Features

Features are exactly the same as in Cucumber, so you can do something like the following:
    Feature: User supplies details
      In order to supply my details
      As a visitor
      I want to be able to submit them via a form
  
      Scenario: User fill out a form
        Given I am on the homepage
        And I follow "Tell us your name"
        And I fill in "First name" with "Jamie"
        And I fill in "Last name" with "Hill"
        And I press "Submit"
        Then I should see "Thank you for your details."
        
### Step definitions

Step definitions can be defined in a plain old javascript files with plain old jQuery, in this case web-steps.js. Currently the step definition are expected to throw an error if they cannot be fulfilled, this may change when a solid API is nailed down:

    // The value of 'this' is the current document as a jQuery object.
    ramble.match(/^I follow "(.+)"$/, function(link_text) {
      var link = this.find('a').filter(function() { return $(this).text() == link_text; });
      if(!link.length) throw("Can't find link: " + link_text);
      link.click();
    });

### Running locally

There is a simple server script allowing the features to be run locally (requires Ruby). If you want to see it in action, just run:

    cd /path/to/ramble/checkout
    ruby server.rb

…and then visit http://localhost:1234/features in your browser (tested in Firefox, Chrome and Safari). Note that Ramble is not at all dependent on Ruby, it is just used for running a local test server.