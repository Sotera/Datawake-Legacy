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
import datawaketools.datawake_db as db
from datawaketools import kafka_producer

from users import is_in_session
import users
from validate_parameters import required_parameters


"""

 - Post page contents to the kafka queue for processing

 - Save text selections for a  page


"""


#
# postType is 'scrape' to do a full page scrape,
# 'selection' to save a selected text
#
# for scrape:
# postTtype = 'scrape'
# cookie = cookies from the page
# html = full html from the page
# url = the page url
# userId  = the user Id from google
# userName = the user screen name from google
# (all others ignored)
#
# for selection (saving highlighted text):
# postType = 'selection'
# selection = 'the text to save'
# postId = 'the post id this selection is associated with'


@is_in_session
@required_parameters(['selection', 'domain', 'postId'])
def save_page_selection(selection, domain, postId):
    tangelo.log('savePageSelection postId=' + str(postId) + ' selection=' + selection + ' domain=' + domain)
    user = users.get_user()
    org = user['org']

    row = db.getBrowsePathData(org, postId, domain)

    assert (row['org'] == org)  # ensure the user is saving a selection to a post from their org
    id = db.addSelection(postId, selection)
    return json.dumps(dict(id=id))


def scrape_page(html, url, userId, userName, trail, domain, org):
    tangelo.log('USER NAME: ' + userName)
    domain = domain.encode('utf-8')
    org = org.encode('utf-8')
    html = html.encode('utf-8')
    url = url.encode('utf-8')
    tangelo.log('posting url contents to kafka: ' + url)
    kafka_producer.sendVisitingMessage(org, domain, str(userId), url, html)
    # add the row to the database

    id = db.addBrowsePathData(org, url, userId, userName, trail, domain=domain)

    # get number of times this url appears in the database
    count = db.getUrlCount(org, url, domain=domain)
    result = dict(id=id, count=count)
    tangelo.log("POSTED url:" + url + "  return: " + str(result))
    return json.dumps(result)


@is_in_session
@required_parameters(['domain', 'trail', 'url'])
def get_selections(domain, trail, url):
    org = users.get_org()
    return json.dumps(dict(selections=db.getSelections(domain, trail, url, org)))


@is_in_session
@required_parameters(['domain', 'trail', 'html', 'url'])
def full_page_scrape(domain, trail, html, url):
    user = users.get_user()
    user_id = user.get('userId')
    user_name = user.get("userName")
    org = user.get('org')
    return scrape_page(html, url, user_id, user_name, trail, domain, org)


post_actions = {
    'scrape': full_page_scrape,
    'selection': save_page_selection,
    'selections': get_selections
}


@tangelo.restful
def post(action, *args, **kwargs):
    json_obj = cherrypy.request.body.read()
    post_data = json.loads(json_obj, strict=False)

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)



