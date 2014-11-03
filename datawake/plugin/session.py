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
from datawake.util import googleauth, session_helper
from datawake.util import datawake_db


"""

Establish a session for a user signed in with google.


"""

# TODO: If we add get requests to this, we should add a dictionary lookup for which method to service. See: Datawake scraper


@tangelo.restful
@session_helper.is_in_session
def get():
    return json.dumps(dict(user=session_helper.get_user().__dict__))


@tangelo.restful
def post():
    post_data = json.loads(cherrypy.request.body.read(), strict=False)
    token = post_data.get("token")
    tangelo.log("TOKEN: " + token)
    user = get_user(token)
    org = get_org(user.get_email())
    user.set_org(org)
    session_helper.set_user(user)
    session_helper.set_token(token)
    return json.dumps(user.__dict__)


def get_org(email):
    org = 'MEMEXDEMO'
    if not datawakeconfig.MOCK_AUTH:
        orgs = datawake_db.getOrgLinks(email)
        if len(orgs) == 1:
            org = orgs[0]
        else:
            raise ValueError("Org list length must be 1")
    return org


def get_user(token):
    user = session_helper.get_user()
    if session_helper.get_token() == token and user is not None:
        tangelo.log('plugin-sever.session tokens matched using existing session.')
    else:
        user = googleauth.getUserFromToken(token)
        tangelo.log('session.post verified user: ' + str(user))
    return user


@tangelo.restful
def delete():
    tangelo.log('manually expired session')
    return json.dumps(dict(success=session_helper.expire_user()))
