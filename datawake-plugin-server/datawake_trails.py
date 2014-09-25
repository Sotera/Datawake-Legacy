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

import re
import json

import tangelo
import cherrypy
import datawaketools.datawake_db as db


"""
 List / Create Trails

    primarily used on the plugin newTab.

"""


def getUser():
    assert ('user' in cherrypy.session)
    user = cherrypy.session['user']
    assert ('org' in user)
    return user


#
# Perform a starts-with search for trails
#
def get_trails(domain=u''):
    user = getUser()
    org = user['org']
    return getTrails(org, domain)


def getTrails(org, domain):
    trails = db.listTrails(org, domain)
    result = [{'name': '', 'description': ''}]
    result.extend(trails)
    response = dict(trails=result)
    return json.dumps(response)


def add_trail(trailname=u'', traildescription=u'', domain=u''):
    tangelo.log('datawake_trails POST trailname=' + trailname + ' traildescription=' + traildescription + ' domain=' + domain + ')')
    user = getUser()
    org = user['org']
    valid = re.match('^[\w]+$', trailname) is not None
    if not valid:
        raise ValueError("Trail names must be alphanumeric")
    if trailname == u'':
        raise ValueError("Trail names can not be blank")
    if ':' in trailname:
        raise ValueError("Trail names can not contain the character ':' ")
    else:
        db.addTrail(org, trailname, traildescription, user['email'], domain=domain)
    return json.dumps(dict(success=True))


post_actions = {
    'trails': get_trails,
    'createTrail': add_trail
}


@tangelo.restful
def post(action, *args, **kwargs):
    body = cherrypy.request.body.read()
    post_data = json.loads(body)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)