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
            compiledTemplate: function(templateId) {
                return _.template($(templateId).html());
            },
            requireAuthentication: function(callback) {
                if (App.Instances.dropboxClient.isAuthenticated()) {
                    if (!App.Instances.masterPassword) {
                        App.Instances.router.navigate('master-password-login', {trigger: true, reload: true});
                    } else {
                        callback();
                    }
                } else {
                    App.Instances.router.navigate('login', {trigger: true, reload: true});
                }
            },
            encrypt: function(value){
                return CryptoJS.RC4.encrypt(value, App.Instances.masterPassword).toString(CryptoJS.enc.Utf8);
            },
            decrypt: function(value) {
                return CryptoJS.RC4.decrypt(value, App.Instances.masterPassword).toString(CryptoJS.enc.Utf8);
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
        },

        decryptedUsername: function() {
            if (this.get('username').length > 0) {
                return App.Helpers.decrypt(this.get('username'));
            } else {
                return '';
            }
        },

        decryptedPassword: function() {
            if (this.get('password').length > 0) {
                return App.Helpers.decrypt(this.get('password'));
            } else {
                return '';
            }
        },

        decryptedNote: function() {
            if (this.get('note').length > 0) {
                return App.Helpers.decrypt(this.get('note'));
            } else {
                return '';
            }
        }
    });

    // Account Collection
    App.Collections.Accounts = Backbone.Collection.extend({
        model: App.Models.Account,

        dropboxDatastore: new Backbone.DropboxDatastore('AccountsCollection', {
            datastoreId: 'accounts'
        }),

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

        template: App.Helpers.compiledTemplate('#login-template'),

        events: {
            "click .action-login": "actionLogin"
        },

        render: function(){
            this.$el.html(this.template({}));
            return this;
        },

        actionLogin: function (){
            App.Instances.dropboxClient.authenticate(function(error){
                if (error) {
                    alert('Authentication error: ' + error);
                    return;
                }

                App.Instances.router.navigate('home', {trigger: true, replace: true});
            });
        }
    });

    // Master Password View
    App.Views.MasterPassword = Backbone.View.extend({
        className: 'master-password-login-page',

        template: App.Helpers.compiledTemplate('#master-password-login-template'),

        events: {
            "click .action-login": "actionLogin"
        },

        render: function(){
            this.$el.html(this.template({}));
            return this;
        },

        actionLogin: function(){
            App.Instances.masterPassword = this.$('input[name=master_password]').val();
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        }
    });

    // Account View
    App.Views.Account = Backbone.View.extend({
        className: 'account',

        template: App.Helpers.compiledTemplate('#account-template'),

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
            $('#copy-popup .username span').html(this.model.decryptedUsername());
            $('#copy-popup .password span').html(this.model.decryptedPassword());

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

        template: App.Helpers.compiledTemplate('#home-template'),

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

        template: App.Helpers.compiledTemplate('#save-account-template'),

        events: {
            'click .action-turn-back': 'actionTurnBack',
            'click .action-save': 'actionSave',
            'click .action-generate-password': 'actionGeneratePassword'
        },

        render: function(){
            this.$el.html(this.template({
                accountName: this.model.get('accountName'),
                username: this.model.decryptedUsername(),
                password: this.model.decryptedPassword(),
                note: this.model.decryptedNote()
            }));
            return this;
        },

        actionTurnBack: function(){
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        actionSave: function(){
            var encryptedUsername = App.Helpers.encrypt(this.$('input[name=username]').val());
            var encryptedPassword = App.Helpers.encrypt(this.$('input[name=password]').val());
            var encryptedNote = App.Helpers.encrypt(this.$('textarea[name=note]').val());

            this.model.set('accountName', this.$('input[name=account_name]').val());
            this.model.set('username', encryptedUsername);
            this.model.set('password', encryptedPassword);
            this.model.set('note', encryptedNote);

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

        template: App.Helpers.compiledTemplate('#note-template'),

        events: {
            'click .action-turn-back': 'actionTurnBack'
        },

        actionTurnBack: function(){
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        render: function(){
            this.$el.html(this.template({note: this.model.decryptedNote()}));
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
            "master-password-login": "masterPasswordLogin",
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

        App.Instances.masterPassword = null;
        if (App.Instances.dropboxClient.isAuthenticated()) {
            App.Instances.dropboxClient.signOff();
        }
        var view = new App.Views.Login();
        $('#app').html(view.render().el);
    });

    App.Instances.router.on('route:masterPasswordLogin', function(){
        console.log('route:masterPasswordLogin');

        var view = new App.Views.MasterPassword();
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