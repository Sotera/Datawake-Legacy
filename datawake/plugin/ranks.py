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

import urllib
import json

import tangelo
import cherrypy
import datawaketools.datawake_db as db

import session_helper
from session_helper import is_in_session
from validate_parameters import required_parameters


"""

  User ranks a url (within the context of a trail)

"""


#
# Get the ranking for a url
# specific to a user and trail
#
@is_in_session
@required_parameters(['trailname', 'url', 'domain'])
def get_rank(trailname, url, domain):
    user = session_helper.get_user()
    org = user.get_org()
    user_id = user.get_user_id()
    url = url.encode('utf-8')
    url = urllib.unquote(url)
    rank = db.getUrlRank(org, user_id, trailname, url, domain=domain)
    response = dict(rank=rank)
    return json.dumps(response)


#
# Set the ranking for a url
# specifc to a user and trail
@is_in_session
@required_parameters(['trailname', 'url', 'domain', 'rank'])
def set_rank(trailname, url, rank, domain):
    user = session_helper.get_user()
    org = user.get_org()
    user_id = user.get_user_id()
    db.rankUrl(org, user_id, trailname, url, rank, domain=domain)
    return json.dumps(dict(success=True))


post_actions = {
    'getRank': get_rank,
    'setRank': set_rank
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(cherrypy.request.body.read(), strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(404, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)