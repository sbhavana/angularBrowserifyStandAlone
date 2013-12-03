'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

describe('my app', function() {

    beforeEach(function() {
        browser().navigateTo('app/index.html');
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

        it ( 'should navigate to /new when adding new user is clicked', function () {

            element("a:contains('Add New User')").click();
            expect(browser().location().url()).toBe('/new');
        });
    });

    describe('new', function() {

        beforeEach(function() {

            browser().navigateTo('#/new');
        });

        it ( 'should navigate to /list when Cancel is clicked', function () {

            element("a:contains('Cancel')" ).click();
            expect(browser().location().url()).toBe('/list');
        });
    });

});
