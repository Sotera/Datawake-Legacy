"""

Copyright 2014 Sotera Defense Solutions, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

import json

import tangelo
import cherrypy

from datawake.conf import datawakeconfig
from datawake.util.authentication import googleauth
from datawake.util.db import datawake_mysql


"""
To use sessions you must set the cherrypy configuration.  Currently this is done manually / hard coded.
working with kitware to improve for tangelo
"""

MOCK_FORENSIC_AUTH = False
MOCK_USER_ORG = 'MEMEXDEMO'


@tangelo.restful
def get():
    if 'user' in cherrypy.session:
        return json.dumps(dict(user=cherrypy.session['user'].__dict__, hasSession=True))
    return json.dumps(dict(hasSession=False))


@tangelo.restful
def post(token=u''):
    user = None
    if 'user' in cherrypy.session and 'token' in cherrypy.session and cherrypy.session['token'] == token:
        tangelo.log('plugin-sever.session tokens matched using existing session.')
        user = cherrypy.session['user']
    else:
        user = googleauth.getUserFromToken(token, mock=MOCK_FORENSIC_AUTH)
        tangelo.log('session.post verified user: ' + str(user))
    org = MOCK_USER_ORG
    if not datawakeconfig.MOCK_AUTH and not MOCK_FORENSIC_AUTH:
        orgs = datawake_mysql.getOrgLinks(user.get_email())
        assert (len(orgs) == 1)
        org = orgs[0]

    user.set_org(org)
    cherrypy.session['user'] = user
    cherrypy.session['token'] = token
    return json.dumps(user.__dict__)


@tangelo.restful
def delete():
    if 'user' in cherrypy.session:
        del cherrypy.session['user']
    if 'token' in cherrypy.session:
        del cherrypy.session['token']
    cherrypy.lib.sessions.expire()
    tangelo.log('manually expired session')
    return json.dumps(dict(removedSession=True))
