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


"""

 - Post page contents to the kafka queue for processing

 - Save text selections for a  page


"""


def getUser():
    assert ('user' in cherrypy.session)
    user = cherrypy.session['user']
    assert ('org' in user)
    return user


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


def savePageSelection(selection, domain, postId=None):
    tangelo.log('savePageSelection postId=' + str(postId) + ' selection=' + selection + ' domain=' + domain)
    user = getUser()
    org = user['org']

    row = db.getBrowsePathData(org, postId, domain)

    assert (row['org'] == org)  # ensure the user is saving a selection to a post from their org
    id = db.addSelection(postId, selection)
    return json.dumps(dict(id=id))


def scrape_page(cookie, html, url, userId, userName, trail, domain):
    if domain == u'' or trail == u'':
        raise ValueError('datawakescrapper fullPageScrape must provide trail and domain. domain=' + domain + ' trail=' + trail)
    user = getUser()
    tangelo.log('USER NAME: '+userName)
    if len(userName) == 0:
        userName = user['userName']
    tangelo.log('USER NAME: '+userName)
    domain = domain.encode('utf-8')
    org = user['org'].encode('utf-8')
    html = html.encode('utf-8')
    url = url.encode('utf-8')
    #url = urllib.unquote(url)


    tangelo.log('posting url contents to kafka: ' + url)
    kafka_producer.sendVisitingMessage(org, domain, str(userId), url, html)


    # ad the row to the database

    id = db.addBrowsePathData(org, url, userId, userName, trail, domain=domain)

    # get number of times this url appears in the database
    count = db.getUrlCount(org, url, domain=domain)
    result = dict(id=id, count=count)
    tangelo.log("POSTED url:" + url + "  return: " + str(result))
    return json.dumps(result)


def get_selections(domain, trail, url):
    user = getUser()
    org = user['org']
    # domain = domain.encode(encoding='ascii', errors='ignore')
    # domain = domain.decode(encoding='ascii', errors='ignore')
    # trail = trail.encode(encoding='ascii', errors='ignore')
    # trail = trail.decode(encoding='ascii', errors='ignore')
    # url = url.encode(encoding='ascii', errors='ignore')
    # url = url.decode(encoding='ascii', errors='ignore')
    # org = org.encode(encoding='ascii', errors='ignore')
    # org = org.decode(encoding='ascii', errors='ignore')
    return json.dumps(dict(selections=db.getSelections(domain, trail, url, org)))


def full_page_scrape(cookie=u'', html=u'', url=u'', userName=u'', trail=u'', domain=u''):
    user = getUser()
    userId = user['userId']
    return scrape_page(cookie, html, url, userId, userName, trail, domain)


post_actions = {
    'scrape': full_page_scrape,
    'selection': savePageSelection,
    'selections': get_selections
}


@tangelo.restful
def post(action, *args, **kwargs):
    json_obj = cherrypy.request.body.read()
    post_data = json.loads(json_obj, strict=False)

    def unknown(*args):
        return tangelo.HTTPStatusCode(400, "invalid service call")

    return post_actions.get(action, unknown)(**post_data)



