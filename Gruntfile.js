module.exports = function(grunt){
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        compass: {
            dist: {
                options: {
                    sassDir: 'assets/sass',
                    cssDir: 'assets/style',
                    fontsDir: 'assets/font',
                    environment: 'production',
                    outputStyle: 'compressed',
                    specify: 'assets/sass/app.scss',
                    watch: true
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 8000,
                    keepalive: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-connect');
};