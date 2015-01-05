var express = require('express');
var auth = require('http-auth');
var basic = auth.basic({
        realm: 'Datawake Forensic',
        file: './.htpassword'
    }
);

// Application setup.
var app = express();
app.use(auth.connect(basic));

// Setup route.
app.use('/',express.static('../server/forensic_v2'));
app.listen(9006);
