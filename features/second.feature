Feature: Following links and filling out forms

  Scenario: User visits page one
    Given I am on page one
    Then I should see "I am an example page"

  Scenario: User visits page two
    Given I am on page two
    Then I should see "Yay, you found me!"

  Scenario: User fill out a form
    Given I am on the homepage
    When I make the heading "orange"
    And I follow "Another page"
    And I fill in "First name" with "Jamie"
    And I fill in "Last name" with "Hill"
    # The following step should fail.
    And I fill in "Age" with "31"
    And I press "Submit"
    Then I should see "Done"