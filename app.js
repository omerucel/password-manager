(function(){
    // Application
    window.App = {
        Router: null,
        Views: {},
        Models: {},
        Collections: {},
        Instances: {}
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

        localStorage: new Backbone.LocalStorage('AccountCollection'),

        comparator: function(account){
            return account.get('accountName');
        }
    });

    // Login View
    App.Views.Login = Backbone.View.extend({
        className: 'login-page',

        template: Handlebars.compile($('#login-template').html()),

        initialize: function(){
        },

        events: {
            "click .action-login": "actionLogin"
        },

        render: function(){
            this.$el.html(this.template({}));
            return this;
        },

        actionLogin: function (){
            var self = this;

            App.Instances.DropboxClient.authenticate(function(error){
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
            App.Instances.router.navigate('save-account', true);
        },

        actionLogout: function(){
            App.Instances.DropboxClient.signOff();
            App.Instances.router.navigate('login', true);
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
            this.$el.html(this.template({}));
            return this;
        },

        actionTurnBack: function(){
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        },

        actionSave: function(){
            var self = this;
            var account = new App.Models.Account({
                accountName: this.$('input[name=account_name]').val(),
                username: this.$('input[name=username]').val(),
                password: this.$('input[name=password]').val(),
                note: this.$('textarea[name=note]').val()
            });
            self.collection.add(account);
            account.save();

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
            "note/:id": "note",
            "*actions": "defaultRoute"
        }
    });

    App.Instances.router = new App.Router();
    App.Instances.router.on('route:login', function(){
        console.log('route:login');
        var view = new App.Views.Login();
        $('#app').html(view.render().el);
    });

    App.Instances.router.on('route:home', function(){
        console.log('route:home');
        var view = new App.Views.Home({ collection: App.Instances.accountsCollection });
        $('#app').html(view.render().el);
    });

    App.Instances.router.on('route:saveAccount', function(){
        console.log('route:saveAccount');
        var view = new App.Views.SaveAccount({ collection: App.Instances.accountsCollection });
        $('#app').html(view.render().el);
    });

    App.Instances.router.on('route:note', function(accountId){
        console.log('route:note');
        var account = App.Instances.accountsCollection.get(accountId);
        if (account == null) {
            App.Instances.router.navigate('home', {trigger: true, replace: true});
        } else {
            var view = new App.Views.Note({model: account});
            $('#app').html(view.render().el);
        }
    });

    App.Instances.router.on('route:defaultRoute', function(actions){
        App.Instances.router.navigate('home', {trigger: true, replace: true});
    });

    Backbone.history.start();
})();