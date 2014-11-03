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

import datawake.util.datawake_db as db
from datawake.util import session_helper
from datawake.util.session_helper import is_in_session
from validate_parameters import required_parameters


"""

 - Save text selections for a page
 - Get Selections for a page

"""


@is_in_session
@required_parameters(['selection', 'domain', 'url'])
def save_page_selection(selection, domain, url):
    tangelo.log('savePageSelection url=' + str(url) + ' selection=' + selection + ' domain=' + domain)
    user = session_helper.get_user()
    org = user.get_org()
    postId = db.get_post_id(url)
    row = db.getBrowsePathData(org, postId, domain)
    row_id = -1
    if row['org'] == org:  # ensure the user is saving a selection to a post from their org
        row_id = db.addSelection(postId, selection)
    return json.dumps(dict(id=row_id))


@is_in_session
@required_parameters(['domain', 'trail', 'url'])
def get_selections(domain, trail, url):
    org = session_helper.get_org()
    return json.dumps(dict(selections=db.getSelections(domain, trail, url, org)))


post_actions = {
    'save': save_page_selection,
    'get': get_selections
}


@tangelo.restful
def post(action, *args, **kwargs):
    json_obj = cherrypy.request.body.read()
    post_data = json.loads(json_obj, strict=False)

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)



