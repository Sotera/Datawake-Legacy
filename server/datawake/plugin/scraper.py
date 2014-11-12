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

import datawake.util.db.datawake_mysql as db
from datawake.util.kafka import kafka_producer
from datawake.util.session.helper import is_in_session
from datawake.util.session import helper
from datawake.util.validate.parameters import required_parameters


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
@required_parameters(['domain', 'trail', 'html', 'url'])
def full_page_scrape(domain, trail, html, url):
    user = helper.get_user()
    user_id = user.get_user_id()
    user_name = user.get_user_name()
    org = user.get_org()
    return scrape_page(html, url, user_id, user_name, trail, domain, org)


post_actions = {
    'scrape': full_page_scrape,
}


@tangelo.restful
def post(action, *args, **kwargs):
    json_obj = tangelo.request_body().read()
    post_data = json.loads(json_obj, strict=False)

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)



