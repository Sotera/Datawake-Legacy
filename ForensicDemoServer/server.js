var express = require('express');
var app = express();
app.use('/', express.static('../server/forensic_v2'));
app.listen(9006);
