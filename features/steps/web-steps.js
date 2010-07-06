// Matchers should throw an error when they get an unexpected result.

ramble.match(/^I follow "(.+)"$/, function(link_text) {
  var link = this.find('a').filter(function() { return $(this).text() == link_text; });
  if(!link.length) throw("Can't find link: " + link_text);
  link.click();
});

ramble.match(/^I press "(.+)"$/, function(button_text) {
  var button = this.find('input[type="submit"]').filter(function() { return $(this).val() == button_text; })
  if(!button.length) throw("Can't find button named: " + button_text);
  button.click();
  ramble.page_loading = true;
});

ramble.match(/^I fill in "(.+)" with "(.+)"$/, function(label_text, value) {
  var label = this.find('label').filter(function() { return $(this).text() == label_text; }).first();
  var field = this.find('input#' + label.attr('for'));
  if(!field.length) throw("Can't find field for: " + label_text);
  field.val(value);
});

ramble.match(/^I make the heading "(.+)"$/, function(color) {
  var heading = this.find('h1');
  if(!heading.length) throw("Can't find heading");
  heading.css('color', color);
});

ramble.match(/^I should see "(.+)"$/, function(string) {
  if(this.text().indexOf(string) == -1) throw('Should have seen: ' + string);
});

ramble.match(/^I am on (.+)$/, function(path_name) {
  var path = ramble.pathTo(path_name);
  if(!path) throw('Problem getting path for: ' + path_name);
  ramble.getUrl(path);
});