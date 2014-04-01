var DROPBOX_KEY = 'y2wcqthd1fi73hr';

(function(){
    // Application
    window.App = {
        Router: null,
        Views: {},
        Models: {},
        Collections: {},
        Instances: {},
        Helpers: {
            requireAuthentication: function(callback) {
                if (App.Instances.dropboxClient.isAuthenticated()) {
                    callback();
                } else {
                    App.Instances.router.navigate('login', {trigger: true, reload: true});
                }
            }
        }
    };

    // Account Model
    App.Models.Account = Backbone.Model.extend({
        defaults: function(){
            return {
                accountName: '',
                username: '',
                password: '',
                note: ''
            }
        }
    });

    // Account Collection
    App.Collections.Accounts = Backbone.Collection.extend({
        model: App.Models.Account,

        dropboxDatastore: new Backbone.DropboxDatastore('AccountsCollection', {
            datastoreId: 'accounts'
        }),

        //localStorage: new Backbone.LocalStorage('AccountCollection'),

        initialize: function(){
            this.dropboxDatastore.syncCollection(this);
        },

        comparator: function(account){
            return account.get('accountName');
        }
    });

    // Login View
    App.Views.Login = Backbone.View.extend({
        className: 'login-page',

        template: Handlebars.compile($('#login-template').html()),

        events: {
            "click .action-login": "actionLogin"
        },

        render: function(){
            this.$el.html(this.template({}));
            return this;
        },

        actionLogin: function (){
            var self = this;

            App.Instances.dropboxClient.authenticate(function(error){
                if (error) {
                    alert('Authentication error: ' + error);
                    return;
                }

                App.Instances.router.navigate('home', {trigger: true, replace: true});
            });
        }
    });

    // Account View
    App.Views.Account = Backbone.View.extend({
        className: 'account',

        template: Handlebars.compile($('#account-template').html()),

        events: {
            "click .action-open-copy-popup": "actionOpenCopyPopup",
            "click .action-show-note": "actionShowNote",
            "click .action-remove": "actionRemove",
            "click .action-edit": "actionEdit"
        },

        render: function(){
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        actionOpenCopyPopup: function(){
            $('#copy-popup .username span').html(this.model.get('username'));
            $('#copy-popup .password span').html(this.model.get('password'));

            $.magnificPopup.open({
                items: {
                    type: 'inline',
                    src: '#copy-popup'
                }
            });
        },

        actionShowNote: function(){
            App.Instances.router.navigate('note/' + this.model.get('id'), {trigger: true, replace: true});
        },

        actionEdit: function(){
            App.Instances.router.navigate('save-account/' + this.model.get('id'), {trigger: true, replace: true});
        },

        actionRemove: function(){
            if (confirm('Are you sure you want to remove the account?')) {
                this.model.destroy();
            }
        }
    });

    // Home View
    App.Views.Home = Backbone.View.extend({
        className: 'home-page',

        template: Handlebars.compile($('#home-template').html()),

        initialize: function(){
            this.listenTo(this.collection, 'add', this.addOne);
            this.listenTo(this.collection, 'reset', this.render);
            this.listenTo(this.collection, 'all', this.render);

            this.collection.fetch();
        },

        events: {
            "click .action-new-account": "actionNewAccount",
            "click .action-logout": "actionLogout",
            "keyup input[name=q]": "actionSearch"
        },

        render: function(){
            this.$el.html(this.template({}));
            this.filterCollection();
            return this;
        },

        filterCollection: function(){
            this.$('.accounts').empty();

            var filteredAccounts = this.collection.filter(function(account){
                if (account.get('accountName').indexOf(this.$('input[name=q]').val()) > -1){
                    return true;
                }

                return false;
            }, this);

            if (filteredAccounts.length > 0) {
                _.each(filteredAccounts, function(account){
                    this.addOne(account);
                }, this);
                this.$('.empty-message').hide();
            } else {
                this.$('.empty-message').show();
            }
        },

        addOne: function(account){
            var view = new App.Views.Account({ model: account });
            this.$('.accounts').append(view.render().el);
        },

        actionNewAccount: function(){
            App.Instances.router.navigate('save-account', {trigger: true, reload: true});
        },

        actionLogout: function(){
            App.Instances.router.navigate('login', {trigger: true, reload: true});
        },

        actionSearch: function(){
            this.filterCollection();
        }
    });

    // Save Account View
    App.Views.SaveAccount = Backbone.View.extend({
        className: 'save-account-page',

        template: Handlebars.compile($('#save-account-template').html()),

        initialize: function(){
        },

        events: {
            'click .action-turn-back': 'actionTurnBack',
            'click .action-save': 'actionSave',
            'click .action-generate-password': 'actionGeneratePassword'
        },

        render: function(){
            console.log(this.model.toJSON());
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        actionTurnBack: function(){
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        actionSave: function(){
            this.model.set('accountName', this.$('input[name=account_name]').val());
            this.model.set('username', this.$('input[name=username]').val());
            this.model.set('password', this.$('input[name=password]').val());
            this.model.set('note', this.$('textarea[name=note]').val());

            if (!this.collection.contains(this.model)) {
                this.collection.add(this.model);
            }

            this.model.save();
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        actionGeneratePassword: function() {
            this.$('input[name=password]').val(generatePassword(12, false));
        }
    });

    // Note View
    App.Views.Note = Backbone.View.extend({
        className: 'note-page',

        template: Handlebars.compile($('#note-template').html()),

        events: {
            'click .action-turn-back': 'actionTurnBack'
        },

        actionTurnBack: function(){
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        render: function(){
            var note = this.model.get('note');
            this.$el.html(this.template({note: note}));
            return this;
        }
    });

    // Dropbox Client
    App.Instances.dropboxClient = new Dropbox.Client({key: DROPBOX_KEY});
    App.Instances.dropboxClient.authenticate({interactive: false});
    Backbone.DropboxDatastore.client = App.Instances.dropboxClient;

    // Collections Instances
    App.Instances.accountsCollection = new App.Collections.Accounts();

    /**
     * Router
     */
    App.Router = Backbone.Router.extend({
        routes: {
            "login": "login",
            "home": "home",
            "save-account": "saveAccount",
            "save-account/:id": "saveAccount",
            "note/:id": "note",
            "*actions": "defaultRoute"
        }
    });

    App.Instances.router = new App.Router();
    App.Instances.router.on('route:login', function(){
        console.log('route:login');

        if (App.Instances.dropboxClient.isAuthenticated()) {
            App.Instances.dropboxClient.signOff();
        }
        var view = new App.Views.Login();
        $('#app').html(view.render().el);
    });

    App.Instances.router.on('route:home', function(){
        console.log('route:home');

        App.Helpers.requireAuthentication(function(){
            var view = new App.Views.Home({ collection: App.Instances.accountsCollection });
            $('#app').html(view.render().el);
        });
    });

    App.Instances.router.on('route:saveAccount', function(accountId){
        console.log('route:saveAccount');

        App.Helpers.requireAuthentication(function(){
            var account = App.Instances.accountsCollection.get(accountId);
            if (account == null) {
                account = new App.Models.Account();
            }

            var view = new App.Views.SaveAccount({ collection: App.Instances.accountsCollection, model: account });
            $('#app').html(view.render().el);
        });
    });

    App.Instances.router.on('route:note', function(accountId){
        console.log('route:note');

        App.Helpers.requireAuthentication(function(){
            var account = App.Instances.accountsCollection.get(accountId);
            if (account == null) {
                App.Instances.router.navigate('home', {trigger: true, replace: true});
            } else {
                var view = new App.Views.Note({model: account});
                $('#app').html(view.render().el);
            }
        });
    });

    App.Instances.router.on('route:defaultRoute', function(actions){
        App.Instances.router.navigate('home', {trigger: true, replace: true});
    });

    Backbone.history.start();
})();