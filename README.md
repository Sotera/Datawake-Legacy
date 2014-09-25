# Datawake 


## Local Development Environemnts using Vagrant

While the datawake is designed to operate in conjunction with a cluster running kafka, storm, hbase and impla and web crawlers a local deployment is great for developemnt and integration.  For easy set up of development environemtns we use Vagrant.

1. Install [Vagrant](https://www.vagrantup.com/)
2. If you don't already have a virtualization solution install [Virtual Box](https://www.virtualbox.org/)
3. clone this repo
4. execute the 'vagrant up' command from the directory containing VagrantFile
5. visit [localhost:8088/domain-loader](http://localhost:8088/domain-loader) to esnure everythign is up and running.



## Datawake Authentication

The datawake uses google authentication to validate users and matches user email addresses with a local database to find each users organization.  Users can only access data collected for their own organization.

**By default authentication is turned OFF** and a single mock user (John Doe) is provided.  To enable authentication you must do the following.

1. First do some background reading on using OAuth with google [Using OAuth 2.0 for Login](https://developers.google.com/accounts/docs/OAuth2Login)
2. Set up a project with google as recommended in step 1. You'll have to set up a client id for the forensic view (and set that client id in the forensic/index.html google-singin-clientid meta field). You'll also need to setup a client ID for the chrome plugin and set that in the manifest.json file.  Details for these steps are included in Google's documentation.
3. Under util/datawaketools edit your datawakeconfig.py file to set MOCK_AUTH = False
4. Re-build datawaketools by running python setup.py install from the util directory.
5. For the datawake extension replace js/singin.js with js/prod_singin.js
6. For the forensic view edit forensic/index.html.  the script near the top of the file should read like
```
<script type="text/javascript">
    (function() {

        authHelper.setOnLoggedIn(function(){
            //once a session is established on the datawake server refresh the view
            refreshForensicView()
        })

        /* comment out for google auth 
        authHelper.onSignInCallback({'access_token':'123456'})
        */

        /* comment in to enable google auth auth */
        var po = document.createElement('script');
        po.type = 'text/javascript'; po.async = true;
        po.src = 'https://apis.google.com/js/client:plusone.js?onload=render';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(po, s);
        
    })();

    function onSignInCallback(authResult) {
        authHelper.onSignInCallback(authResult);
    }
</script>
```





