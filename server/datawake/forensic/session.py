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

from datawake.util.authentication import factory
from datawake.util.db import datawake_mysql
from datawake.util.session import helper as session_helper


"""
To use sessions you must set the cherrypy configuration.  Currently this is done manually / hard coded.
working with kitware to improve for tangelo
"""


@tangelo.restful
@session_helper.is_in_session
def get():
    return json.dumps(dict(user=session_helper.get_user().__dict__, hasSession=True))


@tangelo.restful
def post(token=u''):
    user = session_helper.get_user()
    org = None
    if user is not None and session_helper.is_token_in_session() and session_helper.get_token() == token:
        #tangelo.log('plugin-sever.session tokens matched using existing session.')
        user = session_helper.get_user()
    else:
        auth_helper = factory.get_authentication_object(token)
        user = auth_helper.get_user_from_token()
        tangelo.log('session.post verified user: ' + str(user))
    orgs = datawake_mysql.getOrgLinks(user.get_email())
    if len(orgs) == 1:
        org = orgs[0]
    else:
        raise ValueError("No org was found for this user.")

    user.set_org(org)
    session_helper.set_user(user)
    session_helper.set_token(token)
    return json.dumps(user.__dict__)


@tangelo.restful
def delete():
    tangelo.log('manually expired session')
    return json.dumps(dict(removedSession=session_helper.expire_user()))
