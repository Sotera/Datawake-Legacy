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
import datawaketools.entity_data_connector_factory as factory


"""

  Get lookahead data for a give URL

"""

# TODO: If we add get requests to this, we should add a dictionary lookup for which method to service. See: Datawake scraper

def getUser():
    assert ('user' in cherrypy.session)
    user = cherrypy.session['user']
    assert ('org' in user)
    return user


def get_lookahead(url=u'', srcurl=u'', domain=u''):
    if url == u'' or srcurl == u'' or domain == u'':
        raise ValueError("lookahead - url,srcurl and domain must be specified. url:" + url + " srcurl:" + srcurl + " domain:" + domain)


    # tangelo.log('lookahead GET url='+url+'srcurl='+srcurl+' domain='+domain)
    user = getUser()
    org = user['org']

    #tangelo.log("plugin-server/lookahead: url="+url)
    results = None

    entityDataConnector = factory.getEntityDataConnector()
    results = entityDataConnector.getLookaheadEntities(url, org, domain=domain)

    if len(results) == 0:
        #tangelo.log("lookahead - url not found in database")
        return

    visitedEntities = entityDataConnector.getVisitedEntities(user['userId'], srcurl, org, domain=domain)
    entityDataConnector.close()

    emails = visitedEntities['email'].keys() if ('email' in visitedEntities) else []
    phones = visitedEntities['phone'].keys() if ('phone' in visitedEntities) else []
    websites = visitedEntities['website'].keys() if ('website' in visitedEntities) else []

    matchCount = 0
    matches = []
    for type, values in {'email': emails, 'phone': phones, 'website': websites}.iteritems():
        for value in values:
            if type in results and value in results[type]:
                matchCount += 1
                matches.append(value)

    domain_search_hits = 0
    domain_matches = []

    hitlist_matches = []
    for type, values in results.iteritems():
        for name, indomain in values.iteritems():
            if indomain == 'y':
                domain_search_hits += 1
                domain_matches.append(name)
            if type == 'hitlist':
                hitlist_matches.append(name)

    result = dict(url=url,
                  matchCount=matchCount,
                  matches=matches,
                  domain_search_hits=domain_search_hits,
                  domain_search_matches=domain_matches,
                  hitlist=hitlist_matches)
    #tangelo.log(str(result))
    return json.dumps(result)


post_actions = {
    'matches': get_lookahead
}


@tangelo.restful
def post(action, *args, **kwargs):
    post_data = json.loads(cherrypy.request.body.read(), strict=False)

    def unknown(**kwargs):
        return tangelo.HTTPStatusCode(400, "unknown service call")

    return post_actions.get(action, unknown)(**post_data)
