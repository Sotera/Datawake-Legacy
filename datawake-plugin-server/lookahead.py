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
    #tangelo.log('lookahead GET url='+url+'srcurl='+srcurl+' domain='+domain)
    user = getUser()
    entityDataConnector = factory.getEntityDataConnector()


    # get the features from the lookahead url that are also on the src url
    lookaheadFeatures = entityDataConnector.getExtractedEntitiesFromUrls([url])
    if len(lookaheadFeatures) > 0:
        lookaheadFeatures = lookaheadFeatures[lookaheadFeatures.keys()[0]]


    if len(lookaheadFeatures) == 0:
        tangelo.log("lookahead - url not found in database")
        return
    visitedFeatures = entityDataConnector.getExtractedEntitiesFromUrls([srcurl])
    if srcurl in visitedFeatures: visitedFeatures = visitedFeatures[srcurl]
    matches = []
    all_types = set([])
    all_types.update(lookaheadFeatures.keys())
    all_types.update(visitedFeatures.keys())
    for type in all_types:
        l = set([]) if type not in lookaheadFeatures else set(lookaheadFeatures[type])
        v = set([]) if type not in visitedFeatures else set(visitedFeatures[type])
        matches.extend(list(v & l))
    del visitedFeatures
    del lookaheadFeatures


    # get the domain matches from the lookahead url
    domain_matches = []
    domainLookaheadFeatures = entityDataConnector.getExtractedDomainEntitiesFromUrls(domain,[url])
    if url in domainLookaheadFeatures: domainLookaheadFeatures = domainLookaheadFeatures[url]
    for type,value in domainLookaheadFeatures.iteritems():
        domain_matches.append(value)

    del domainLookaheadFeatures
    entityDataConnector.close()

    result = dict(url=url,
                  matchCount=len(matches),
                  matches=matches,
                  domain_search_hits=len(domain_matches),
                  domain_search_matches=domain_matches
    )
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
