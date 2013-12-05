'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

describe('my app', function() {

    beforeEach(function() {

        browser().navigateTo('/');
    });

    afterEach ( function () {

        pause ();
    });

    it ('should automatically redirect to /list when location hash/fragment is empty', function() {

        expect(browser().location().url()).toBe("/list");
    });

    describe('list', function() {

        beforeEach(function() {

            browser().navigateTo('#/list');
        });

        it ( 'should navigate to /new when \'Add New User\' is clicked', function () {

            element("a:contains('Add New User')").click();
            expect(browser().location().url()).toBe('/new');
        });
    });

    describe('new', function() {

        beforeEach(function() {

            browser().navigateTo('#/new');
        });

        it ( 'should navigate to /list when \'Cancel\' is clicked', function () {

            element("a:contains('Cancel')" ).click();
            expect(browser().location().url()).toBe('/list');
        });
    });

    it ( 'adding a new user e2e scenario', function () {

        browser().navigateTo('#/list');
        var numUsers = repeater('tbody tr').count();

        element("a:contains('Add New User')").click();
        expect(browser().location().url()).toBe('/new');

        // Fill in new user data and click Save
        input('Cntrl.user.name').enter("Amy");
        input('Cntrl.user.email').enter("amy@gmail.com");
        input('Cntrl.user.phone').enter("111");
        element("button:contains('Save')").click();

        browser().navigateTo('#/list');

        var newNumUsers = repeater('tbody tr').count();

        console.log ( newNumUsers, numUsers );
        //expect(newNumUsers.value).toBe(numUsers.value + 1);
    });
});

